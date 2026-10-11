# Laboratorio de Victoria

**Modelado a partir de fotos con Pascal.** Un espacio para explorar cómo llevar lo que detecta TP3 (el «Modelador Espacial Rápido») a una escena que nuestro editor sabe dibujar. Todo lo que rodea al modelado ya está armado; lo que queda en blanco es un lugar de exploración, sin prisa ni fecha.

La guía supone que nunca viste el proyecto. Los comandos son de PowerShell y se corren desde la carpeta del repositorio.

## Camino feliz en 5 pasos

1. **Clonar nuestro repositorio.**
   ```powershell
   git clone https://github.com/SilvertK164/interiores-3d
   cd interiores-3d
   git switch feature/interfaz-laboratorio   # solo mientras el laboratorio siga en su rama
   ```
2. **Instalar las dependencias** (requiere Node 22 y pnpm 11; ver «Requisitos»).
   ```powershell
   pnpm install
   ```
3. **Preparar TP3.** Descarga tu repositorio dentro de `lab/vendor/` (sin tocar el original) y arma su entorno de Python. Se puede repetir sin problema: actualiza el código y las dependencias.
   ```powershell
   pnpm lab:setup
   ```
4. **Levantar TP3** en http://localhost:8000. Queda corriendo en esa terminal (Ctrl+C lo detiene).
   ```powershell
   pnpm lab:tp3
   ```
   Si todavía no hay clave de Gemini arranca igual: el análisis responde 503 y el botón de ejemplo del laboratorio sigue funcionando (ver «La clave de Gemini»). Tu pantalla original de TP3 queda disponible en http://localhost:8000, útil **para comparar** con lo que muestra el laboratorio.
5. **Levantar nuestra web y abrir el laboratorio.** Hacen falta otras dos terminales (la API y la web) y la base local, que corre en Docker (ver «Docker Desktop»; sin Docker, ver «Trabajar sin Docker»).
   ```powershell
   pnpm db:start                          # una vez: base local de Supabase
   pnpm db:env                            # una vez: escribe las variables locales
   pnpm db:seed                           # una vez: crea las cuentas de prueba locales (se puede repetir)
   pnpm --filter @interiores/api dev      # terminal 2: API en http://localhost:3001
   pnpm --filter @interiores/web dev      # terminal 3: web en http://localhost:3000
   ```
   Después, abrir http://localhost:3000/laboratorio. Para ingresar sin registrarte puedes usar la cuenta de prueba `victoria@interiores.test` (la contraseña está en `scripts/lib/seed-users.mjs`; son cuentas solo para tu equipo local). Si prefieres, también puedes usar «Crear cuenta» con cualquier correo y una contraseña de 6 caracteres o más (en local no hace falta confirmar el correo).

Para correr las pruebas propias de tu backend: `pnpm lab:tp3:test` (corre pytest con el entorno que armó `pnpm lab:setup`).

## Requisitos

| Qué | Cómo comprobarlo | Dónde conseguirlo |
|---|---|---|
| Git | `git --version` | https://git-scm.com/downloads |
| Node 22 | `node --version` | https://nodejs.org |
| pnpm 11 | `pnpm --version` | `npm install -g pnpm@11` |
| Docker Desktop | `docker --version` | ver la sección siguiente |
| Python 3.11 o superior | `python --version` (o `py --version`) | https://www.python.org/downloads/ (marcando «Add python.exe to PATH») |

## Docker Desktop

**Por qué hace falta.** La base de datos local de Supabase, donde viven las cuentas y los proyectos, corre dentro de Docker. Sin ella no hay cuenta ni proyectos que abrir en nuestra web, aunque el análisis de TP3 sí funciona por su cuenta (su pantalla en http://localhost:8000 no necesita Docker).

**Instalación en Windows.** Docker Desktop se instala desde https://www.docker.com/products/docker-desktop/ con la opción de usar WSL 2. Si el instalador avisa que falta la virtualización, se activa en la BIOS/UEFI (suele llamarse Intel VT-x, AMD-V o SVM Mode) y se reinicia el equipo.

**Cómo comprobarlo.**
```powershell
docker --version    # muestra la versión instalada
docker ps           # lista los contenedores; si dice que no puede conectar, Docker Desktop está cerrado
```

**Recursos.** La primera vez que se corre `pnpm db:start` se descargan unos 2 GB de imágenes. Mientras la base corre usa unos 2 a 3 GB de memoria, que se liberan con `pnpm db:stop`.

**Si algo falla.** Suele bastar con reiniciar Docker Desktop y volver a empezar:
```powershell
pnpm db:stop
pnpm db:start
```

**Sin Docker.** Si no puedes correr Docker, mira «Trabajar sin Docker» más abajo.

## Trabajar sin Docker

Tu web y tu API pueden usar la base de **desarrollo en la nube** de Supabase en lugar de la local. Silvert te pasa por un canal privado dos valores (la URL del proyecto y su clave pública; nunca van en el repositorio ni en un chat de GitHub) y después:

```powershell
Copy-Item .env.cloud.example .env.cloud    # reemplaza los dos valores en .env.cloud (git lo ignora)
pnpm db:env:cloud                          # escribe apps/api/.env y apps/web/.env.local
```

El resto del paso 5 sigue igual, sin `pnpm db:start`, `pnpm db:env` ni `pnpm db:seed` (las cuentas de prueba son solo para la base local: en la nube usa «Crear cuenta»). Qué no corre sin Docker, cómo volver a la base local y el detalle de cada paso están en [`docs/nube.md`](../docs/nube.md) (sección 4). Todavía **no se probó** contra una base en la nube: hasta que Silvert cree las cuentas, la base local sigue siendo el camino probado.

## La clave de Gemini (opcional)

El análisis de fotos lo hace Gemini (Google AI Studio) desde tu backend de TP3. La clave se crea en https://aistudio.google.com/apikey y **vive solo en tu equipo**: nunca va en el repositorio ni en el HTML.

Dos formas de dársela a `pnpm lab:tp3`, a elección:

```powershell
# a) Archivo local (no se sube: `lab/.env.local` está en .gitignore)
Copy-Item lab/.env.example lab/.env.local
notepad lab/.env.local          # completar GEMINI_API_KEY=... y guardar

# b) Solo para esta ventana de PowerShell
$env:GEMINI_API_KEY = "TU_CLAVE_DE_GOOGLE_AI_STUDIO"
pnpm lab:tp3
```

El script nunca imprime la clave. `VISION_MODEL` (opcional) cambia el modelo; por defecto TP3 usa `gemini-3.8-flash`.

**Privacidad.** Como avisa el README de TP3: en el nivel gratuito Google puede usar el contenido enviado para mejorar sus productos y las cuotas pueden cambiar. Conviene evitar fotos sensibles o privadas.

**Sin clave** no hay problema para explorar: el análisis responde 503 con un mensaje claro y el botón **«Probar con un ejemplo (sin servicio)»** usa un análisis fijo (siete piezas, una de confianza baja y un aviso), sin servicio, sin clave y sin cuota.

## Qué hay listo y qué puedes explorar

### Ya está armado

| Pieza | Dónde | Para qué |
|---|---|---|
| Cliente de TP3 | `apps/web/src/lib/lab/analyze-room.ts`, `schema.ts` | Envía la foto, valida la respuesta y traduce cada error a castellano llano |
| Página del laboratorio | `apps/web/app/laboratorio/` | Foto + ancho conocido + dirección de TP3; avisos, tabla de piezas y JSON crudo |
| Análisis de ejemplo | `apps/web/src/lib/lab/sample-analysis.ts` | El mismo que usan el botón de ejemplo y las pruebas |
| Camino al editor | `apps/web/src/editor/lab-scene.ts` | Cualquier definición válida → escena de Pascal → proyecto guardado → editor |
| Scripts de TP3 | `scripts/lab-*.mjs` (`pnpm lab:setup`, `lab:tp3`, `lab:tp3:test`) | Descargar, levantar y probar tu backend |
| Pruebas | `apps/web/test/lab-*.test.ts`, `apps/web/e2e/laboratorio.spec.ts` | Plomería verificada, con TP3 simulado |

El camino al editor se puede comprobar sin análisis: en la página, el desplegable «Comprobar que el camino al editor funciona» abre la plantilla Loft como proyecto nuevo.

### Por dónde empezar

El lugar en blanco es **`analysisToDefinition`** (`apps/web/src/lib/lab/analysis-to-definition.ts`): recibe el análisis de TP3 y puede devolver la definición de un ambiente que el editor sabe dibujar. Qué medidas tiene ese ambiente, qué pieza de Pascal representa cada tipo y qué hacer con lo dudoso son decisiones abiertas para explorar a tu ritmo.

Mientras está en blanco, «Abrir en el editor» y «Probar con un ejemplo» muestran un aviso amable. Una idea es empezar por lo más chico (un ambiente con una sola pieza), mirarlo en el editor con el botón de ejemplo y recién después sumar tipos. Si la definición tiene algún problema, el mensaje del validador aparece en pantalla, en castellano.

Dónde mirar:

- `apps/web/src/lib/templates/types.ts`: la forma de una definición (niveles, muros, ambientes, aberturas, piezas, estantes, gabinetes).
- `apps/web/src/lib/templates/geometry.ts`: ayudas como `perimeter`, `row`, `footprint` y las medidas por defecto.
- `apps/web/src/lib/templates/validate.ts`: lo que el validador revisa y sus mensajes.
- `apps/web/src/lib/templates/definitions/*.ts`: cuatro definiciones reales como ejemplo.
- `apps/web/src/editor/templates/scene-builder.ts`: cómo se convierte una definición en escena de Pascal.
- `docs/pascal-notes.md`: lo que se verificó de Pascal 1.0.3.

### Convenciones que conviene tener a mano

- **Ejes en planta:** +x va hacia la derecha y +z hacia abajo. Las definiciones usan metros, con la esquina superior izquierda del ambiente en (0, 0); `at: [x, z]`.
- **Frente de las piezas:** con `rotY: 0` el frente mira a +z (hacia abajo en planta).
- **Sentido del giro:** `rotY` es el de three.js: positivo es antihorario visto desde arriba. La rotación de TP3 es horaria, así que los sentidos son opuestos.
- **Centros:** en estantes y gabinetes, `at` es el centro de la base; en las piezas, el centro de la pieza apoyada en el piso.
- **Límites de Pascal** (los que revisa `validate.ts`): estantes de 0,3 a 3 m de ancho, 0,1 a 1 m de fondo, 0,05 a 2,5 m de alto, 1 a 8 filas y 1 a 6 columnas; gabinetes de hasta 3 m por corrida; muros horizontales o verticales de al menos 0,3 m; aberturas a 10 cm o más de la esquina; piezas dentro de un ambiente. Por defecto, el nivel mide 2,5 m, las puertas 2,1 m y las ventanas 1,2 m con antepecho de 0,9 m.
- **Piezas y materiales:** las piezas se nombran por su id del catálogo de Pascal (las disponibles salen de `availableAssetIds()` en `apps/web/test/support/asset-ids.ts`) y los materiales por su id de la biblioteca (por ejemplo, los que usan las definiciones de `definitions/`). El validador avisa si un id no existe.

Un ejemplo mínimo de definición, un ambiente con una puerta y una pieza (está probado en `apps/web/test/lab-scene.test.ts`):

```ts
import { perimeter } from '../templates/geometry'
import type { TemplateDefinition } from '../templates/types'

const ejemplo: TemplateDefinition = {
  id: 'ejemplo',
  kind: 'vivienda',
  name: 'Ambiente de ejemplo',
  summary: 'Un ambiente y una pieza.',
  levels: [
    {
      id: 'planta',
      walls: perimeter('muro', 0, 0, 5, 3.5), // muro-n, muro-e, muro-s y muro-w
      rooms: [{ id: 'sala', name: 'Sala', color: '#1F5FE0', rect: [0, 0, 5, 3.5] }],
      openings: [{ id: 'puerta', type: 'door', wall: 'muro-s', at: 1, width: 0.9 }],
      items: [{ asset: 'sofa', at: [2.5, 2.5], rotY: 0 }],
    },
  ],
}
```

Las medidas del ejemplo son solo de ejemplo.

### Ideas para ir verificando

Están como `it.todo` en `apps/web/test/lab-analysis-to-definition.test.ts`; cada una puede volverse una prueba cuando tenga sentido:

- el ambiente podría medir el ancho conocido cuando la persona lo indica;
- las piezas podrían quedar siempre dentro del ambiente, incluso las que TP3 ubica en el borde;
- la rotación podría respetar el sentido horario de TP3 (visto desde arriba);
- el resultado podría pasar `validateDefinition` con las piezas y los materiales reales de Pascal;
- los tipos desconocidos podrían avisarse (con `opts.warn`) sin romper el resto del análisis;
- el análisis de ejemplo podría convertirse en una escena que `buildLabEnvelope` dibuje sin errores;
- un análisis sin muebles podría producir un ambiente vacío pero válido;
- las piezas de confianza baja podrían tener un tratamiento explícito y comentado.

Para correr solo estas pruebas:

```powershell
pnpm --filter @interiores/web exec vitest run lab
```

### Cómo saber que funciona

- Las pruebas del laboratorio en verde (los `todo` se van convirtiendo en pruebas).
- `pnpm verify` en verde (lint, build, tipos y pruebas).
- El botón «Probar con un ejemplo (sin servicio)» abre el editor con el ambiente.
- Opcional: una captura del resultado en `lab/resultados/capturas/`, por ejemplo para sumar al registro de pruebas.

En `apps/web/e2e/laboratorio.spec.ts` hay una prueba en navegador marcada con `test.fixme` para el flujo completo; se activa cambiando `test.fixme` por `test` (y la prueba «mientras el modelado está en blanco» deja de tener sentido).

## Plan de pruebas

Ocho casos para conocer cómo responde TP3 y qué muestra el laboratorio. Cada uno se registra como se explica en la sección siguiente.

| # | Caso | Cómo probarlo | Resultado esperado |
|---|---|---|---|
| 1 | Foto clara | Una foto nítida de un ambiente con algunos de los siete tipos de mueble (JPG, PNG o WebP de menos de 8 MB) | Responde 200: la tabla lista las piezas con su confianza y el JSON crudo coincide con la tabla. Los avisos pueden venir vacíos |
| 2 | Foto con oclusión | Una foto donde un mueble queda tapado por otro (o por una persona o un objeto) | Los avisos del servicio mencionan la oclusión y la confianza de esa pieza baja; no aparecen muebles inventados detrás |
| 3 | Sin clave | Levantar TP3 sin `GEMINI_API_KEY` y pulsar «Analizar foto» | Mensaje en castellano «no tiene la clave de Gemini» con el aviso de que el ejemplo sigue funcionando; no aparece resultado |
| 4 | Archivo enorme | Un JPG o PNG válido de más de 8 MB | Mensaje «La foto supera el tamaño máximo que acepta TP3» (error 413 del servicio) |
| 5 | Formato inválido | Un GIF, PDF o TXT (en el selector de archivos, elegir «Todos los archivos») | Mensaje «TP3 no aceptó el formato de la foto» (error 400) |
| 6 | Ancho conocido | Repetir el caso 1 escribiendo 4,5 en el ancho; después probar con 0 y con 101 | Con 4,5 el resultado dice «Ancho conocido: 4,5 m» (`calibration.status = user_provided`). Con 0 o 101 la página avisa el rango válido (0 a 100 m) antes de enviar. Sin ancho: «Sin ancho conocido» |
| 7 | Baja confianza | Una foto oscura, borrosa o tomada desde lejos | Piezas con confianza baja en la tabla y avisos del servicio; sirve para ver qué hacer con lo dudoso |
| 8 | Objetos fuera de los siete tipos | Una foto con lámparas, alfombras o cuadros además de muebles | No aparecen en la tabla; los avisos suelen mencionarlos como elementos sin clasificar. Si el proveedor devolviera un tipo fuera de la lista, TP3 responde 502 y se muestra «el análisis falló o la respuesta no sirvió» |

## Cómo registrar resultados

1. Copiar la plantilla `lab/resultados/_plantilla.md`.
2. Nombrar el archivo `YYYY-MM-DD-<persona>-<caso>.md` (por ejemplo `2026-10-12-victoria-sin-clave.md`).
3. Completar los campos: fecha, persona, caso, foto, resultado, captura y observaciones.
4. Las capturas van en `lab/resultados/capturas/`. Conviene no subir fotos privadas: alcanza con describirlas o usar una de libre uso.

## Límites conocidos

- **Las medidas son estimadas.** TP3 devuelve proporciones del ambiente visible, no metros; con el ancho conocido solo se calibra esa referencia.
- **Siete tipos:** sofá, mesa, silla, estante, cama, planta y televisor. Lo demás se ignora y a veces se menciona en los avisos.
- **No es un modelo 3D real de la foto.** Es una propuesta cenital aproximada: posiciones, tamaños y giros de piezas, sin geometría de la escena.
- **No ve lo que no se ve:** una pieza tapada puede faltar o venir con poca confianza.
- **Depende de Gemini:** el nivel gratuito tiene cuotas que pueden cambiar y el modelo por defecto puede dejar de existir (se cambia con `VISION_MODEL`).

## Cómo proponer cambios

- Trabajar en una rama `lab/<tema>` (por ejemplo `lab/mapeo-de-piezas`) cortada de la rama base.
- Commits en castellano con el formato `tipo(área): descripción`.
- Antes de abrir el PR, `pnpm verify` en verde; Silvert lo revisa y Victoria revisa los suyos.
- El detalle del flujo está en [`docs/colaboracion.md`](../docs/colaboracion.md).

## Si algo no sale

| Síntoma | Qué mirar |
|---|---|
| «No pudimos conectar con el servicio de TP3» | Que `pnpm lab:tp3` esté corriendo, que la dirección de la página sea la correcta y que TP3 acepte pedidos de `http://localhost:3000` (lo hace por defecto; `CORS_ORIGINS` en `lab/.env.local` lo cambia) |
| `pnpm lab:tp3` dice que el puerto 8000 está en uso | Quizá TP3 ya está corriendo: abrir http://localhost:8000 |
| `pnpm lab:setup` no encuentra Python | Instalar Python 3.11 o superior marcando «Add python.exe to PATH»; el atajo de la Microsoft Store no sirve |
| `pnpm lab:setup` no puede descargar | La conexión o el acceso a GitHub; se puede repetir el comando |
| La página pide ingresar siempre | Falta la API o la base: revisar `pnpm db:start`, `pnpm db:env` y la API en http://localhost:3001/health |
| Otra cosa | Anotarlo en un resultado de `lab/resultados/` o consultar a Silvert |
