# Laboratorio de Victoria

**Modelado a partir de fotos con Pascal.** Guía para probar el análisis de fotos y para mejorar cómo se lo lleva a una escena que nuestro editor sabe dibujar. **`analysisToDefinition` ya está implementada** y es lo que usa «Escena desde una foto», una función del producto: arma el ambiente de la foto con sus muros, una puerta, una ventana, piso de madera clara y los muebles dentro. Victoria puede seguir mejorándola; «Cómo funciona y por dónde mejorarla» cuenta qué decide hoy.

> **Cambio (2026-10-13): el análisis ya no necesita TP3 local.** Lo que antes hacía el backend de TP3 (el «Modelador Espacial Rápido» de Victoria) lo hace ahora nuestra API en `POST /v1/analyze-room`, con la misma lógica portada a TypeScript (`apps/api/src/analyze-room/`). La web (la página «Escena desde una foto» de `/escena-desde-foto` y «Muebles desde una foto» del editor) llama a nuestra API con tu sesión, así que también funciona desplegada. **TP3 queda como referencia de Victoria** y para comparar resultados (paso opcional).

La guía supone que nunca viste el proyecto. Los comandos son de PowerShell y se corren desde la carpeta del repositorio.

## Camino feliz en 3 pasos

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
3. **Levantar nuestra web y abrir «Escena desde una foto».** Hacen falta otras dos terminales (la API y la web) y la base local, que corre en Docker (ver «Docker Desktop»; sin Docker, ver «Trabajar sin Docker»).
   ```powershell
   pnpm db:start                          # una vez: base local de Supabase
   pnpm db:env                            # una vez: escribe las variables locales
   pnpm db:seed                           # una vez: crea las cuentas de prueba locales (se puede repetir)
   npx --yes supabase@2.120.0 migration up   # solo si tu base local es anterior a la migración 004 (tope de análisis por hora)
   pnpm --filter @interiores/api dev      # terminal 2: API en http://localhost:3001
   pnpm --filter @interiores/web dev      # terminal 3: web en http://localhost:3000
   ```
   Después, abrir http://localhost:3000/escena-desde-foto (la dirección de antes, `/laboratorio`, redirige). Para ingresar sin registrarte puedes usar la cuenta de prueba `victoria@interiores.test` (la contraseña está en `scripts/lib/seed-users.mjs`; son cuentas solo para tu equipo local). Si prefieres, también puedes usar «Crear cuenta» con cualquier correo y una contraseña de 6 caracteres o más (en local no hace falta confirmar el correo).

   **Para analizar una foto de verdad**, la API necesita la clave de Gemini (ver «La clave de Gemini»). Sin ella el análisis responde «no está disponible por ahora» y el botón **«Probar con un ejemplo»** funciona igual, sin clave ni cuota.

### Opcional: TP3 como referencia

Nuestra web **no llama a TP3**: sirve para comparar con tu pantalla original o para seguir probando tu backend por tu cuenta.

```powershell
pnpm lab:setup      # descarga tu repositorio dentro de lab/vendor/ (sin tocar el original) y arma su entorno de Python
pnpm lab:tp3        # lo levanta en http://localhost:8000 (Ctrl+C lo detiene); tu pantalla original queda ahí
pnpm lab:tp3:test   # corre pytest con el entorno que armó pnpm lab:setup
```

Necesita Python 3.11 o superior (ver «Requisitos») y su propia clave de Gemini en `lab/.env.local` (ver «La clave de Gemini»). Se puede repetir `pnpm lab:setup` sin problema: actualiza el código y las dependencias.

## Requisitos

| Qué | Cómo comprobarlo | Dónde conseguirlo |
|---|---|---|
| Git | `git --version` | https://git-scm.com/downloads |
| Node 22 | `node --version` | https://nodejs.org |
| pnpm 11 | `pnpm --version` | `npm install -g pnpm@11` |
| Docker Desktop | `docker --version` | ver la sección siguiente |
| Python 3.11 o superior (solo para el TP3 opcional) | `python --version` (o `py --version`) | https://www.python.org/downloads/ (marcando «Add python.exe to PATH») |

## Docker Desktop

**Por qué hace falta.** La base de datos local de Supabase, donde viven las cuentas y los proyectos, corre dentro de Docker. Sin ella no hay cuenta ni proyectos que abrir en nuestra web, aunque tu TP3 opcional sí funciona por su cuenta (su pantalla en http://localhost:8000 no necesita Docker).

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

El análisis de fotos lo hace Gemini (Google AI Studio) **desde nuestra API**. La clave es la variable `GEMINI_API_KEY` de la API y **vive solo en tu equipo o en Vercel**: nunca va en el repositorio, en el HTML ni en un chat. Se crea en https://aistudio.google.com/apikey.

Dos formas de dársela a la API local, a elección:

```powershell
# a) Archivo local de la API (no se sube: apps/api/.env está en .gitignore): agrega la línea GEMINI_API_KEY=... y guarda
notepad apps/api/.env           # después reinicia la API

# b) Solo para esta ventana de PowerShell
$env:GEMINI_API_KEY = "TU_CLAVE_DE_GOOGLE_AI_STUDIO"
pnpm --filter @interiores/api dev
```

`pnpm db:env` y `pnpm db:env:cloud` reescriben `apps/api/.env` sin esa línea: vuelve a agregarla (o usa la forma b). `VISION_MODEL` (opcional) cambia el modelo; por defecto la API usa `gemini-3.5-flash`. En producción la clave se carga en Vercel, solo en el proyecto de la API ([`docs/nube.md`](../docs/nube.md), sección 11). La API nunca imprime ni registra la clave, la foto ni el texto que le envía a Gemini.

**Tope por persona.** Cada cuenta puede pedir hasta 10 análisis por hora (migración 004). Cuentan los pedidos que llegan a Gemini, aunque Gemini falle; a partir del undécimo la API responde «Llegaste al límite de 10 análisis por hora». La migración tiene que estar aplicada en tu base local (`npx --yes supabase@2.120.0 migration up`).

**Privacidad.** La foto sale de nuestra API hacia Google. En el nivel gratuito Google puede usar el contenido enviado para mejorar sus productos y las cuotas pueden cambiar. Conviene evitar fotos sensibles o privadas: la interfaz lo avisa junto al campo de la foto. Nuestra API no guarda la foto ni la registra.

**Sin clave** no hay problema para explorar: el análisis responde «El análisis de fotos no está disponible por ahora» y el botón **«Probar con un ejemplo»** usa un análisis fijo (siete piezas, una de confianza baja y un aviso), sin clave y sin cuota.

**TP3 opcional.** Si además levantas TP3 para comparar, su clave va en `lab/.env.local` (copia `lab/.env.example`) o en la ventana de PowerShell, y TP3 usa `gemini-3.8-flash` por defecto.

## El contrato del análisis (`POST /v1/analyze-room`)

El análisis **elige piezas del catálogo local de Pascal**: la web le manda la lista de opciones y solo puede contestar con ids de esa lista (la API lo comprueba y, si no, responde 502). El contrato se define **una sola vez**, en [`packages/contract/src/analyze-room.ts`](../packages/contract/src/analyze-room.ts) (zod) y en `apps/api/openapi.yaml`, y lo comparten la API y la web: un cambio es un solo cambio (con TP3 local había que actualizar dos repositorios a la vez).

| Campo del pedido (JSON, con `Authorization: Bearer <tu sesión>`) | Contenido |
|---|---|
| `image` | La foto en base64 (sin el prefijo `data:`), de hasta 3 MiB ya decodificada. La web la reduce antes de enviarla: lado mayor de 1600 px como máximo, JPEG de calidad 0,85 (`apps/web/src/lib/api/photo.ts`) |
| `mime` | `image/jpeg`, `image/png` o `image/webp`; la API comprueba que los primeros bytes del archivo coincidan |
| `knownWidthM` | Ancho conocido en metros (opcional, mayor que 0 y hasta 100) |
| `catalog` | Lista de 1 a 100 opciones, de hasta 64 KB y con ids únicos: `{ id, name, category, tags }` (hasta 10 etiquetas de 40 caracteres) y nada más. **Sin rutas, `src` ni medidas**, y sin dobles corchetes en los textos |

La respuesta trae `furniture[]` con `asset_id` (un id de la lista enviada), `x`, `y`, `width`, `depth` (proporciones del ambiente, de 0 a 1), `rotation_deg` (horario visto desde arriba, de −360 a 360) y `confidence`; además `warnings` y `calibration`. Los errores salen de la API en castellano (`apps/api/src/errors.ts`) y la web los traduce **por código** en una sola capa, `apps/web/src/lib/api/errors.ts`: 413 `imagen_demasiado_grande`, 422 `catalogo_invalido`, `imagen_ilegible` o `datos_invalidos`, 429 `limite_de_analisis`, 502 `analisis_fallido` y 503 `analisis_no_disponible`.

Quién arma qué: `apps/web/src/lib/lab/analysis-catalog.ts` (`buildAnalysisCatalog`, código puro) elige entre las piezas locales las que una persona reconoce en una foto (mobiliario y decoración que se apoyan en el piso: nada de instalaciones, piezas de pared o techo ni lo que va sobre una mesa) y escribe el nombre en castellano con las tablas de `catalog-es`. La página del laboratorio y «Muebles desde una foto» del editor usan **la misma lista** y el mismo cliente, `api.analyzeRoom(file, { knownWidthM, catalog })` (`apps/web/src/lib/api/client.ts`). Si Pascal suma una pieza, no es candidata hasta agregarla a `RECOGNIZABLE` en ese archivo. El tamaño de cada pieza es **siempre el real del catálogo**: el `width` y `depth` de Gemini no se usan.

## Muebles desde una foto (en el editor)

Es el uso de este contrato dentro del editor, sin pasar por la página «Escena desde una foto»: en un proyecto abierto, **Editar → Más → «Muebles desde una foto»**. La persona sube la foto (y, si lo sabe, el ancho del ambiente), el análisis propone qué muebles del catálogo hay y dónde, y con **«Agregar al proyecto»** esa mini escena (un conjunto de piezas) se inserta en la planta activa:

- **Un solo paso del historial:** un Deshacer quita todas las piezas juntas.
- **Quedan seleccionadas todas juntas** (Pascal 1.0.3 no tiene nodo grupo: se usa su multiselección, que las mueve, gira o borra a la vez).
- **Dónde caen:** el centro del conjunto va al centro del ambiente elegido (el centroide de su área) o, si no hay, al centro de la planta activa (la caja que envuelve sus muros y ambientes; el origen si está vacía).
- **Cómo se ubican** (`analysisToCluster`, código puro en `apps/web/src/lib/lab/analysis-to-cluster.ts`): la foto se toma como un ambiente de `ancho conocido ?? 4 m` de ancho y 75 % de fondo; `x` e `y` pasan a metros desde su centro (+x a la derecha, +z hacia abajo). El tamaño es siempre el real del catálogo. El giro horario del análisis es el `rotY` de Pascal con el signo opuesto (`rotY = -rotation_deg`; con `rotY = 0` el frente mira a +z, hacia quien mira la foto: si una pieza queda mirando al revés, se gira con R). Se descartan, con aviso en el diálogo, las piezas de confianza menor que 0,3 y los `asset_id` que el catálogo local no tiene; nunca se reemplazan por otra pieza.
- **Límites:** todo se apoya en el piso (nada sobre mesas) y las piezas pueden solaparse; no se agregan piezas de pared ni de techo; sin el estante paramétrico (`param:bookshelf`).
- **Código:** `shell/PhotoFurnitureDialog.tsx` y `photo-furniture-model.ts` (diálogo y su estado), `shell/bridge/cluster.ts` (`bridge.cluster.insert(pieces, levelId?)`: lo único que el diálogo sabe de Pascal) y `src/editor/cluster-deps.ts` (el único enlace real con `@pascal-app/core`). Pruebas: `test/lab-analysis-*.test.ts`, `shell-bridge-cluster.test.ts`, `shell-photo-furniture-*.test.ts*` y `e2e/muebles-desde-foto.spec.ts` (con la respuesta de la API simulada, sin clave ni cuota).

## Qué hay y qué se puede mejorar

### Ya está armado

| Pieza | Dónde | Para qué |
|---|---|---|
| Catálogo para el análisis | `apps/web/src/lib/lab/analysis-catalog.ts` | Las piezas candidatas (`catalog` del pedido) y el mapa id → pieza local |
| Conjunto de muebles | `apps/web/src/lib/lab/analysis-to-cluster.ts` | Del análisis a piezas del catálogo con su posición y giro (lo usa «Muebles desde una foto») |
| Cliente del análisis | `apps/web/src/lib/api/client.ts` (`api.analyzeRoom`), `photo.ts` (reduce la foto), `errors.ts` (cada error a castellano llano) y `lab/schema.ts` | Reduce la foto, la envía con el catálogo a nuestra API y valida la respuesta contra el contrato |
| Página «Escena desde una foto» | `apps/web/app/escena-desde-foto/` | Foto + ancho conocido, avisos, tabla de piezas y JSON crudo, y «Abrir en el editor» (crea el proyecto «Desde una foto · fecha y hora») |
| Del análisis al ambiente | `apps/web/src/lib/lab/analysis-to-definition.ts` (`analysisToDefinition`) | El ambiente de la foto con muros, puerta, ventana, piso de madera clara y los muebles dentro; lo usan «Abrir en el editor» y «Probar con un ejemplo» |
| Análisis de ejemplo | `apps/web/src/lib/lab/sample-analysis.ts` | El mismo que usan el botón de ejemplo y las pruebas |
| Camino al editor | `apps/web/src/editor/lab-scene.ts` | Cualquier definición válida → escena de Pascal → proyecto guardado → editor |
| Scripts de TP3 (opcionales) | `scripts/lab-*.mjs` (`pnpm lab:setup`, `lab:tp3`, `lab:tp3:test`) | Descargar, levantar y probar tu backend original para comparar |
| Pruebas | `apps/web/test/lab-*.test.ts`, `apps/web/e2e/escena-desde-foto.spec.ts` | Plomería y modelado verificados, con la respuesta de la API simulada |

El camino al editor se puede comprobar sin análisis: en la página, el desplegable «Comprobar que el camino al editor funciona» (solo fuera de producción) abre la plantilla Loft como proyecto nuevo.

### Cómo funciona y por dónde mejorarla

**`analysisToDefinition`** (`apps/web/src/lib/lab/analysis-to-definition.ts`) ya está implementada. Recibe el análisis de la foto, el catálogo local (`resolve`: de un `asset_id` a la pieza del catálogo de Pascal, con su tamaño real) y, si la persona lo escribió, el ancho conocido, y devuelve la definición de un ambiente que el editor sabe dibujar. Es el único camino de «Escena desde una foto»: «Abrir en el editor» y «Probar con un ejemplo» la llaman y `openDefinitionAsProject` (`src/editor/lab-scene.ts`) la convierte en proyecto. Hoy decide esto:

- **El ambiente:** un nivel con un ambiente rectangular de `ancho conocido ?? 4 m` y un fondo del 75 % (`roomSize`, el mismo que usa `analysisToCluster`); un ancho menor que 1 m se sube a 1 m y se avisa. Cuatro muros (`p-n`, `p-e`, `p-s` y `p-w`) con pintura blanca suave por dentro y revoque por fuera, con zócalo y cornisa; piso de madera clara (`wood-woodfine2`) y cielo.
- **Los muebles:** son los de `analysisToCluster` (tamaño real del catálogo, giro de Pascal, lo dudoso o desconocido se descarta con aviso y nunca se reemplaza), pasados a coordenadas absolutas. Ninguna pieza cruza un muro: si su huella (ya girada) se sale, se acerca al interior hasta quedar a 0,2 m del eje del muro (10 cm de su cara) y se avisa; si no cabe en el ambiente, queda en el centro y se avisa.
- **Puerta y ventana:** una de cada una: la puerta de 0,9 m y la ventana de un 35 % del largo del muro (hasta 2,2 m). La puerta prefiere el muro de quien mira la foto (sur) y la ventana el del fondo (norte); si hay muebles pegados delante, se corren a un tramo libre o pasan a otro muro, y en un ambiente muy chico se omiten si no caben.
- **Avisos:** todo lo que se movió, se achicó o se dejó afuera sale por `opts.warn`; la página lo guarda en «Avisos del modelado» y lo muestra cuando el editor no llega a abrirse.

Se puede seguir mejorando: más aberturas según la foto, que el frente de las piezas mire al centro, que las piezas no se pisen entre sí, otros materiales o varios ambientes. Una idea es mirar el resultado en el editor con el botón de ejemplo y cambiar de a una decisión, con su prueba en `apps/web/test/lab-analysis-to-definition.test.ts`. Si la definición tiene algún problema, el mensaje del validador aparece en pantalla, en castellano.

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
- **Sentido del giro:** `rotY` es el de three.js: positivo es antihorario visto desde arriba. La rotación del análisis es horaria, así que los sentidos son opuestos.
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

### Qué verifican las pruebas y qué más se podría verificar

`apps/web/test/lab-analysis-to-definition.test.ts` ya fija, con las piezas reales del catálogo y el validador de plantillas:

- el ambiente mide el ancho conocido (o 4 m) y el 75 % de fondo, y sus muros, puerta, ventana y piso son válidos para Pascal;
- las piezas quedan siempre dentro del ambiente, con su huella girada a 0,2 m del muro como mínimo, incluso las que el análisis ubica en el borde;
- la rotación respeta el sentido horario del análisis (visto desde arriba);
- un `asset_id` que no esté en el catálogo local o una pieza de confianza baja se avisan (`opts.warn`) sin romper el resto;
- el análisis de ejemplo (`SAMPLE_ANALYSIS`) se convierte en una escena que `buildLabEnvelope` dibuja sin errores;
- un análisis sin muebles da un ambiente vacío pero válido.

Ideas para sumar: que las piezas no se pisen entre sí, que el frente de cada pieza mire al centro del ambiente, aberturas que salgan de la foto y no solo de los muebles, y un tratamiento propio para las piezas de confianza media.

Para correr solo estas pruebas:

```powershell
pnpm --filter @interiores/web exec vitest run lab
```

### Cómo saber que funciona

- Las pruebas del laboratorio en verde (`lab-*.test.ts`).
- `pnpm verify` en verde (lint, build, tipos y pruebas).
- El botón «Probar con un ejemplo» abre el editor con el ambiente y sus muebles; `apps/web/e2e/escena-desde-foto.spec.ts` lo comprueba en un navegador.
- Opcional: una captura del resultado en `lab/resultados/capturas/`, por ejemplo para sumar al registro de pruebas.

## Plan de pruebas

Nueve casos para conocer cómo responde el análisis y qué muestra «Escena desde una foto». Cada uno se registra como se explica en la sección siguiente.

| # | Caso | Cómo probarlo | Resultado esperado |
|---|---|---|---|
| 1 | Foto clara | Una foto nítida de un ambiente con algunos de los muebles del catálogo (sofás, mesas, camas, plantas...; JPG, PNG o WebP; la web la reduce antes de enviarla) | Responde 200: la tabla lista las piezas con su confianza y el JSON crudo coincide con la tabla. Los avisos pueden venir vacíos |
| 2 | Foto con oclusión | Una foto donde un mueble queda tapado por otro (o por una persona o un objeto) | Los avisos del servicio mencionan la oclusión y la confianza de esa pieza baja; no aparecen muebles inventados detrás |
| 3 | Sin clave | Levantar la API sin `GEMINI_API_KEY` y pulsar «Analizar foto» | Mensaje en castellano «El análisis de fotos no está disponible por ahora» (503), sin nombrar la clave; no aparece resultado y el ejemplo sigue funcionando |
| 4 | Archivo enorme | Un archivo de imagen de más de 30 MB | Mensaje «La foto pesa más de 30 MB» (la web ni lo intenta abrir). Una foto menor se reduce sola a 1600 px y JPEG |
| 5 | Formato inválido | Un PDF o TXT (en el selector de archivos, elegir «Todos los archivos») | Mensaje «No pudimos abrir la foto» (el navegador no lo decodifica; no se llama a la API). Un GIF o similar que el navegador sí abre se convierte a JPEG y se analiza |
| 6 | Ancho conocido | Repetir el caso 1 escribiendo 4,5 en el ancho; después probar con 0 y con 101 | Con 4,5 el resultado dice «Ancho conocido: 4,5 m» (`calibration.status = user_provided`). Con 0 o 101 la página avisa el rango válido (0 a 100 m) antes de enviar. Sin ancho: «Sin ancho conocido» |
| 7 | Baja confianza | Una foto oscura, borrosa o tomada desde lejos | Piezas con confianza baja en la tabla y avisos del servicio; sirve para ver qué hacer con lo dudoso |
| 8 | Objetos que no están en el catálogo | Una foto con cuadros, lámparas de mesa o electrodomésticos chicos además de muebles | No aparecen en la tabla; los avisos suelen mencionarlos como elementos sin clasificar. Si el proveedor devolviera un `asset_id` fuera de la lista enviada, la API responde 502 y se muestra «No pudimos analizar la foto en este momento» |
| 9 | Tope por hora | Pedir 11 análisis seguidos con la misma cuenta (puede ser con el mismo archivo) | El undécimo muestra «Llegaste al límite de 10 análisis por hora. Inténtalo más tarde.» (429) y no llama a Gemini; cuentan también los que fallaron en Gemini |

## Cómo registrar resultados

1. Copiar la plantilla `lab/resultados/_plantilla.md`.
2. Nombrar el archivo `YYYY-MM-DD-<persona>-<caso>.md` (por ejemplo `2026-10-12-victoria-sin-clave.md`).
3. Completar los campos: fecha, persona, caso, foto, resultado, captura y observaciones.
4. Las capturas van en `lab/resultados/capturas/`. Conviene no subir fotos privadas: alcanza con describirlas o usar una de libre uso.

## Límites conocidos

- **Las medidas son estimadas.** El análisis devuelve proporciones del ambiente visible, no metros; con el ancho conocido solo se calibra esa referencia.
- **Solo las piezas del catálogo que se reconocen en una foto** (unas 40: sofás, sillones, mesas, camas, armarios, plantas, alfombras, artefactos de cocina y baño; la lista está en `analysis-catalog.ts`). Lo demás se ignora y a veces se menciona en los avisos. El estante paramétrico (`param:bookshelf`) no es candidato todavía: «Muebles desde una foto» solo crea piezas del catálogo.
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
| «No hay conexión» al analizar | Que la API esté corriendo (http://localhost:3001/health) y acepte pedidos de `http://localhost:3000` (`CORS_ORIGINS` en `apps/api/.env`) |
| «El análisis de fotos no está disponible por ahora» | Falta `GEMINI_API_KEY` en la API (ver «La clave de Gemini») o hay que reiniciarla después de agregarla |
| «No pudimos analizar la foto en este momento» | La terminal de la API: la línea `análisis de foto: el proveedor no entregó un resultado válido` trae un `reason` corto (`http_403:PERMISSION_DENIED` clave, `http_429:RESOURCE_EXHAUSTED` cuota, `http_404…` modelo, `timeout`…). Nunca trae la foto |
| Error inesperado al analizar y no hay filas en `analysis_usage` | Que la migración 004 esté aplicada en tu base local (`npx --yes supabase@2.120.0 migration up`) |
| `pnpm lab:tp3` dice que el puerto 8000 está en uso (TP3 opcional) | Quizá TP3 ya está corriendo: abrir http://localhost:8000 |
| `pnpm lab:setup` no encuentra Python | Instalar Python 3.11 o superior marcando «Add python.exe to PATH»; el atajo de la Microsoft Store no sirve |
| `pnpm lab:setup` no puede descargar | La conexión o el acceso a GitHub; se puede repetir el comando |
| La página pide ingresar siempre | Falta la API o la base: revisar `pnpm db:start`, `pnpm db:env` y la API en http://localhost:3001/health |
| Otra cosa | Anotarlo en un resultado de `lab/resultados/` o consultar a Silvert |
