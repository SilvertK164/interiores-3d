-- Migración 002: el proyecto recuerda de qué plantilla nació, para mostrar su captura en la tarjeta.
-- La columna es opcional: los proyectos en blanco y los anteriores a las plantillas quedan en null.
-- Las políticas RLS de projects no cambian: filtran por dueño sobre toda la fila, columnas nuevas incluidas.

alter table public.projects
  add column template_id text check (template_id ~ '^[a-z0-9-]{1,40}$');
