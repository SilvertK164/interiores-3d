-- Migración 001: proyectos y escenas con RLS (spec 1, sección 5).

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  kind text check (kind in ('vivienda', 'comercio')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_owner_updated_idx on public.projects (owner_id, updated_at desc);

create table public.project_scenes (
  project_id uuid primary key references public.projects (id) on delete cascade,
  scene jsonb not null,
  schema_version int not null,
  version int not null default 1,
  updated_at timestamptz not null default now()
);

create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger projects_set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

create trigger project_scenes_set_updated_at before update on public.project_scenes
  for each row execute function public.set_updated_at();

-- Guardar la escena también "toca" el proyecto, para ordenar la lista por actividad.
create function public.touch_project_from_scene() returns trigger
language plpgsql as $$
begin
  update public.projects set updated_at = now() where id = new.project_id;
  return new;
end $$;

create trigger project_scenes_touch_project after update on public.project_scenes
  for each row execute function public.touch_project_from_scene();

alter table public.projects enable row level security;
alter table public.project_scenes enable row level security;

revoke all on public.projects from anon;
revoke all on public.project_scenes from anon;

create policy projects_select_own on public.projects for select to authenticated
  using (owner_id = (select auth.uid()));
create policy projects_insert_own on public.projects for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy projects_update_own on public.projects for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy projects_delete_own on public.projects for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy scenes_select_own on public.project_scenes for select to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())));
create policy scenes_insert_own on public.project_scenes for insert to authenticated
  with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())));
create policy scenes_update_own on public.project_scenes for update to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())));
create policy scenes_delete_own on public.project_scenes for delete to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())));
