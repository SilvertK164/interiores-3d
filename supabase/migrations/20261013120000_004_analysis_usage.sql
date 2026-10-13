-- Migración 004: intentos de análisis de fotos por persona, con tope de 10 por hora.
-- «Muebles desde una foto» llama a un proveedor de visión externo con la clave de la API: sin tope, una sola cuenta podría
-- agotar la cuota de todas. Cada pedido que va a llegar al proveedor inserta una fila aquí (los pedidos inválidos no); un
-- disparador rechaza la fila 11 de la última hora con SQLSTATE 53400 (como el tope de 50 proyectos de la 003) y la API lo
-- responde con 429. El tope vive en la base y no en un «contar y luego insertar» de la API para que dos pedidos simultáneos
-- de una misma persona no puedan pasarlo a la vez.

create table public.analysis_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index analysis_usage_user_created_idx on public.analysis_usage (user_id, created_at desc);

alter table public.analysis_usage enable row level security;

revoke all on public.analysis_usage from anon;
-- Sin esto, quien tenga su JWT podría borrar sus propios intentos yendo directo a PostgREST y saltarse el tope.
revoke update, delete, truncate on public.analysis_usage from authenticated;

create policy analysis_usage_select_own on public.analysis_usage for select to authenticated
  using (user_id = (select auth.uid()));
create policy analysis_usage_insert_own on public.analysis_usage for insert to authenticated
  with check (user_id = (select auth.uid()));

-- Corre con los permisos de quien inserta (sin SECURITY DEFINER): bajo RLS cada persona solo cuenta los suyos.
-- El candado de asesoría evita que dos altas simultáneas de la misma persona pasen el tope a la vez, y la hora del
-- intento la pone siempre el servidor (un created_at enviado por quien llama no vale).
create function public.enforce_analysis_limit() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('analysis_usage:' || new.user_id::text, 0));
  new.created_at := now();
  if (
    select count(*) from public.analysis_usage u
    where u.user_id = new.user_id and u.created_at > now() - interval '1 hour'
  ) >= 10 then
    raise exception 'Llegaste al límite de 10 análisis por hora. Inténtalo más tarde.'
      using errcode = '53400';
  end if;
  return new;
end $$;

create trigger analysis_usage_enforce_limit before insert on public.analysis_usage
  for each row execute function public.enforce_analysis_limit();
