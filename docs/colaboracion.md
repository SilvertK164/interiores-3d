# Cómo colaboramos

Una guía de convivencia entre Silvert y Victoria, no un reglamento: se ajusta entre los dos cuando haga falta.

## Quién se ocupa de qué

| Persona | Suele ocuparse de |
|---|---|
| Silvert | La infraestructura (base de datos, API y despliegue) y el editor |
| Victoria | El laboratorio (`lab/`): el espacio de Victoria para explorar el modelado a partir de fotos |

Los dos revisan los PR del otro, así cada cambio lo mira alguien que no lo escribió.

## Ramas

- `main`: la rama estable; no se trabaja directo en ella.
- `feature/<tema>`: producto (editor, API, plantillas, interfaz).
- `lab/<tema>`: el laboratorio de Victoria, por ejemplo `lab/mapeo-de-piezas`.
- Cada rama parte de la rama base que indique su PR (mientras el PR #1 siga sin fusionarse, no siempre es `main`).

## Pull requests con revisión cruzada

1. Abrir el PR con la plantilla (`.github/pull_request_template.md`): qué cambia, por qué, cómo se verificó y riesgos.
2. Pegar la salida real de `pnpm verify` (lint, build, tipos y pruebas).
3. La otra persona lo revisa antes de fusionar: Silvert mira los cambios de Victoria y ella los de Silvert.
4. `.github/CODEOWNERS` deja escrito de quién es cada carpeta, para que GitHub avise solo.

## Mantener la rama al día

```powershell
git fetch origin
git switch <tu-rama>
git merge origin/<rama-base>   # resolver conflictos si los hay
pnpm install
pnpm verify
```

Conviene hacerlo antes de abrir un PR y cada vez que la rama base reciba cambios que toquen lo mismo.

## Claves y datos privados

- Ninguna clave va al repositorio: `.env*` y `lab/.env.local` están en `.gitignore`; solo se versionan archivos `.env.example`, sin valores.
- Si una clave se sube por accidente, se revoca en el panel de quien la emitió (por ejemplo Google AI Studio) y se avisa al otro.
- Las fotos privadas tampoco se suben a `lab/resultados/`: alcanza con describirlas.

## Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Estado, decisiones y pendientes | `docs/ESTADO.md` |
| El editor (único lugar que importa Pascal) | `apps/web/src/editor/` |
| Páginas de la web | `apps/web/app/` |
| API y contrato | `apps/api/`, `packages/contract/` |
| Base de datos | `supabase/` |
| Plantillas de ambientes | `apps/web/src/lib/templates/` |
| Laboratorio de Victoria | `lab/` (guía en `lab/README.md`), `apps/web/src/lib/lab/`, `apps/web/app/laboratorio/` |
