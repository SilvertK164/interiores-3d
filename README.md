# Interiores — diseñador de interiores 2D y 3D

TP final de IISAIA (FIUBA) de **Silvert Quispe** y **Victoria Villalba**. Diseña viviendas y comercios en un editor 2D/3D, guarda cada proyecto en tu cuenta y lo vuelve a abrir desde cualquier navegador.

- **Repositorio:** https://github.com/SilvertK164/interiores-3d
- **Despliegue en Vercel + Supabase en la nube:** pendiente (Tarea 6 del plan); por ahora todo corre en local.
- **Estado y decisiones vivas:** [`docs/ESTADO.md`](docs/ESTADO.md)
- **Laboratorio de Victoria y colaboración:** [`lab/README.md`](lab/README.md) (modelado a partir de fotos con Pascal, paso a paso) · [`docs/colaboracion.md`](docs/colaboracion.md) (ramas, PR y revisión cruzada)

## Cómo correrlo

```bash
pnpm install
pnpm db:start                        # Supabase local en Docker (la primera vez descarga ~2 GB de imágenes)
pnpm db:env                          # escribe .env.test, apps/api/.env y apps/web/.env.local con las claves locales
pnpm verify                          # lint + build + tipos + pruebas (incluye RLS contra Supabase local)
pnpm --filter @interiores/api dev    # http://localhost:3001
pnpm --filter @interiores/web dev    # http://localhost:3000
pnpm --filter @interiores/web e2e    # navegador real: persistir, 404 entre cuentas, conflicto 409, catálogo y plantillas
pnpm --filter @interiores/web templates:build   # regenera las plantillas (public/templates/)
```

Requisitos: Node 22, pnpm 11 y Docker Desktop. `pnpm db:stop` apaga Supabase local y libera la memoria.

## Arquitectura

`apps/web` (Next 16 + editor de Pascal) → `apps/api` (Fastify, `openapi.yaml`) → Supabase (Auth + Postgres con RLS). Solo `apps/web/src/editor/` conoce a Pascal. Detalle en el [spec 1](docs/superpowers/specs/2026-10-11-fundacion-y-persistencia-design.md) y el [plan](docs/superpowers/plans/2026-10-11-fundacion-y-persistencia.md).

## Qué decidí yo

Las decisiones D1–D10 con sus alternativas descartadas están en el spec (sección 3). Las más defendibles:

1. **API propia en Fastify con contrato primero** en vez de Route Handlers: backend visible, `openapi.yaml` verificado contra el código.
2. **RLS como segunda barrera:** la API reenvía el JWT de la persona; `service_role` solo existe en pruebas.
3. **Bloqueo optimista (`If-Match` → `409`)** en vez de "la última escritura gana".
4. **Pascal como base**, aislado en una carpeta, con plan B (`core` + `viewer`).
5. **Catálogo autoalojado** desde el repo MIT de Pascal (101 muebles) para no depender de su bucket.
6. **Supabase local primero** (Docker), nube después: las pruebas de RLS corren contra una base real sin tocar datos de nadie.
7. **Plantillas como código:** cada plantilla es una definición de datos (niveles, escalera, materiales de la biblioteca de Pascal, estantes y gabinetes paramétricos) validada (muros cerrados, aberturas dentro de su muro, piezas dentro de un ambiente, materiales existentes) que un constructor convierte en escena con los esquemas reales de Pascal; el JSON generado se commitea y una prueba falla si se desactualiza. Las texturas que el repo no trae se piden al CDN de Pascal.
8. **Piezas realistas:** se probaron piezas de Kenney (CC0) y se descartaron por su estilo de videojuego; el comercio se arma con los estantes y gabinetes paramétricos de Pascal.

## Cómo gestioné el contexto

- `CLAUDE.md` raíz y por zona, y reglas con `paths:` en `.claude/rules/` para que cada carpeta cargue solo lo suyo.
- Un agente por tema independiente con informe en archivo y resumen corto; la documentación consolidada vive en `docs/ESTADO.md`.
- Pascal no está en el material del curso: toda API usada se verificó en `node_modules` y quedó en [`docs/pascal-notes.md`](docs/pascal-notes.md).

## Qué salió mal

Ver [`docs/bitacora.md`](docs/bitacora.md): alucinaciones del agente (migraciones de Pascal, dependencia del bucket), el `ERR_PNPM_IGNORED_BUILDS` de pnpm 11 y un error real que solo encontró la prueba en navegador: pasar `onLoad` como función nueva en cada render hacía que el editor recargara la escena y borrara lo que acababas de dibujar.

## Licencias de terceros

Pascal Editor (MIT, © Pascal Group Inc.): código vía npm y assets copiados de su repo en `apps/web/public/` (ver `public/pascal-LICENSE.txt`). Detalle, texturas del CDN de Pascal y nodos paramétricos en [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
