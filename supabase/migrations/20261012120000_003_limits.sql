-- Migración 003: límites de tamaño, forma y cantidad en la propia base (revisión de seguridad I-2, I-3, I-4 y M-4).
-- Sin estas restricciones, quien tenga su JWT y la clave pública podría escribir directo en PostgREST y saltarse
-- las validaciones de la API (zod, tope de cuerpo). No toca las políticas RLS ni los índices existentes.
--
-- Las restricciones se agregan NOT VALID (no revisan filas viejas) y solo se validan si las filas actuales
-- las cumplen; si alguna no, la migración avisa (NOTICE) y deja la restricción activa para filas nuevas.

-- Ojo: un check con NULL pasa, y una clave ausente da NULL; por eso se usa `is not distinct from` y coalesce.
-- 1) Escena: tamaño máximo de 4 MiB y forma mínima del contrato (SceneEnvelope).
--    Se mide el texto de la escena (octet_length) y no pg_column_size, que cuenta bytes ya comprimidos.
alter table public.project_scenes
  add constraint project_scenes_scene_size
  check (octet_length(scene::text) <= 4194304) not valid;

alter table public.project_scenes
  add constraint project_scenes_scene_shape
  check (
    jsonb_typeof(scene) is not distinct from 'object'
    and jsonb_typeof(scene -> 'schemaVersion') is not distinct from 'number'
    and coalesce(scene -> 'schemaVersion' = to_jsonb(schema_version), false)
    and jsonb_typeof(scene -> 'pascal' -> 'core') is not distinct from 'string'
    and jsonb_typeof(scene -> 'graph') is not distinct from 'object'
    and jsonb_typeof(scene -> 'graph' -> 'nodes') is not distinct from 'object'
    and jsonb_typeof(scene -> 'graph' -> 'rootNodeIds') is not distinct from 'array'
  ) not valid;

-- 2) Nombre del proyecto: 1 a 80 caracteres tras recortar espacios y sin caracteres de control
--    (C0, DEL y C1). Se suma al check de la migración 001, que sigue vigente.
alter table public.projects
  add constraint projects_name_clean
  check (
    char_length(btrim(name)) between 1 and 80
    and name !~ '[\x01-\x1f\x7f-\x9f]'
  ) not valid;

-- 3) Validar las filas existentes solo si cumplen.
do $$
declare
  bad bigint;
begin
  select count(*) into bad from public.project_scenes
    where not (
      octet_length(scene::text) <= 4194304
      and jsonb_typeof(scene) is not distinct from 'object'
      and jsonb_typeof(scene -> 'schemaVersion') is not distinct from 'number'
      and coalesce(scene -> 'schemaVersion' = to_jsonb(schema_version), false)
      and jsonb_typeof(scene -> 'pascal' -> 'core') is not distinct from 'string'
      and jsonb_typeof(scene -> 'graph') is not distinct from 'object'
      and jsonb_typeof(scene -> 'graph' -> 'nodes') is not distinct from 'object'
      and jsonb_typeof(scene -> 'graph' -> 'rootNodeIds') is not distinct from 'array'
    );
  if bad = 0 then
    alter table public.project_scenes validate constraint project_scenes_scene_size;
    alter table public.project_scenes validate constraint project_scenes_scene_shape;
  else
    raise notice 'project_scenes: % filas no cumplen el tamaño o la forma; las restricciones quedan activas solo para filas nuevas (NOT VALID). Corrígelas y corre VALIDATE CONSTRAINT.', bad;
  end if;

  select count(*) into bad from public.projects
    where not (char_length(btrim(name)) between 1 and 80 and name !~ '[\x01-\x1f\x7f-\x9f]');
  if bad = 0 then
    alter table public.projects validate constraint projects_name_clean;
  else
    raise notice 'projects: % filas tienen nombre vacío o con caracteres de control; projects_name_clean queda activa solo para filas nuevas (NOT VALID).', bad;
  end if;
end $$;

-- 4) Tope de 50 proyectos por persona. Corre con los permisos de quien inserta (sin SECURITY DEFINER):
--    bajo RLS cada persona solo cuenta los suyos. El candado de asesoría evita que dos altas simultáneas
--    de la misma persona pasen el tope a la vez. SQLSTATE 53400 (configuration_limit_exceeded).
create function public.enforce_project_limit() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text, 0));
  if (select count(*) from public.projects p where p.owner_id = new.owner_id) >= 50 then
    raise exception 'Llegaste al límite de 50 proyectos. Borra alguno para crear otro.'
      using errcode = '53400';
  end if;
  return new;
end $$;

create trigger projects_enforce_limit before insert on public.projects
  for each row execute function public.enforce_project_limit();
