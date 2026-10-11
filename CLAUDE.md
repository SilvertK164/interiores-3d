# CLAUDE.md

Diseñador de interiores 2D+3D (viviendas y comercios) — TP final IISAIA de Silvert Quispe y Victoria Villalba.

## Empezar por acá
- **Leer `docs/ESTADO.md`** (decisiones, hecho, pendiente). Índice en `docs/README.md`.
- No releer `docs/analisis-clases/*` completos: son consulta puntual (`grep` de títulos).
- Plan vigente: `docs/superpowers/plans/2026-10-11-fundacion-y-persistencia.md`. Comando único: `pnpm verify`. Reglas por zona en `.claude/rules/` y en cada `apps/*/CLAUDE.md`.

## Flujo obligatorio (clase 05)
brainstorming → spec en `docs/superpowers/specs/` → aprobación de ambas personas → `writing-plans` → rama `feature/*` → implementación con TDD (el test se ve en rojo primero) → code review → verificación con salida real → PR.

## Reglas de trabajo con IA (ahorro de tokens)
1. **Un agente por tema independiente**, con archivo de salida y resumen de ≤ 600 palabras; no repetir su búsqueda ni releer su informe completo.
2. No volver a leer archivos que se acaban de escribir; confiar en el resultado de la herramienta.
3. Diseño en Pencil: exportar a `scale: 0.5–0.6` y mirar **solo las pantallas que cambiaron**; verificar estructura con `Get` y límites antes de pedir imagen.
4. Cada decisión nueva se anota en `docs/ESTADO.md` el mismo día; los demás documentos no se duplican.
5. No pedir ni pegar claves de API. No tocar documentos de Pencil ajenos al proyecto.

## Arquitectura (decidida)
`apps/web` (Next 16 + Pascal) · `apps/api` (Fastify + `openapi.yaml`) · `packages/contract` (zod) · `supabase/` (migraciones y RLS). Solo `apps/web/src/editor/` importa `@pascal-app/*`, `three` y R3F. Detalle en el spec 1.

## Convenciones
Castellano; commits `tipo(área): descripción`; archivos < 300 líneas; versiones exactas de librerías.
