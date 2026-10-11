# Tienda: catálogo de comercio y plantillas — Plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: usar `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para ejecutar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** que quien arma un comercio encuentre piezas de tienda en el editor y pueda partir de una **plantilla de muestra** que enseñe el potencial del editor (concept store de 2 niveles, café de especialidad con terraza, supermercado de barrio o loft de doble altura: niveles, escalera, materiales de la biblioteca de Pascal, zócalos y cornisas, mobiliario denso) en vez de una escena vacía.

**Arquitectura:** las piezas nuevas son 12 modelos de Kenney Mini Market (CC0) vendoreados en `public/items/` más piezas de Pascal ya locales, mostradas en una pestaña **Comercio**. Cada plantilla es una definición de datos **multinivel** (`src/lib/templates/definitions/`: muros, ambientes con piso y cielo, aberturas, piezas, escaleras, materiales por id de la biblioteca de Pascal) que un constructor transforma en una escena de Pascal usando los esquemas reales de `@pascal-app/core` en Node; el resultado se commitea como JSON en `public/templates/`. Las texturas que el repo MIT de Pascal no trae se piden a su CDN con un `rewrites().fallback` de Next. La pantalla de proyectos crea el proyecto y guarda esa escena con la API que ya existe, sin cambiar el contrato.

**Tecnologías:** las del spec 1 más `fflate 0.8.3` (descomprimir el ZIP de Kenney) y `tsx 4.23.15` (scripts en TypeScript).

**Spec:** [`docs/superpowers/specs/2026-10-11-tienda-y-plantillas-design.md`](../specs/2026-10-11-tienda-y-plantillas-design.md) (aprobado el 2026-10-11; ampliado el mismo día a plantillas de muestra con niveles y materiales, D7–D8). Leer ambos.

## Global Constraints

- Versiones **exactas** (sin `^` ni `~`). `zod` sigue en `4.5.4`; Pascal en `1.0.3`.
- Todo texto visible y todo mensaje de error en **castellano neutro, tuteo**. Los nombres de piezas y de plantillas van en castellano.
- Solo `apps/web/src/editor/` importa `@pascal-app/*`, `three` o `@react-three/*` desde `.ts`/`.tsx` (D8 del spec 1; lo verifica `tests/boundaries.test.ts`). Los datos de plantillas (`src/lib/templates/`) **no** importan Pascal.
- La API y `openapi.yaml` **no cambian**. El límite de escena es **5 MB** (`SCENE_MAX_BYTES`).
- Archivos de código de menos de 300 líneas (las definiciones de plantilla son datos y pueden pasar de esa cifra solo si se parten).
- Los assets de terceros solo de fuentes ya aprobadas: repo MIT de Pascal, su CDN de texturas (`https://editor.pascal.app/material/`, solo vía el `rewrite` de Next) y Kenney (CC0). Nada de claves en el repo.
- Los materiales de una definición se escriben por **id de la biblioteca de Pascal** (`wood-hungarianparquet10`); el constructor agrega el prefijo `library:`. Un id inexistente rompe la validación.
- Ejes de las definiciones: **x** a la derecha, **z** hacia abajo; el frente del local es el muro `-s`. Cada plantilla muestra potencial: 3 o más ambientes, 20 o más piezas, 5 o más materiales distintos (prueba en la Tarea 4).
- TDD: el primer test de cada unidad se ve **en rojo** antes de implementar. Un único comando de verdad: `pnpm verify`.
- Commits `tipo(área): descripción` en castellano, en la rama `feature/tienda-plantillas`.

## Review Focus

Entradas y condiciones que ninguna tarea probaría por sí sola; cada línea tiene su prueba en la tarea indicada.

1. **La plantilla no carga** (404, sin red o JSON roto): no se debe crear un proyecto vacío; la plantilla se pide y valida **antes** de crearlo. → Tarea 5.
2. **Doble clic en "Crear proyecto"** no crea dos proyectos. → Tarea 5 (E2E).
3. **Un ambiente cuyos muros no cierran** (muros que no llegan a la esquina) se rechaza al validar la definición. → Tarea 3.
4. **Un modelo o una textura que da 4xx** (carpeta mal nombrada, textura sin copiar, CDN que no responde). → Tareas 1 y 2 (modelos y texturas de las piezas) y Tarea 5 (E2E: ninguna textura de las plantillas da 4xx).
5. **Nombre del proyecto solo con espacios** muestra un aviso claro y no llega a la API (cierra una deuda menor del spec 1). → Tarea 5.
6. **Una escalera que sube a un nivel inexistente, un material que no existe o una abertura pegada a la esquina o pisada por otra** se rechazan al validar la definición, no al abrir el editor. → Tarea 3.

## Desviaciones del spec (verificadas el 2026-10-11)

| Spec | Qué encontramos | Qué hace el plan |
|---|---|---|
| §3 D3 / §4: miniatura de cada plantilla con Playwright | Una miniatura útil para la tarjeta es el **plano** de la plantilla, que se puede dibujar como SVG a partir de la definición, sin navegador. | El constructor genera `public/templates/<id>.svg`. Playwright solo hace la verificación visual (capturas de revisión). |
| §1 criterio 3 y D5: el catálogo localizado dejó fuera `cabinet` | El gabinete tiene `src` en la carpeta `kitchen-cabinet`; el match por **id** lo descartaba, el match por **carpeta del `src`** lo recupera: **101 de 111** ítems quedan locales (se descartan 10, no 11). | `localizeCatalogItem` busca por la carpeta del `src` y conserva `tool`. |
| §4: "vidriera" | No se probó el muro `curtain` de Pascal. | La vidriera es una **ventana ancha** (`type: 'window'`, `width` de 2 a 5 m según la plantilla). |
| D7: materiales de la biblioteca | De los 114 materiales de `MATERIAL_CATALOG`, solo 66 tienen textura en el repo (hormigón, metal, tela, cuero, colores lisos); madera, ladrillo, azulejo y piedra no. | `next.config.mjs` agrega `rewrites().fallback` de `/material/:path*` al CDN de Pascal; un archivo local siempre gana. Plan B si el CDN deja de servir: reemplazar en las definiciones los materiales sin textura local por equivalentes locales (el E2E de la Tarea 5 falla si alguna textura da 4xx). |
| D8: escalera | La orientación de `StairNode` con `rotation 0` no está calibrada y el prototipo solo comprobó que renderiza. | `rotY` y `at` de cada escalera se afinan en la revisión visual (Tarea 5, Paso 6); el validador solo exige que arranque dentro de un ambiente y suba a un nivel posterior. |

## Estructura de archivos

```
apps/web/
  scripts/lib/glb-bounds.ts                    caja envolvente de un GLB
  scripts/vendor-kenney-mini-market.ts         descarga + SHA-256 + extracción + manifest
  scripts/build-templates.ts                   definiciones → public/templates/*.json|svg   (--check compara)
  next.config.mjs                              rewrite de /material/* al CDN de Pascal (texturas que el repo no trae)
  src/lib/templates/types.ts, geometry.ts (perimeter/row/grid), validate.ts, thumbnail.ts, index.ts, create-from-template.ts
  src/lib/templates/definitions/{concept-store,cafe,supermercado,loft}.ts   datos puros, multinivel, con materiales
  src/editor/templates/scene-builder.ts        definición → grafo de Pascal (única pieza que importa @pascal-app/core)
  src/editor/commerce-catalog.ts, kenney-pieces.json   catálogo de la pestaña Comercio
  src/components/TemplatePicker.tsx            tarjetas de plantilla (mínimas, sin diseño final)
  public/items/kenney-*/  ·  public/templates/*.json|svg
  test/support/asset-ids.ts                    ids de piezas disponibles (para validar definiciones)
  e2e/templates.spec.ts, e2e/catalog.spec.ts
THIRD_PARTY_NOTICES.md
```

---

### Task 1: Piezas de Kenney Mini Market

**Responsable sugerido:** Victoria. Revisa: Silvert.

**Files:**
- Create: `apps/web/scripts/lib/glb-bounds.ts`, `apps/web/scripts/vendor-kenney-mini-market.ts`
- Create: `apps/web/test/glb-bounds.test.ts`
- Create (generados por el script): `apps/web/public/items/kenney-*/`, `apps/web/public/items/kenney-LICENSE.txt`, `apps/web/src/editor/kenney-pieces.json`
- Modify: `apps/web/package.json`, `apps/web/tsconfig.json`

**Interfaces:**
- Produces: `glbBounds(input: Uint8Array | Buffer): { size: [number, number, number]; min: [number, number, number] }`; `src/editor/kenney-pieces.json`: `Array<{ id: string; folder: string; name: string; category: 'furniture' | 'appliance'; tags: string[]; dimensions: [number, number, number] }>` con los 12 ids `kenney-<pieza>`.

- [ ] **Paso 1: Rama y dependencias**

```bash
git switch feature/tienda-plantillas
pnpm --filter @interiores/web add -D fflate@0.8.3 tsx@4.23.15
```
Expected: `package.json` de `apps/web` suma las dos dependencias con versión exacta (si pnpm escribe `^`, quitarlo a mano).

Modify `apps/web/tsconfig.json`: en `include` agregar `"scripts"`:

```json
  "include": ["next-env.d.ts", "src", "app", "test", "e2e", "scripts"],
```

- [ ] **Paso 2: Escribir la prueba de `glbBounds` en rojo**

Create `apps/web/test/glb-bounds.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { glbBounds } from '../scripts/lib/glb-bounds'

/** Arma un GLB mínimo (solo el trozo JSON): glbBounds lee los mínimos y máximos de los accesores. */
function makeGlb(json: object): Buffer {
  let text = JSON.stringify(json)
  while (Buffer.byteLength(text) % 4 !== 0) text += ' '
  const body = Buffer.from(text)
  const header = Buffer.alloc(20)
  header.writeUInt32LE(0x46546c67, 0)
  header.writeUInt32LE(2, 4)
  header.writeUInt32LE(20 + body.length, 8)
  header.writeUInt32LE(body.length, 12)
  header.writeUInt32LE(0x4e4f534a, 16)
  return Buffer.concat([header, body])
}

const box = (min: number[], max: number[]) => ({
  meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
  accessors: [{ type: 'VEC3', min, max }],
})

describe('glbBounds', () => {
  it('mide una caja sin transformaciones', () => {
    const glb = makeGlb({ scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }], ...box([-0.5, 0, -0.5], [0.5, 1, 0.5]) })
    expect(glbBounds(glb)).toEqual({ size: [1, 1, 1], min: [-0.5, 0, -0.5] })
  })

  it('aplica la escala del nodo', () => {
    const glb = makeGlb({ scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, scale: [2, 2, 2] }], ...box([0, 0, 0], [1, 1, 1]) })
    expect(glbBounds(glb).size).toEqual([2, 2, 2])
  })

  it('acumula la traslación de un nodo padre', () => {
    const glb = makeGlb({
      scenes: [{ nodes: [0] }],
      nodes: [{ children: [1], translation: [10, 0, 0] }, { mesh: 0 }],
      ...box([0, 0, 0], [1, 1, 1]),
    })
    expect(glbBounds(glb).min).toEqual([10, 0, 0])
  })

  it('una rotación de 90° sobre Y intercambia ancho y fondo', () => {
    const s = Math.SQRT1_2
    const glb = makeGlb({
      scenes: [{ nodes: [0] }],
      nodes: [{ mesh: 0, rotation: [0, s, 0, s] }],
      ...box([0, 0, 0], [2, 1, 1]),
    })
    expect(glbBounds(glb).size).toEqual([1, 1, 2])
  })

  it('rechaza un archivo que no es GLB', () => {
    expect(() => glbBounds(Buffer.from('no soy un glb, de verdad que no'))).toThrow('no es un GLB')
  })
})
```

- [ ] **Paso 3: Ver la prueba fallar**

Run: `pnpm --filter @interiores/web exec vitest run glb-bounds`
Expected: FAIL — `Failed to resolve import "../scripts/lib/glb-bounds"`. Pegar en el PR.

- [ ] **Paso 4: Implementar `glbBounds`**

Create `apps/web/scripts/lib/glb-bounds.ts`:

```ts
type Vec3 = [number, number, number]
type Gltf = {
  scene?: number
  scenes: { nodes: number[] }[]
  nodes: { mesh?: number; children?: number[]; matrix?: number[]; translation?: number[]; rotation?: number[]; scale?: number[] }[]
  meshes: { primitives: { attributes: { POSITION: number } }[] }[]
  accessors: { min: number[]; max: number[] }[]
}

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

// Matrices de 16 números en orden de columnas, como glTF.
function multiply(a: number[], b: number[]): number[] {
  const out = new Array<number>(16).fill(0)
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      let sum = 0
      for (let k = 0; k < 4; k++) sum += (a[k * 4 + r] as number) * (b[c * 4 + k] as number)
      out[c * 4 + r] = sum
    }
  }
  return out
}

function localMatrix(node: Gltf['nodes'][number]): number[] {
  if (node.matrix) return node.matrix
  const [tx, ty, tz] = node.translation ?? [0, 0, 0]
  const [sx, sy, sz] = node.scale ?? [1, 1, 1]
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1]
  const r00 = 1 - 2 * (y! * y! + z! * z!)
  const r01 = 2 * (x! * y! - z! * w!)
  const r02 = 2 * (x! * z! + y! * w!)
  const r10 = 2 * (x! * y! + z! * w!)
  const r11 = 1 - 2 * (x! * x! + z! * z!)
  const r12 = 2 * (y! * z! - x! * w!)
  const r20 = 2 * (x! * z! - y! * w!)
  const r21 = 2 * (y! * z! + x! * w!)
  const r22 = 1 - 2 * (x! * x! + y! * y!)
  return [
    r00 * sx!, r10 * sx!, r20 * sx!, 0,
    r01 * sy!, r11 * sy!, r21 * sy!, 0,
    r02 * sz!, r12 * sz!, r22 * sz!, 0,
    tx!, ty!, tz!, 1,
  ]
}

const round3 = (n: number) => Math.round(n * 1000) / 1000 + 0 // `+ 0` evita -0

/** Caja envolvente (en metros) de un GLB: recorre los nodos aplicando traslación, rotación y escala. */
export function glbBounds(input: Uint8Array): { size: Vec3; min: Vec3 } {
  const buf = Buffer.from(input)
  if (buf.length < 20 || buf.readUInt32LE(0) !== 0x46546c67) throw new Error('El archivo no es un GLB')
  const jsonLength = buf.readUInt32LE(12)
  const gltf = JSON.parse(buf.subarray(20, 20 + jsonLength).toString('utf8')) as Gltf
  const min: Vec3 = [Infinity, Infinity, Infinity]
  const max: Vec3 = [-Infinity, -Infinity, -Infinity]

  const walk = (index: number, parent: number[]) => {
    const node = gltf.nodes[index]!
    const m = multiply(parent, localMatrix(node))
    if (node.mesh !== undefined) {
      for (const primitive of gltf.meshes[node.mesh]!.primitives) {
        const acc = gltf.accessors[primitive.attributes.POSITION]!
        for (const cx of [acc.min[0]!, acc.max[0]!]) {
          for (const cy of [acc.min[1]!, acc.max[1]!]) {
            for (const cz of [acc.min[2]!, acc.max[2]!]) {
              const p: Vec3 = [
                m[0]! * cx + m[4]! * cy + m[8]! * cz + m[12]!,
                m[1]! * cx + m[5]! * cy + m[9]! * cz + m[13]!,
                m[2]! * cx + m[6]! * cy + m[10]! * cz + m[14]!,
              ]
              for (let i = 0; i < 3; i++) {
                min[i] = Math.min(min[i]!, p[i]!)
                max[i] = Math.max(max[i]!, p[i]!)
              }
            }
          }
        }
      }
    }
    for (const child of node.children ?? []) walk(child, m)
  }

  for (const root of gltf.scenes[gltf.scene ?? 0]!.nodes) walk(root, IDENTITY)
  return {
    size: [round3(max[0]! - min[0]!), round3(max[1]! - min[1]!), round3(max[2]! - min[2]!)],
    min: [round3(min[0]!), round3(min[1]!), round3(min[2]!)],
  }
}
```

- [ ] **Paso 5: Ver la prueba pasar**

Run: `pnpm --filter @interiores/web exec vitest run glb-bounds`
Expected: PASS (5 pruebas).

- [ ] **Paso 6: Script que vendorea las 12 piezas**

Create `apps/web/scripts/vendor-kenney-mini-market.ts`:

```ts
// Descarga Kenney Mini Market (CC0), verifica su SHA-256, copia 12 piezas a public/items/ y escribe el manifest.
//   tsx scripts/vendor-kenney-mini-market.ts            descarga y copia
//   tsx scripts/vendor-kenney-mini-market.ts --check    solo verifica que estén todos los archivos
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { unzipSync } from 'fflate'
import { glbBounds } from './lib/glb-bounds'

const ZIP_URL = 'https://kenney.nl/media/pages/assets/mini-market/463f38da51-1729865423/kenney_mini-market.zip'
const ZIP_SHA256 = '6f2e69090e359204ace43e4c98dc3fb8639b75e423109672b5c890d194c45203'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')

type Piece = { file: string; name: string; category: 'furniture' | 'appliance'; tags: string[] }
const PIECES: Piece[] = [
  { file: 'cash-register', name: 'Caja registradora', category: 'appliance', tags: ['comercio', 'caja', 'mostrador'] },
  { file: 'freezer', name: 'Freezer horizontal', category: 'appliance', tags: ['comercio', 'freezer', 'heladera'] },
  { file: 'freezers-standing', name: 'Freezers verticales', category: 'appliance', tags: ['comercio', 'freezer', 'heladera'] },
  { file: 'shelf-bags', name: 'Góndola de bolsas', category: 'furniture', tags: ['comercio', 'góndola', 'estante'] },
  { file: 'shelf-boxes', name: 'Góndola de cajas', category: 'furniture', tags: ['comercio', 'góndola', 'estante'] },
  { file: 'shelf-end', name: 'Cabecera de góndola', category: 'furniture', tags: ['comercio', 'góndola', 'estante'] },
  { file: 'display-bread', name: 'Exhibidor de pan', category: 'furniture', tags: ['comercio', 'exhibidor', 'panadería'] },
  { file: 'display-fruit', name: 'Exhibidor de fruta', category: 'furniture', tags: ['comercio', 'exhibidor', 'verdulería'] },
  { file: 'shopping-cart', name: 'Carrito de compras', category: 'furniture', tags: ['comercio', 'carrito'] },
  { file: 'shopping-basket', name: 'Canasto', category: 'furniture', tags: ['comercio', 'canasto'] },
  { file: 'bottle-return', name: 'Retorno de botellas', category: 'appliance', tags: ['comercio', 'reciclaje'] },
  { file: 'character-employee', name: 'Vendedor', category: 'furniture', tags: ['comercio', 'persona', 'vendedor'] },
]

const folderOf = (piece: Piece) => `kenney-${piece.file}`
const itemsDir = join(root, 'public/items')
const manifestPath = join(root, 'src/editor/kenney-pieces.json')

if (process.argv.includes('--check')) {
  const missing = PIECES.flatMap((p) =>
    ['model.glb', 'thumbnail.png', 'Textures/colormap.png']
      .map((f) => `${folderOf(p)}/${f}`)
      .filter((f) => !existsSync(join(itemsDir, f))),
  )
  if (!existsSync(manifestPath)) missing.push('src/editor/kenney-pieces.json')
  if (missing.length > 0) {
    console.error(`Faltan archivos de Kenney: ${missing.join(', ')}. Ejecuta: pnpm --filter @interiores/web assets:kenney`)
    process.exit(1)
  }
  process.exit(0)
}

const response = await fetch(ZIP_URL)
if (!response.ok) throw new Error(`No se pudo descargar Kenney Mini Market: HTTP ${response.status}`)
const zipBytes = new Uint8Array(await response.arrayBuffer())
const sha = createHash('sha256').update(zipBytes).digest('hex')
if (sha !== ZIP_SHA256) throw new Error(`El ZIP de Kenney cambió (SHA-256 ${sha}); revisa la licencia y el contenido antes de actualizar el hash.`)

const files = unzipSync(zipBytes)
const need = (path: string): Uint8Array => {
  const data = files[path]
  if (!data) throw new Error(`El ZIP no trae ${path}`)
  return data
}

const manifest = PIECES.map((piece) => {
  const glb = need(`Models/GLB format/${piece.file}.glb`)
  const dir = join(itemsDir, folderOf(piece))
  mkdirSync(join(dir, 'Textures'), { recursive: true })
  writeFileSync(join(dir, 'model.glb'), glb)
  writeFileSync(join(dir, 'Textures/colormap.png'), need('Models/GLB format/Textures/colormap.png'))
  writeFileSync(join(dir, 'thumbnail.png'), need(`Previews/${piece.file}.png`))
  return {
    id: folderOf(piece),
    folder: folderOf(piece),
    name: piece.name,
    category: piece.category,
    tags: piece.tags,
    dimensions: glbBounds(glb).size,
  }
})

writeFileSync(join(itemsDir, 'kenney-LICENSE.txt'), Buffer.from(need('License.txt')))
mkdirSync(dirname(manifestPath), { recursive: true })
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Listo: ${manifest.length} piezas de Kenney Mini Market (CC0) en public/items/`)
```

Modify `apps/web/package.json`: en `scripts` agregar
`"assets:kenney": "tsx scripts/vendor-kenney-mini-market.ts"` y cambiar `prebuild` a:

```json
    "prebuild": "pnpm --filter @interiores/contract build && node scripts/vendor-pascal-assets.mjs --check && tsx scripts/vendor-kenney-mini-market.ts --check",
```

- [ ] **Paso 7: Ejecutar el script y revisar el resultado**

Run: `pnpm --filter @interiores/web assets:kenney`
Expected: `Listo: 12 piezas de Kenney Mini Market (CC0) en public/items/`. Se crean `public/items/kenney-*/{model.glb,thumbnail.png,Textures/colormap.png}`, `public/items/kenney-LICENSE.txt` y `src/editor/kenney-pieces.json` con `dimensions` reales (la caja registradora mide 0,85 × 0,595 × 0,85 m).

Run: `pnpm --filter @interiores/web exec tsx scripts/vendor-kenney-mini-market.ts --check; echo $?`
Expected: `0`.

- [ ] **Paso 8: Verificar y commit**

Run: `pnpm verify`
Expected: PASS.

```bash
git add -A
git commit -m "feat(tienda): 12 piezas de Kenney Mini Market (CC0) vendoreadas con sus medidas reales"
git push -q
```

---

### Task 2: Catálogo de comercio y gabinete recuperado

**Responsable sugerido:** Victoria. Revisa: Silvert.

**Files:**
- Modify: `apps/web/src/editor/catalog.ts`, `apps/web/test/catalog.test.ts`, `apps/web/src/editor/ProjectEditor.tsx`
- Create: `apps/web/src/editor/commerce-catalog.ts`, `apps/web/test/commerce-catalog.test.ts`, `apps/web/e2e/catalog.spec.ts`

**Interfaces:**
- Consumes: `kenney-pieces.json` (Tarea 1), `local-items.json` (spec 1).
- Produces: `localizeCatalogItem` (ahora por carpeta del `src`, conserva `tool`); `COMMERCE_PASCAL_IDS: readonly string[]`; `kenneyAssets(): CommerceAsset[]`; `buildCommerceItems<T extends { id: string }>(localized: T[]): Array<T | CommerceAsset>`.

- [ ] **Paso 1: Cambiar las pruebas del catálogo (rojo)**

Modify `apps/web/test/catalog.test.ts`: agregar este caso dentro de `describe('localizeCatalogItem', …)`:

```ts
  it('conserva la herramienta nativa y usa la carpeta del modelo (cabinet vive en kitchen-cabinet)', () => {
    const cabinet = {
      id: 'cabinet',
      tool: 'cabinet',
      category: 'furniture',
      name: 'Modular Cabinet',
      src: `${BUCKET}/kitchen-cabinet/model.glb`,
      thumbnail: `${BUCKET}/kitchen-cabinet/thumbnail.png`,
      dimensions: [1, 1, 1] as [number, number, number],
    }
    const local = localizeCatalogItem(cabinet, manifest)
    expect(local?.tool).toBe('cabinet')
    expect(local?.src).toBe('/items/kitchen-cabinet/model.glb')
    expect(local?.thumbnail).toBe('/items/kitchen-cabinet/thumbnail.webp')
  })
```

y reemplazar el caso `'exactamente 100 ítems tienen modelo y miniatura locales'` por:

```ts
  it('101 de los 111 ítems tienen modelo local (se busca por la carpeta del src, no por el id)', () => {
    const folders = [...source.matchAll(/items\/system\/([^/']+)\/model\.glb/g)].map((m) => m[1] as string)
    const local = folders.filter((f) => (manifest as Record<string, string[]>)[f]?.includes('model.glb'))
    expect(folders).toHaveLength(101)
    expect(local).toHaveLength(101)
  })
```

También en ese archivo cambiar el caso `'descarta los ítems que no tienen modelo local'` para que use un `src` fuera del bucket del sistema (el id ya no decide):

```ts
  it('descarta los ítems cuyo modelo no está en el bucket del sistema (subidas de usuario)', () => {
    const user = { ...sofa, id: 'dishwasher-movn72ls', src: `${BUCKET.replace('/system', '')}/users/user_x/dishwasher-movn72ls/models/m.glb` }
    expect(localizeCatalogItem(user, manifest)).toBeNull()
  })
```

(y borrar el caso `'sin tocar los de otro origen'`, que queda cubierto por este.)

- [ ] **Paso 2: Ver las pruebas fallar**

Run: `pnpm --filter @interiores/web exec vitest run catalog`
Expected: FAIL — `conserva la herramienta nativa…` (`local` es `null`) y `descarta los ítems cuyo modelo no está en el bucket…` pasa por casualidad; el de 101 falla porque `localizeCatalogItem` aún no se usa así. Pegar en el PR.

- [ ] **Paso 3: Implementar la localización por carpeta**

Modify `apps/web/src/editor/catalog.ts` (reemplazar el archivo completo):

```ts
const BUCKET_SYSTEM = /^https:\/\/byrpxoiotywskoojsrzd\.supabase\.co\/storage\/v1\/object\/public\/items\/system\/([^/]+)\//

export type LocalItemsManifest = Record<string, string[]>

type CatalogLike = { id: string; src: string; thumbnail?: string; floorPlanUrl?: string }

/**
 * Reescribe un ítem del catálogo de Pascal para servirlo desde `public/items/<carpeta>/`.
 * La carpeta sale del `src` (no del id: el gabinete `cabinet` usa la carpeta `kitchen-cabinet`).
 * Devuelve `null` si el modelo no está en el bucket del sistema o no existe localmente (subidas de usuario).
 */
export function localizeCatalogItem<T extends CatalogLike>(item: T, manifest: LocalItemsManifest): T | null {
  const folder = BUCKET_SYSTEM.exec(item.src)?.[1]
  const files = folder ? manifest[folder] : undefined
  if (!folder || !files?.includes('model.glb')) return null
  const base = `/items/${folder}`
  return {
    ...item,
    src: `${base}/model.glb`,
    thumbnail: files.includes('thumbnail.webp') ? `${base}/thumbnail.webp` : undefined,
    floorPlanUrl: files.includes('floor-plan.svg') ? `${base}/floor-plan.svg` : undefined,
  }
}
```

Run: `pnpm --filter @interiores/web exec vitest run catalog`
Expected: PASS.

- [ ] **Paso 4: Prueba del catálogo de comercio (rojo)**

Create `apps/web/test/commerce-catalog.test.ts`:

```ts
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { COMMERCE_PASCAL_IDS, buildCommerceItems, kenneyAssets } from '../src/editor/commerce-catalog'
import { localizeCatalogItem } from '../src/editor/catalog'
import manifest from '../src/editor/local-items.json' with { type: 'json' }

const publicPath = (p: string) => fileURLToPath(new URL(`../public${p}`, import.meta.url))
const source = readFileSync(
  fileURLToPath(new URL('../node_modules/@pascal-app/editor/src/components/ui/item-catalog/catalog-items.tsx', import.meta.url)),
  'utf8',
)
const BUCKET = 'https://byrpxoiotywskoojsrzd.supabase.co/storage/v1/object/public/items/system'
const officialIds = [...source.matchAll(/\n {4}id: '([^']+)'/g)].map((m) => m[1] as string)
const folderById = new Map<string, string>()
for (const block of source.split('\n  {\n')) {
  const id = /\bid: '([^']+)'/.exec(block)?.[1]
  const folder = /items\/system\/([^/']+)\/model\.glb/.exec(block)?.[1]
  if (id && folder) folderById.set(id, folder)
}
// Un "catálogo localizado" mínimo con los ítems oficiales que sí tienen modelo local.
const localized = officialIds.flatMap((id) => {
  const folder = folderById.get(id)
  if (!folder) return []
  return localizeCatalogItem({ id, src: `${BUCKET}/${folder}/model.glb` }, manifest) ?? []
})

describe('catálogo de comercio', () => {
  it('cada pieza de Pascal elegida existe en el catálogo oficial y tiene modelo local', () => {
    for (const id of COMMERCE_PASCAL_IDS) {
      expect(officialIds, id).toContain(id)
      expect(localized.map((i) => i.id), id).toContain(id)
    }
  })

  it('cada pieza de Kenney trae su modelo, su textura y su miniatura', () => {
    const assets = kenneyAssets()
    expect(assets).toHaveLength(12)
    for (const a of assets) {
      expect(existsSync(publicPath(a.src)), a.src).toBe(true)
      expect(existsSync(publicPath(a.src.replace('model.glb', 'Textures/colormap.png'))), a.id).toBe(true)
      expect(existsSync(publicPath(a.thumbnail)), a.thumbnail).toBe(true)
      expect(a.dimensions.every((d) => d > 0)).toBe(true)
    }
  })

  it('la pestaña Comercio tiene al menos 20 piezas, sin ids repetidos, y arranca con el gabinete paramétrico', () => {
    const items = buildCommerceItems(localized)
    const ids = items.map((i) => i.id)
    expect(items.length).toBeGreaterThanOrEqual(20)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids[0]).toBe('cabinet')
  })
})
```

Run: `pnpm --filter @interiores/web exec vitest run commerce-catalog`
Expected: FAIL — `Failed to resolve import "../src/editor/commerce-catalog"`. Pegar en el PR.

- [ ] **Paso 5: Implementar el catálogo de comercio**

Create `apps/web/src/editor/commerce-catalog.ts`:

```ts
import kenney from './kenney-pieces.json'

export type CommerceAsset = {
  id: string
  category: 'furniture' | 'appliance'
  name: string
  tags: string[]
  src: string
  thumbnail: string
  dimensions: [number, number, number]
  offset: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
}

/** Piezas del catálogo de Pascal (ya locales) útiles para comercio; el gabinete paramétrico va primero. */
export const COMMERCE_PASCAL_IDS: readonly string[] = [
  'cabinet',
  'kitchen-counter',
  'kitchen',
  'stove',
  'hood',
  'fridge',
  'coffee-machine',
  'shelf',
  'bookshelf',
  'dresser',
  'coat-rack',
  'stool',
  'dining-table',
  'dining-chair',
  'coffee-table',
  'sofa',
  'office-table',
  'office-chair',
  'computer',
  'television',
  'picture',
  'round-mirror',
  'rectangular-carpet',
  'round-carpet',
  'indoor-plant',
  'small-indoor-plant',
  'floor-lamp',
  'ceiling-lamp',
  'trash-bin',
  'exit-sign',
  'smoke-detector',
  'electric-panel',
  'air-conditioning',
]

type KenneyPiece = (typeof kenney)[number]

export function kenneyAssets(pieces: readonly KenneyPiece[] = kenney): CommerceAsset[] {
  return pieces.map((p) => ({
    id: p.id,
    category: p.category as CommerceAsset['category'],
    name: p.name,
    tags: p.tags,
    src: `/items/${p.folder}/model.glb`,
    thumbnail: `/items/${p.folder}/thumbnail.png`,
    dimensions: p.dimensions as [number, number, number],
    offset: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  }))
}

/** Pestaña Comercio: las piezas de Pascal elegidas (en ese orden) y después las de Kenney. */
export function buildCommerceItems<T extends { id: string }>(localized: readonly T[]): Array<T | CommerceAsset> {
  const byId = new Map(localized.map((i) => [i.id, i]))
  const fromPascal = COMMERCE_PASCAL_IDS.flatMap((id) => byId.get(id) ?? [])
  return [...fromPascal, ...kenneyAssets()]
}
```

Run: `pnpm --filter @interiores/web exec vitest run commerce-catalog`
Expected: PASS (3 pruebas).

- [ ] **Paso 6: Montar la pestaña Comercio**

Modify `apps/web/src/editor/ProjectEditor.tsx`:
1. Agregar el import `import { buildCommerceItems } from './commerce-catalog'`.
2. Debajo de `const items = useMemo(…)` agregar:

```tsx
  const commerceItems = useMemo(() => buildCommerceItems(items), [items])
```

3. En `sidebarTabs`, después del objeto `items`, agregar:

```tsx
      {
        id: 'commerce',
        label: 'Comercio',
        icon: <span style={{ fontSize: 20 }}>🏪</span>,
        component: () => <ItemsPanel items={commerceItems} showSourceFilter={false} showTagFilters={false} />,
      },
```

y cambiar las dependencias del `useMemo` de `sidebarTabs` de `[items]` a `[items, commerceItems]`.

- [ ] **Paso 7: Prueba en navegador de la pestaña (rojo → verde)**

Create `apps/web/e2e/catalog.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test('la pestaña Comercio lista las piezas de tienda y todas cargan sin 404', async ({ page }) => {
  const failed: string[] = []
  page.on('response', (r) => {
    if (r.status() === 404 && /\/items\//.test(r.url())) failed.push(r.url())
  })
  await page.goto('/proyectos')
  await page.getByLabel('Nombre del proyecto').fill(`E2E comercio ${Date.now()}`)
  await page.getByRole('button', { name: 'Crear proyecto' }).click()
  await page.waitForURL(/\/proyectos\/[0-9a-f-]{36}$/)
  await page.getByRole('button', { name: 'Comercio' }).click()
  await expect(page.getByText('Caja registradora')).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText('Modular Cabinet')).toBeVisible()
  await page.waitForTimeout(3000)
  expect(failed).toEqual([])
})
```

Run (con Supabase local arriba: `pnpm db:start && pnpm db:env`): `pnpm --filter @interiores/web e2e -g "pestaña Comercio"`
Expected: PASS. Si falla por un 404 de `/items/…`, se corrige la ruta o el archivo faltante (no se relaja la prueba). Antes del Paso 6 esta misma prueba **falla**: `getByRole('button', { name: 'Comercio' })` no existe; pegar esa salida en el PR.

- [ ] **Paso 8: Verificar y commit**

Run: `pnpm verify`
Expected: PASS.

```bash
git add -A
git commit -m "feat(tienda): pestaña Comercio con 45 piezas y gabinete paramétrico recuperado"
git push -q
```

---

### Task 3: Definiciones multinivel con materiales, validador y constructor de escenas

**Responsable sugerido:** Silvert. Revisa: Victoria.

**Files:**
- Create: `apps/web/src/lib/templates/{types,geometry,validate}.ts`
- Create: `apps/web/src/editor/templates/scene-builder.ts`
- Create: `apps/web/test/{template-geometry,template-validate,scene-builder}.test.ts`
- Modify: `apps/web/next.config.mjs`

**Interfaces:**
- Produces:
  - `Pt = [number, number]`; `WallDef { id; from: Pt; to: Pt; name?; height?; inside?: string; outside?: string }`; `RoomDef { id; name; color; rect: [x0, z0, x1, z1]; floor?: string; ceiling?: string | null; open?: ('n' | 'e' | 's' | 'w')[] }`; `OpeningDef { id; type: 'door' | 'window'; wall; at; width; height?; sill?; name? }`; `ItemDef { asset; at: Pt; rotY?; y? }`; `StairDef { id; at: Pt; rotY; width; steps; to: string; rail?: 'none' | 'left' | 'right' | 'both' }`; `LevelDef { id; height?; wallInside?; wallOutside?; trim?; walls; rooms; openings; items; stairs? }`; `TemplateDefinition { id; kind; name; summary; levels: LevelDef[] }`
  - `perimeter(prefix, x0, z0, x1, z1): WallDef[]`; `row(asset, from, to, count, opts?)`, `grid(asset, origin, columns, rows, step, opts?)`: `ItemDef[]`; `roomArea`, `definitionArea(def)`
  - `validateDefinition(def, assetIds: ReadonlySet<string>, materialIds: ReadonlySet<string>): string[]`
  - `buildScene(def, assets: ReadonlyMap<string, AssetLike>): SceneGraph`, `MATERIAL_IDS: ReadonlySet<string>` (ids de la biblioteca de Pascal)

Los materiales se escriben por **id de la biblioteca** (`wood-hungarianparquet10`); el constructor les agrega el prefijo `library:` que Pascal espera en `materialPreset`.

- [ ] **Paso 1: Tipos y geometría**

Create `apps/web/src/lib/templates/types.ts`:

```ts
export type Pt = [number, number]

export type WallDef = {
  id: string
  from: Pt
  to: Pt
  name?: string
  /** Alto del muro en metros (parapetos y barandas); por defecto, el alto del nivel. */
  height?: number
  /** Material del lado que mira a un ambiente (id de la biblioteca de Pascal). */
  inside?: string
  /** Material del lado de afuera. */
  outside?: string
}

export type RoomDef = {
  id: string
  name: string
  color: string
  rect: [number, number, number, number]
  /** Material del piso (id de la biblioteca). */
  floor?: string
  /** Material del cielo; `null` = sin cielo (terraza). Si falta, el cielo queda sin material. */
  ceiling?: string | null
  /** Bordes que no llevan muro (por ejemplo, el entrepiso que mira a la planta baja). */
  open?: ('n' | 'e' | 's' | 'w')[]
}

export type OpeningDef = {
  id: string
  type: 'door' | 'window'
  wall: string
  /** Distancia en metros desde el inicio (`from`) del muro hasta el centro de la abertura. */
  at: number
  width: number
  height?: number
  /** Solo ventanas: altura del borde inferior sobre el piso. */
  sill?: number
  name?: string
}

export type ItemDef = { asset: string; at: Pt; rotY?: number; y?: number }

export type StairDef = {
  id: string
  /** Punto de arranque de la escalera en el nivel donde está definida. */
  at: Pt
  rotY: number
  width: number
  steps: number
  /** Id del nivel al que sube. */
  to: string
  rail?: 'none' | 'left' | 'right' | 'both'
}

export type LevelDef = {
  id: string
  height?: number
  /** Material por defecto del lado interior de los muros de este nivel. */
  wallInside?: string
  /** Material por defecto del lado exterior. */
  wallOutside?: string
  /** Zócalo y cornisa en los muros interiores. */
  trim?: boolean
  walls: WallDef[]
  rooms: RoomDef[]
  openings: OpeningDef[]
  items: ItemDef[]
  stairs?: StairDef[]
}

export type TemplateDefinition = {
  id: string
  kind: 'vivienda' | 'comercio'
  name: string
  summary: string
  /** El primero es la planta baja; la escalera de cada nivel sube al que indica `to`. */
  levels: LevelDef[]
}
```

Create `apps/web/src/lib/templates/geometry.ts`:

```ts
import type { ItemDef, Pt, RoomDef, TemplateDefinition, WallDef } from './types'

const round = (n: number) => Math.round(n * 1000) / 1000

/** Cuatro muros de un rectángulo: `-n` (arriba), `-e`, `-s` (abajo) y `-w`; todos van hacia +x o +z. */
export function perimeter(prefix: string, x0: number, z0: number, x1: number, z1: number): WallDef[] {
  return [
    { id: `${prefix}-n`, from: [x0, z0], to: [x1, z0] },
    { id: `${prefix}-e`, from: [x1, z0], to: [x1, z1] },
    { id: `${prefix}-s`, from: [x0, z1], to: [x1, z1] },
    { id: `${prefix}-w`, from: [x0, z0], to: [x0, z1] },
  ]
}

type Opts = { rotY?: number; y?: number }

/** `count` piezas repartidas en línea recta de `from` a `to`, ambos extremos incluidos. */
export function row(asset: string, from: Pt, to: Pt, count: number, opts: Opts = {}): ItemDef[] {
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0 : i / (count - 1)
    return { asset, at: [round(from[0] + (to[0] - from[0]) * t), round(from[1] + (to[1] - from[1]) * t)] as Pt, ...opts }
  })
}

/** Cuadrícula de `columns` × `rows` piezas con paso `step` desde `origin`. */
export function grid(asset: string, origin: Pt, columns: number, rows: number, step: Pt, opts: Opts = {}): ItemDef[] {
  const out: ItemDef[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      out.push({ asset, at: [round(origin[0] + c * step[0]), round(origin[1] + r * step[1])], ...opts })
    }
  }
  return out
}

export function roomArea(room: RoomDef): number {
  const [x0, z0, x1, z1] = room.rect
  return Math.abs(x1 - x0) * Math.abs(z1 - z0)
}

/** Superficie total (todos los niveles) en m², con un decimal. */
export function definitionArea(def: TemplateDefinition): number {
  const total = def.levels.reduce((sum, l) => sum + l.rooms.reduce((s, r) => s + roomArea(r), 0), 0)
  return Math.round(total * 10) / 10
}
```

- [ ] **Paso 2: Pruebas de geometría y del validador (rojo)**

Create `apps/web/test/template-geometry.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { grid, perimeter, row } from '../src/lib/templates/geometry'

describe('perimeter', () => {
  it('devuelve los cuatro muros de un rectángulo, todos hacia +x o +z', () => {
    const walls = perimeter('p', 0, 0, 10, 6)
    expect(walls.map((w) => w.id)).toEqual(['p-n', 'p-e', 'p-s', 'p-w'])
    expect(walls.find((w) => w.id === 'p-s')).toMatchObject({ from: [0, 6], to: [10, 6] })
    expect(walls.every((w) => w.to[0] >= w.from[0] && w.to[1] >= w.from[1])).toBe(true)
  })
})

describe('row y grid', () => {
  it('row reparte las piezas en línea con los extremos incluidos', () => {
    expect(row('x', [0, 1], [4, 1], 3).map((i) => i.at)).toEqual([[0, 1], [2, 1], [4, 1]])
  })

  it('row con una sola pieza la deja en el origen y conserva giro y altura', () => {
    expect(row('x', [2, 2], [9, 9], 1, { rotY: 1.5, y: 0.78 })).toEqual([{ asset: 'x', at: [2, 2], rotY: 1.5, y: 0.78 }])
  })

  it('grid arma columnas × filas con el paso indicado', () => {
    const items = grid('m', [1, 1], 3, 2, [2, 3])
    expect(items).toHaveLength(6)
    expect(items.map((i) => i.at)).toEqual([[1, 1], [3, 1], [5, 1], [1, 4], [3, 4], [5, 4]])
  })
})
```

Create `apps/web/test/template-validate.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { definitionArea, perimeter } from '../src/lib/templates/geometry'
import type { LevelDef, TemplateDefinition } from '../src/lib/templates/types'
import { validateDefinition } from '../src/lib/templates/validate'

const ASSETS = new Set(['kenney-cash-register', 'sofa'])
const MATERIALS = new Set(['wood-hungarianparquet10', 'concrete-plaster', 'flooring-agedbrick'])

function ground(): LevelDef {
  return {
    id: 'pb',
    wallInside: 'concrete-plaster',
    wallOutside: 'flooring-agedbrick',
    walls: [...perimeter('p', 0, 0, 8, 4), { id: 'int', from: [5, 0], to: [5, 4] }],
    rooms: [
      { id: 'salon', name: 'Salón', color: '#1F5FE0', rect: [0, 0, 5, 4], floor: 'wood-hungarianparquet10', ceiling: 'concrete-plaster' },
      { id: 'deposito', name: 'Depósito', color: '#7A8AA8', rect: [5, 0, 8, 4] },
    ],
    openings: [
      { id: 'entrada', type: 'door', wall: 'p-s', at: 2, width: 1 },
      { id: 'vidriera', type: 'window', wall: 'p-s', at: 3.8, width: 1.4, sill: 0.5 },
      { id: 'interior', type: 'door', wall: 'int', at: 2, width: 0.9 },
    ],
    items: [{ asset: 'kenney-cash-register', at: [1, 1] }],
    stairs: [{ id: 'escalera', at: [1, 3], rotY: 0, width: 1, steps: 12, to: 'alta' }],
  }
}

function upper(): LevelDef {
  return {
    id: 'alta',
    walls: [...perimeter('a', 4, 0, 8, 4)],
    rooms: [{ id: 'showroom', name: 'Showroom', color: '#1FA971', rect: [4, 0, 8, 4], open: ['w'] }],
    openings: [],
    items: [{ asset: 'sofa', at: [6, 2] }],
  }
}

function valid(): TemplateDefinition {
  return { id: 'prueba', kind: 'comercio', name: 'Prueba', summary: 'Un local de prueba', levels: [ground(), upper()] }
}

const check = (def: TemplateDefinition) => validateDefinition(def, ASSETS, MATERIALS)
const lv = (def: TemplateDefinition, i = 0) => def.levels[i] as LevelDef

describe('validateDefinition', () => {
  it('acepta una definición correcta de dos niveles', () => {
    expect(check(valid())).toEqual([])
  })

  it('suma el área de todos los niveles', () => {
    expect(definitionArea(valid())).toBe(48)
  })

  it('rechaza un ambiente cuyos muros no cierran', () => {
    const def = valid()
    lv(def).walls = lv(def).walls.map((w) => (w.id === 'p-s' ? { ...w, to: [7, 4] as [number, number] } : w))
    expect(check(def).some((e) => e.includes('depósito') && e.includes('no cierra'))).toBe(true)
  })

  it('tolera un borde declarado abierto y rechaza el mismo borde si no lo está', () => {
    const def = valid()
    lv(def, 1).walls = lv(def, 1).walls.filter((w) => w.id !== 'a-w')
    expect(check(def)).toEqual([])
    lv(def, 1).rooms = [{ id: 'showroom', name: 'Showroom', color: '#1FA971', rect: [4, 0, 8, 4] }]
    expect(check(def).some((e) => e.includes('showroom') && e.includes('no cierra'))).toBe(true)
  })

  it('rechaza una abertura que se sale del muro, que queda pegada a la esquina o que se pisa con otra', () => {
    const def = valid()
    lv(def).openings.push({ id: 'rara', type: 'window', wall: 'p-n', at: 7.9, width: 1 })
    lv(def).openings.push({ id: 'pisa', type: 'window', wall: 'p-s', at: 2.3, width: 1 })
    const errors = check(def)
    expect(errors.some((e) => e.includes('rara'))).toBe(true)
    expect(errors.some((e) => e.includes('se pisan'))).toBe(true)
  })

  it('rechaza una abertura en un muro que no existe', () => {
    const def = valid()
    lv(def).openings.push({ id: 'huerfana', type: 'door', wall: 'no-existe', at: 1, width: 1 })
    expect(check(def).some((e) => e.includes('no-existe'))).toBe(true)
  })

  it('rechaza una pieza que no está en el catálogo o cae fuera de los ambientes de su nivel', () => {
    const def = valid()
    lv(def).items.push({ asset: 'heladera-fantasma', at: [1, 1] }, { asset: 'sofa', at: [20, 20] })
    lv(def, 1).items.push({ asset: 'sofa', at: [1, 1] })
    const errors = check(def)
    expect(errors.some((e) => e.includes('heladera-fantasma'))).toBe(true)
    expect(errors.filter((e) => e.includes('fuera de los ambientes'))).toHaveLength(2)
  })

  it('rechaza un material que no existe en la biblioteca de Pascal', () => {
    const def = valid()
    lv(def).wallInside = 'madera-inventada'
    lv(def).rooms[1] = { ...(lv(def).rooms[1] as LevelDef['rooms'][number]), floor: 'piso-fantasma' }
    const errors = check(def)
    expect(errors.some((e) => e.includes('madera-inventada'))).toBe(true)
    expect(errors.some((e) => e.includes('piso-fantasma'))).toBe(true)
  })

  it('rechaza una escalera que sube a un nivel inexistente, o a sí mismo, o que arranca fuera de los ambientes', () => {
    const def = valid()
    lv(def).stairs = [
      { id: 'a', at: [1, 3], rotY: 0, width: 1, steps: 12, to: 'azotea' },
      { id: 'b', at: [1, 3], rotY: 0, width: 1, steps: 12, to: 'pb' },
      { id: 'c', at: [30, 30], rotY: 0, width: 1, steps: 12, to: 'alta' },
    ]
    const errors = check(def)
    expect(errors.filter((e) => e.includes('escalera'))).toHaveLength(3)
  })

  it('rechaza ids repetidos, ambientes solapados y muros diagonales', () => {
    const def = valid()
    lv(def).rooms.push({ id: 'salon', name: 'Otro', color: '#fff', rect: [4, 0, 6, 4] })
    lv(def).walls.push({ id: 'diagonal', from: [0, 0], to: [3, 3] })
    const errors = check(def)
    expect(errors.some((e) => e.includes('repetido'))).toBe(true)
    expect(errors.some((e) => e.includes('se solapan'))).toBe(true)
    expect(errors.some((e) => e.includes('diagonal'))).toBe(true)
  })

  it('rechaza dos niveles con el mismo id', () => {
    const def = valid()
    lv(def, 1).id = 'pb'
    expect(check(def).some((e) => e.includes('nivel') && e.includes('repetido'))).toBe(true)
  })
})
```

Run: `pnpm --filter @interiores/web exec vitest run template-geometry template-validate`
Expected: FAIL — `Failed to resolve import "../src/lib/templates/validate"` (y `geometry` ya existe, pero `validate` no). Pegar en el PR.

- [ ] **Paso 3: Implementar el validador**

Create `apps/web/src/lib/templates/validate.ts`:

```ts
import type { LevelDef, OpeningDef, RoomDef, TemplateDefinition, WallDef } from './types'

const EPS = 0.011
const MARGIN = 0.1 // una abertura no puede quedar a menos de 10 cm de la esquina

const length = (w: WallDef) => Math.hypot(w.to[0] - w.from[0], w.to[1] - w.from[1])
const isHorizontal = (w: WallDef) => Math.abs(w.from[1] - w.to[1]) < EPS
const isVertical = (w: WallDef) => Math.abs(w.from[0] - w.to[0]) < EPS

/** ¿Los muros colineales cubren de punta a punta el borde `a..b` situado en `fixed`? */
function edgeCovered(axis: 'h' | 'v', fixed: number, a: number, b: number, walls: readonly WallDef[]): boolean {
  const spans: [number, number][] = []
  for (const w of walls) {
    if (axis === 'h' && isHorizontal(w) && Math.abs(w.from[1] - fixed) < EPS) {
      spans.push([Math.min(w.from[0], w.to[0]), Math.max(w.from[0], w.to[0])])
    }
    if (axis === 'v' && isVertical(w) && Math.abs(w.from[0] - fixed) < EPS) {
      spans.push([Math.min(w.from[1], w.to[1]), Math.max(w.from[1], w.to[1])])
    }
  }
  spans.sort((p, q) => p[0] - q[0])
  let reach = a
  for (const [s, e] of spans) {
    if (s > reach + EPS) break
    reach = Math.max(reach, e)
  }
  return reach >= b - EPS
}

const duplicates = (ids: string[]) => ids.filter((id, i) => ids.indexOf(id) !== i)
const inside = (room: RoomDef, x: number, z: number, tol = 0.05) =>
  x >= room.rect[0] - tol && x <= room.rect[2] + tol && z >= room.rect[1] - tol && z <= room.rect[3] + tol

function checkRoom(room: RoomDef, walls: readonly WallDef[], errors: string[]) {
  const [x0, z0, x1, z1] = room.rect
  if (x1 <= x0 || z1 <= z0) {
    errors.push(`El ambiente ${room.name.toLowerCase()} tiene un rectángulo inválido.`)
    return
  }
  const edges: ['n' | 's' | 'w' | 'e', 'h' | 'v', number, number, number][] = [
    ['n', 'h', z0, x0, x1],
    ['s', 'h', z1, x0, x1],
    ['w', 'v', x0, z0, z1],
    ['e', 'v', x1, z0, z1],
  ]
  const open = room.open ?? []
  if (edges.some(([side, axis, fixed, a, b]) => !open.includes(side) && !edgeCovered(axis, fixed, a, b, walls))) {
    errors.push(`El ambiente ${room.name.toLowerCase()} no cierra: algún borde no está cubierto por muros de punta a punta.`)
  }
}

function checkOpenings(openings: readonly OpeningDef[], walls: readonly WallDef[], errors: string[]) {
  const byWall = new Map<string, OpeningDef[]>()
  for (const o of openings) {
    const wall = walls.find((w) => w.id === o.wall)
    if (!wall) {
      errors.push(`La abertura ${o.id} apunta al muro ${o.wall}, que no existe.`)
      continue
    }
    if (o.at - o.width / 2 < MARGIN - EPS || o.at + o.width / 2 > length(wall) - MARGIN + EPS) {
      errors.push(`La abertura ${o.id} se sale del muro ${o.wall} (largo ${length(wall).toFixed(2)} m) o queda pegada a la esquina.`)
    }
    byWall.set(o.wall, [...(byWall.get(o.wall) ?? []), o])
  }
  for (const [wall, list] of byWall) {
    const sorted = [...list].sort((p, q) => p.at - q.at)
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1] as OpeningDef
      const next = sorted[i] as OpeningDef
      if (prev.at + prev.width / 2 > next.at - next.width / 2 + EPS) {
        errors.push(`Las aberturas ${prev.id} y ${next.id} se pisan en el muro ${wall}.`)
      }
    }
  }
}

function checkLevel(level: LevelDef, levelIds: string[], index: number, assetIds: ReadonlySet<string>, materialIds: ReadonlySet<string>, errors: string[]) {
  for (const id of new Set([...duplicates(level.walls.map((w) => w.id)), ...duplicates(level.rooms.map((r) => r.id)), ...duplicates(level.openings.map((o) => o.id)), ...duplicates((level.stairs ?? []).map((s) => s.id))])) {
    errors.push(`El id ${id} está repetido en el nivel ${level.id}.`)
  }
  for (const w of level.walls) {
    if (!isHorizontal(w) && !isVertical(w)) errors.push(`El muro ${w.id} no es horizontal ni vertical.`)
    if (length(w) < 0.3) errors.push(`El muro ${w.id} es demasiado corto.`)
  }
  for (const room of level.rooms) checkRoom(room, level.walls, errors)
  for (let i = 0; i < level.rooms.length; i++) {
    for (let j = i + 1; j < level.rooms.length; j++) {
      const a = level.rooms[i] as RoomDef
      const b = level.rooms[j] as RoomDef
      const overlapX = Math.min(a.rect[2], b.rect[2]) - Math.max(a.rect[0], b.rect[0])
      const overlapZ = Math.min(a.rect[3], b.rect[3]) - Math.max(a.rect[1], b.rect[1])
      if (overlapX > EPS && overlapZ > EPS) errors.push(`Los ambientes ${a.id} y ${b.id} se solapan.`)
    }
  }
  checkOpenings(level.openings, level.walls, errors)
  for (const item of level.items) {
    if (!assetIds.has(item.asset)) errors.push(`La pieza ${item.asset} no está en el catálogo.`)
    if (!level.rooms.some((r) => inside(r, item.at[0], item.at[1]))) {
      errors.push(`La pieza ${item.asset} en (${item.at[0]}, ${item.at[1]}) cae fuera de los ambientes del nivel ${level.id}.`)
    }
  }
  for (const s of level.stairs ?? []) {
    const target = levelIds.indexOf(s.to)
    if (target <= index) errors.push(`La escalera ${s.id} debe subir a un nivel posterior que exista (${s.to}).`)
    else if (!level.rooms.some((r) => inside(r, s.at[0], s.at[1], 0))) errors.push(`La escalera ${s.id} arranca fuera de los ambientes del nivel ${level.id}.`)
    if (s.steps < 4 || s.width < 0.7) errors.push(`La escalera ${s.id} tiene muy pocos escalones o es muy angosta.`)
  }
  const materials: (string | undefined | null)[] = [
    level.wallInside,
    level.wallOutside,
    ...level.walls.flatMap((w) => [w.inside, w.outside]),
    ...level.rooms.flatMap((r) => [r.floor, r.ceiling]),
  ]
  for (const m of new Set(materials)) {
    if (m && !materialIds.has(m)) errors.push(`El material ${m} no existe en la biblioteca de Pascal.`)
  }
}

/** Devuelve la lista de problemas de una definición (vacía si es válida). */
export function validateDefinition(def: TemplateDefinition, assetIds: ReadonlySet<string>, materialIds: ReadonlySet<string>): string[] {
  const errors: string[] = []
  const levelIds = def.levels.map((l) => l.id)
  for (const id of new Set(duplicates(levelIds))) errors.push(`El id de nivel ${id} está repetido.`)
  if (def.levels.length === 0 || def.levels.every((l) => l.rooms.length === 0)) errors.push('La plantilla no tiene ambientes.')
  def.levels.forEach((level, index) => checkLevel(level, levelIds, index, assetIds, materialIds, errors))
  return errors
}
```

Run: `pnpm --filter @interiores/web exec vitest run template-geometry template-validate`
Expected: PASS (4 + 11 pruebas).

- [ ] **Paso 4: Texturas que el repo no trae**

Modify `apps/web/next.config.mjs`: dentro del objeto `nextConfig`, antes de `env`, agregar:

```js
  // Las texturas del repo MIT de Pascal están en public/material; las que no trae (madera, ladrillo, azulejo, mármol)
  // se piden al CDN predeterminado de sus paquetes. Un archivo local siempre tiene prioridad.
  async rewrites() {
    return { fallback: [{ source: '/material/:path*', destination: 'https://editor.pascal.app/material/:path*' }] }
  },
```

Run: `pnpm --filter @interiores/web exec next build 2>&1 | tail -5`
Expected: la compilación termina bien. (La prueba en navegador de la Tarea 5 comprueba que ninguna textura de las plantillas da 4xx.)

- [ ] **Paso 5: Pruebas del constructor (rojo)**

Create `apps/web/test/scene-builder.test.ts`:

```ts
import { SceneEnvelopeSchema } from '@interiores/contract'
import { describe, expect, it } from 'vitest'
import { MATERIAL_IDS, buildScene } from '../src/editor/templates/scene-builder'
import { perimeter } from '../src/lib/templates/geometry'
import type { TemplateDefinition } from '../src/lib/templates/types'

const asset = (id: string, name: string, extra: object = {}) => ({
  id,
  category: 'furniture',
  name,
  tags: ['comercio'],
  src: `/items/${id}/model.glb`,
  thumbnail: `/items/${id}/thumbnail.png`,
  dimensions: [1, 1, 1],
  offset: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1],
  ...extra,
})
const ASSETS = new Map([
  ['kenney-cash-register', asset('kenney-cash-register', 'Caja registradora')],
  ['sofa', asset('sofa', 'Sofá')],
])

const def: TemplateDefinition = {
  id: 'local-de-prueba',
  kind: 'comercio',
  name: 'Local de prueba',
  summary: 'Dos niveles',
  levels: [
    {
      id: 'pb',
      height: 3.4,
      wallInside: 'concrete-plaster',
      wallOutside: 'flooring-agedbrick',
      trim: true,
      walls: [
        ...perimeter('p', 0, 0, 8, 4).map((w) => (w.id === 'p-n' ? { ...w, inside: 'flooring-rusticbrick' } : w)),
        { id: 'int', from: [5, 0], to: [5, 4] },
      ],
      rooms: [
        { id: 'salon', name: 'Salón', color: '#1F5FE0', rect: [0, 0, 5, 4], floor: 'wood-hungarianparquet10', ceiling: 'concrete-plaster' },
        { id: 'terraza', name: 'Terraza', color: '#1FA971', rect: [5, 0, 8, 4], floor: 'flooring-terrazzo19', ceiling: null },
      ],
      openings: [
        { id: 'entrada', type: 'door', wall: 'p-s', at: 2, width: 1 },
        { id: 'vidriera', type: 'window', wall: 'p-s', at: 3.8, width: 1.4, sill: 0.5 },
        { id: 'interior', type: 'door', wall: 'int', at: 2, width: 0.9 },
      ],
      items: [
        { asset: 'kenney-cash-register', at: [1, 1], rotY: Math.PI },
        { asset: 'kenney-cash-register', at: [2, 1], y: 0.78 },
      ],
      stairs: [{ id: 'escalera', at: [1, 3], rotY: 0, width: 1.1, steps: 14, to: 'alta', rail: 'both' }],
    },
    {
      id: 'alta',
      height: 2.8,
      trim: true,
      walls: [...perimeter('a', 5, 0, 8, 4), { id: 'baranda', from: [5, 0], to: [5, 2], height: 1.05 }],
      rooms: [{ id: 'showroom', name: 'Showroom', color: '#7A8AA8', rect: [5, 0, 8, 4], floor: 'wood-woodfine22', open: ['w'] }],
      openings: [],
      items: [{ asset: 'sofa', at: [6, 2] }],
    },
  ],
}

type N = { id: string; type: string; parentId: string | null; children?: string[] } & Record<string, unknown>
const graph = buildScene(def, ASSETS)
const nodes = graph.nodes as Record<string, N>
const byType = (type: string) => Object.values(nodes).filter((n) => n.type === type)

describe('buildScene', () => {
  it('crea sitio, edificio, dos niveles y la cantidad esperada de nodos', () => {
    expect(byType('site')).toHaveLength(1)
    expect(byType('building')).toHaveLength(1)
    expect(byType('level')).toHaveLength(2)
    expect(byType('wall')).toHaveLength(10)
    expect(byType('zone')).toHaveLength(3)
    expect(byType('slab')).toHaveLength(3)
    expect(byType('ceiling')).toHaveLength(2) // la terraza (`ceiling: null`) no lleva cielo
    expect(byType('door')).toHaveLength(2)
    expect(byType('window')).toHaveLength(1)
    expect(byType('item')).toHaveLength(3)
    expect(byType('stair')).toHaveLength(1)
    expect(graph.rootNodeIds).toHaveLength(1)
  })

  it('los niveles tienen su índice y su altura, y el edificio los lista en orden', () => {
    const levels = byType('level').sort((a, b) => (a.level as number) - (b.level as number))
    expect(levels.map((l) => l.level)).toEqual([0, 1])
    expect(levels.map((l) => l.height)).toEqual([3.4, 2.8])
    expect(byType('building')[0]?.children).toEqual(levels.map((l) => l.id))
  })

  it('cada nodo apunta a un padre que existe y cada padre lista a sus hijos', () => {
    for (const n of Object.values(nodes)) {
      if (!n.parentId) continue
      expect(nodes[n.parentId], `${n.id} → ${n.parentId}`).toBeDefined()
      if (nodes[n.parentId]?.children) expect(nodes[n.parentId]?.children, n.id).toContain(n.id)
    }
  })

  it('las puertas y ventanas cuelgan de su muro y el muro las lista', () => {
    const openings = [...byType('door'), ...byType('window')]
    expect(openings).toHaveLength(3)
    for (const o of openings) {
      expect(nodes[o.parentId as string]?.type).toBe('wall')
      expect(o.wallId).toBe(o.parentId)
      expect(nodes[o.parentId as string]?.children).toContain(o.id)
    }
  })

  it('aplica los materiales de la biblioteca con el prefijo library: (piso, cielo y lados del muro)', () => {
    const slab = byType('slab').find((s) => s.name === 'Salón (losa)')
    expect(slab?.materialPreset).toBe('library:wood-hungarianparquet10')
    expect(byType('ceiling')[0]?.materialPreset).toBe('library:concrete-plaster')
    const north = nodes['wall_local_de_prueba_pb_p_n'] as N
    expect(north.interiorMaterialPreset).toBe('library:flooring-rusticbrick')
    expect(north.exteriorMaterialPreset).toBe('library:flooring-agedbrick')
    const partition = nodes['wall_local_de_prueba_pb_int'] as N
    expect(partition.interiorMaterialPreset).toBe('library:concrete-plaster')
  })

  it('activa zócalo y cornisa si el nivel lo pide, salvo en parapetos y barandas, y respeta el alto del muro', () => {
    const north = nodes['wall_local_de_prueba_pb_p_n'] as N
    expect((north.skirting as { enabled: boolean }).enabled).toBe(true)
    expect((north.crown as { enabled: boolean }).enabled).toBe(true)
    const rail = nodes['wall_local_de_prueba_alta_baranda'] as N
    expect(rail.height).toBe(1.05)
    expect((rail.skirting as { enabled?: boolean } | undefined)?.enabled ?? false).toBe(false)
    expect((rail.crown as { enabled?: boolean } | undefined)?.enabled ?? false).toBe(false)
    expect(((nodes['wall_local_de_prueba_alta_a_n'] as N).skirting as { enabled: boolean }).enabled).toBe(true)
  })

  it('la escalera conecta el nivel de abajo con el de arriba', () => {
    const stair = byType('stair')[0] as N
    const [ground, top] = byType('level').sort((a, b) => (a.level as number) - (b.level as number))
    expect(stair.parentId).toBe(ground?.id)
    expect(stair.fromLevelId).toBe(ground?.id)
    expect(stair.toLevelId).toBe(top?.id)
    expect(stair.stepCount).toBe(14)
    expect(stair.railingMode).toBe('both')
  })

  it('las piezas llevan su descriptor, su altura sobre la losa y su giro', () => {
    const [a, b] = byType('item').filter((i) => (i.asset as { id: string }).id === 'kenney-cash-register')
    expect((a?.asset as { src: string }).src).toBe('/items/kenney-cash-register/model.glb')
    expect(a?.position).toEqual([1, 0.05, 1])
    expect((a?.rotation as number[])[1]).toBeCloseTo(Math.PI)
    expect(b?.position).toEqual([2, 0.78, 1])
  })

  it('es determinista y cabe en un SceneEnvelope válido de mucho menos de 5 MB', () => {
    expect(JSON.stringify(buildScene(def, ASSETS))).toBe(JSON.stringify(graph))
    const envelope = { schemaVersion: 1, pascal: { core: '1.0.3' }, graph }
    expect(SceneEnvelopeSchema.safeParse(envelope).success).toBe(true)
    expect(JSON.stringify(envelope).length).toBeLessThan(300_000)
  })

  it('la biblioteca de materiales de Pascal está disponible para validar', () => {
    expect(MATERIAL_IDS.has('wood-hungarianparquet10')).toBe(true)
    expect(MATERIAL_IDS.has('concrete-plaster')).toBe(true)
    expect(MATERIAL_IDS.size).toBeGreaterThan(100)
  })

  it('se niega a construir una definición inválida y explica por qué', () => {
    const bad = structuredClone(def)
    bad.levels[0]!.walls = bad.levels[0]!.walls.filter((w) => w.id !== 'int')
    expect(() => buildScene(bad, ASSETS)).toThrow('no cierra')
    const badMaterial = structuredClone(def)
    badMaterial.levels[0]!.wallInside = 'no-es-un-material'
    expect(() => buildScene(badMaterial, ASSETS)).toThrow('no-es-un-material')
  })
})
```

Run: `pnpm --filter @interiores/web exec vitest run scene-builder`
Expected: FAIL — `Failed to resolve import "../src/editor/templates/scene-builder"`. Pegar en el PR.

- [ ] **Paso 6: Implementar el constructor**

Create `apps/web/src/editor/templates/scene-builder.ts`:

```ts
import type { SceneGraph } from '@interiores/contract'
import {
  BuildingNode,
  CeilingNode,
  DoorNode,
  ItemNode,
  LevelNode,
  MATERIAL_CATALOG,
  SiteNode,
  SlabNode,
  StairNode,
  WALL_CROWN_DEFAULT,
  WALL_SKIRTING_DEFAULT,
  WallNode,
  WindowNode,
  ZoneNode,
} from '@pascal-app/core'
import type { LevelDef, OpeningDef, TemplateDefinition } from '../../lib/templates/types'
import { validateDefinition } from '../../lib/templates/validate'

export type AssetLike = {
  id: string
  category: string
  name: string
  tags?: string[]
  src: string
  thumbnail?: string
  dimensions: number[]
  offset?: number[]
  rotation?: number[]
  scale?: number[]
  attachTo?: string
}

/** Ids de la biblioteca de materiales de Pascal (la definición los escribe sin el prefijo `library:`). */
export const MATERIAL_IDS: ReadonlySet<string> = new Set(MATERIAL_CATALOG.map((m) => m.id))

const WALL_THICKNESS = 0.2
const FLOOR_Y = 0.05 // la losa de Pascal tiene 5 cm de espesor
const FALLBACK_THUMBNAIL = '/icons/couch.webp'
const DOOR_HEIGHT = 2.1
const WINDOW_HEIGHT = 1.2
const WINDOW_SILL = 0.9

const clean = (s: string) => s.replace(/[^a-z0-9]/g, '_')
const lib = (id: string) => `library:${id}`

/**
 * Convierte una definición de plantilla en el grafo de escena de Pascal usando los esquemas reales de
 * `@pascal-app/core` (así se completan los valores por defecto). Es determinista: los ids salen de la definición.
 */
export function buildScene(def: TemplateDefinition, assets: ReadonlyMap<string, AssetLike>): SceneGraph {
  const errors = validateDefinition(def, new Set(assets.keys()), MATERIAL_IDS)
  if (errors.length > 0) throw new Error(`La plantilla ${def.id} no es válida:\n- ${errors.join('\n- ')}`)

  const tag = clean(def.id)
  const siteId = `site_${tag}`
  const buildingId = `building_${tag}`
  const levelNodeId = (level: LevelDef) => `level_${tag}_${clean(level.id)}`
  const sub = (type: string, level: LevelDef, id: string | number) => `${type}_${tag}_${clean(level.id)}_${clean(String(id))}`
  const nodes: Record<string, unknown> = {}

  def.levels.forEach((level, index) => {
    const lid = levelNodeId(level)
    const wallId = (id: string) => sub('wall', level, id)
    const openingId = (o: OpeningDef) => sub(o.type, level, o.id)
    const children: string[] = []

    const openingsByWall = new Map<string, string[]>()
    for (const o of level.openings) openingsByWall.set(o.wall, [...(openingsByWall.get(o.wall) ?? []), openingId(o)])

    for (const w of level.walls) {
      const inside = w.inside ?? level.wallInside
      const outside = w.outside ?? level.wallOutside
      nodes[wallId(w.id)] = WallNode.parse({
        id: wallId(w.id),
        parentId: lid,
        name: w.name ?? `Muro ${w.id}`,
        start: w.from,
        end: w.to,
        thickness: WALL_THICKNESS,
        children: openingsByWall.get(w.id) ?? [],
        ...(w.height ? { height: w.height } : {}),
        ...(inside ? { interiorMaterialPreset: lib(inside) } : {}),
        ...(outside ? { exteriorMaterialPreset: lib(outside) } : {}),
        ...(level.trim && !w.height
          ? {
              skirting: { ...WALL_SKIRTING_DEFAULT, enabled: true, sides: 'interior' },
              crown: { ...WALL_CROWN_DEFAULT, enabled: true, sides: 'interior' },
            }
          : {}),
      })
      children.push(wallId(w.id))
    }

    for (const o of level.openings) {
      const wid = wallId(o.wall)
      const height = o.height ?? (o.type === 'door' ? DOOR_HEIGHT : WINDOW_HEIGHT)
      const y = o.type === 'door' ? height / 2 : (o.sill ?? WINDOW_SILL) + height / 2
      const common = { id: openingId(o), parentId: wid, wallId: wid, name: o.name ?? o.id, position: [o.at, y, 0], width: o.width, height, side: 'front' }
      nodes[openingId(o)] = o.type === 'door' ? DoorNode.parse(common) : WindowNode.parse(common)
    }

    for (const r of level.rooms) {
      const [x0, z0, x1, z1] = r.rect
      const polygon = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]
      const zoneId = sub('zone', level, r.id)
      const slabId = sub('slab', level, r.id)
      nodes[zoneId] = ZoneNode.parse({ id: zoneId, parentId: lid, name: r.name, polygon, color: r.color })
      nodes[slabId] = SlabNode.parse({ id: slabId, parentId: lid, name: `${r.name} (losa)`, polygon, ...(r.floor ? { materialPreset: lib(r.floor) } : {}) })
      children.push(zoneId, slabId)
      if (r.ceiling !== null) {
        const ceilingId = sub('ceiling', level, r.id)
        nodes[ceilingId] = CeilingNode.parse({ id: ceilingId, parentId: lid, name: `${r.name} (cielo)`, polygon, ...(r.ceiling ? { materialPreset: lib(r.ceiling) } : {}) })
        children.push(ceilingId)
      }
    }

    level.items.forEach((it, i) => {
      const asset = assets.get(it.asset) as AssetLike
      const id = sub('item', level, i + 1)
      nodes[id] = ItemNode.parse({
        id,
        parentId: lid,
        name: asset.name,
        position: [it.at[0], it.y ?? FLOOR_Y, it.at[1]],
        rotation: [0, it.rotY ?? 0, 0],
        asset: {
          ...asset,
          tags: asset.tags ?? [],
          thumbnail: asset.thumbnail ?? FALLBACK_THUMBNAIL,
          offset: asset.offset ?? [0, 0, 0],
          rotation: asset.rotation ?? [0, 0, 0],
          scale: asset.scale ?? [1, 1, 1],
          source: 'library',
        },
      })
      children.push(id)
    })

    for (const s of level.stairs ?? []) {
      const id = sub('stair', level, s.id)
      const target = def.levels.find((l) => l.id === s.to) as LevelDef
      nodes[id] = StairNode.parse({
        id,
        parentId: lid,
        position: [s.at[0], 0, s.at[1]],
        rotation: s.rotY,
        fromLevelId: lid,
        toLevelId: levelNodeId(target),
        width: s.width,
        stepCount: s.steps,
        slabOpeningMode: 'destination',
        railingMode: s.rail ?? 'both',
      })
      children.push(id)
    }

    nodes[lid] = LevelNode.parse({ id: lid, parentId: buildingId, level: index, children, ...(level.height ? { height: level.height } : {}) })
  })

  nodes[buildingId] = BuildingNode.parse({ id: buildingId, parentId: siteId, children: def.levels.map(levelNodeId) })
  nodes[siteId] = SiteNode.parse({
    id: siteId,
    parentId: null,
    children: [buildingId],
    polygon: { type: 'polygon', points: [[-15, -15], [15, -15], [15, 15], [-15, 15]] },
  })

  return { nodes, rootNodeIds: [siteId], collections: {}, materials: {}, installedPlugins: [] } as SceneGraph
}
```

Run: `pnpm --filter @interiores/web exec vitest run scene-builder template-validate template-geometry`
Expected: PASS (11 + 11 + 4). Si Pascal rechaza algún campo (por ejemplo, el tipo de `rotation` de la escalera), leer el mensaje de Zod, abrir `node_modules/@pascal-app/core/dist/schema/nodes/<nodo>.d.ts`, corregir el constructor y anotarlo en `docs/pascal-notes.md`.

- [ ] **Paso 7: Verificar y commit**

Run: `pnpm verify`
Expected: PASS.

```bash
git add -A
git commit -m "feat(tienda): definiciones multinivel con materiales, validador y constructor de escenas con los esquemas reales de Pascal"
git push -q
```

---

### Task 4: Las 4 plantillas de showroom, sus archivos y miniaturas

**Responsable sugerido:** Silvert. Revisa: Victoria.

**Files:**
- Create: `apps/web/src/lib/templates/definitions/{concept-store,cafe,supermercado,loft}.ts`
- Create: `apps/web/src/lib/templates/{index,thumbnail}.ts`
- Create: `apps/web/scripts/build-templates.ts`
- Create: `apps/web/test/{template-definitions,template-thumbnail,template-files}.test.ts`, `apps/web/test/support/asset-ids.ts`
- Create (generados): `apps/web/public/templates/<id>.json` y `<id>.svg`
- Modify: `apps/web/package.json`

**Interfaces:**
- Consumes: `perimeter`, `row`, `grid`, `validateDefinition`, `buildScene`, `MATERIAL_IDS`, `localizeCatalogItem`, `kenneyAssets`.
- Produces: `TEMPLATE_DEFINITIONS: readonly TemplateDefinition[]` (ids `concept-store`, `cafe`, `supermercado`, `loft`); `TEMPLATES: TemplateInfo[]` con `{ id, kind, name, summary, areaM2, thumbnail: '/templates/<id>.svg', file: '/templates/<id>.json' }`; `templatesForKind(kind)`, `templateById(id)`; `renderTemplateThumbnail(def): string` (SVG).

- [ ] **Paso 1: Ayuda de pruebas: ids de piezas disponibles**

Create `apps/web/test/support/asset-ids.ts`:

```ts
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import kenney from '../../src/editor/kenney-pieces.json' with { type: 'json' }
import manifest from '../../src/editor/local-items.json' with { type: 'json' }

const source = readFileSync(
  fileURLToPath(new URL('../../node_modules/@pascal-app/editor/src/components/ui/item-catalog/catalog-items.tsx', import.meta.url)),
  'utf8',
)

/** Ids de piezas que una plantilla puede usar: el catálogo oficial con modelo local más las de Kenney. */
export function availableAssetIds(): Set<string> {
  const ids = new Set<string>(kenney.map((k) => k.id))
  for (const block of source.split('\n  {\n')) {
    const id = /\bid: '([^']+)'/.exec(block)?.[1]
    const folder = /items\/system\/([^/']+)\/model\.glb/.exec(block)?.[1]
    if (id && folder && (manifest as Record<string, string[]>)[folder]?.includes('model.glb')) ids.add(id)
  }
  return ids
}
```

- [ ] **Paso 2: Pruebas de las definiciones y de la miniatura (rojo)**

Create `apps/web/test/template-definitions.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { MATERIAL_IDS } from '../src/editor/templates/scene-builder'
import { TEMPLATES, TEMPLATE_DEFINITIONS, templateById, templatesForKind } from '../src/lib/templates'
import type { TemplateDefinition } from '../src/lib/templates/types'
import { validateDefinition } from '../src/lib/templates/validate'
import { availableAssetIds } from './support/asset-ids'

const assets = availableAssetIds()
const materialsOf = (d: TemplateDefinition) =>
  new Set(
    d.levels.flatMap((l) => [
      l.wallInside,
      l.wallOutside,
      ...l.walls.flatMap((w) => [w.inside, w.outside]),
      ...l.rooms.flatMap((r) => [r.floor, r.ceiling]),
    ]).filter(Boolean),
  )

describe('definiciones de plantilla', () => {
  it('hay cuatro: concept store, café, supermercado y loft', () => {
    expect(TEMPLATE_DEFINITIONS.map((d) => d.id)).toEqual(['concept-store', 'cafe', 'supermercado', 'loft'])
  })

  it.each(TEMPLATE_DEFINITIONS.map((d) => [d.id, d] as const))('%s es válida (muros cerrados, aberturas, piezas y materiales)', (_id, def) => {
    expect(validateDefinition(def, assets, MATERIAL_IDS)).toEqual([])
  })

  it.each(TEMPLATE_DEFINITIONS.map((d) => [d.id, d] as const))('%s muestra potencial: 3+ ambientes, 20+ piezas y 5+ materiales distintos', (_id, def) => {
    expect(def.levels.flatMap((l) => l.rooms).length).toBeGreaterThanOrEqual(3)
    expect(def.levels.flatMap((l) => l.items).length).toBeGreaterThanOrEqual(20)
    expect(materialsOf(def).size).toBeGreaterThanOrEqual(5)
  })

  it('al menos dos plantillas tienen 2 niveles con escalera', () => {
    const multi = TEMPLATE_DEFINITIONS.filter((d) => d.levels.length >= 2 && d.levels.some((l) => (l.stairs ?? []).length > 0))
    expect(multi.map((d) => d.id)).toEqual(['concept-store', 'loft'])
  })

  it('los metadatos salen de la definición y se filtran por tipo', () => {
    expect(templatesForKind('comercio').map((t) => t.id)).toEqual(['concept-store', 'cafe', 'supermercado'])
    expect(templatesForKind('vivienda').map((t) => t.id)).toEqual(['loft'])
    expect(templateById('cafe')?.file).toBe('/templates/cafe.json')
    expect(templateById('cafe')?.thumbnail).toBe('/templates/cafe.svg')
    expect(templateById('no-existe')).toBeUndefined()
    expect(TEMPLATES.every((t) => t.areaM2 >= 80)).toBe(true)
  })
})
```

Create `apps/web/test/template-thumbnail.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { TEMPLATE_DEFINITIONS } from '../src/lib/templates'
import { renderTemplateThumbnail } from '../src/lib/templates/thumbnail'

describe('renderTemplateThumbnail', () => {
  const def = TEMPLATE_DEFINITIONS[0]!
  const svg = renderTemplateThumbnail(def)
  const ground = def.levels[0]!

  it('es un SVG con viewBox y un trazo por muro de la planta baja', () => {
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg).toContain('viewBox="0 0 240 160"')
    expect(svg.match(/<line /g)?.length).toBeGreaterThanOrEqual(ground.walls.length)
  })

  it('dibuja un rectángulo por ambiente de la planta baja y marca con línea punteada los niveles de arriba', () => {
    expect(svg.match(/<rect /g)?.length).toBeGreaterThanOrEqual(ground.rooms.length)
    expect(def.levels.length).toBeGreaterThan(1)
    expect(svg).toContain('stroke-dasharray')
  })

  it('es determinista', () => {
    expect(renderTemplateThumbnail(def)).toBe(svg)
  })
})
```

Run: `pnpm --filter @interiores/web exec vitest run template-definitions template-thumbnail`
Expected: FAIL — `Failed to resolve import "../src/lib/templates"`. Pegar en el PR.

- [ ] **Paso 3: Definiciones**

Las cuatro definiciones son datos. Orientación: el eje **x** crece a la derecha y **z** hacia abajo (el frente del local es el muro `-s`, abajo). Los materiales son ids de la biblioteca de Pascal; las posiciones se afinan en la revisión visual del Paso 7 de la Tarea 5.

Create `apps/web/src/lib/templates/definitions/concept-store.ts`:

```ts
import { grid, perimeter, row } from '../geometry'
import type { TemplateDefinition } from '../types'

const Q = Math.PI / 2

/** Concept store de 14 × 8 m con entrepiso: parquet, ladrillo, terrazo y concreto pulido. */
export const conceptStore: TemplateDefinition = {
  id: 'concept-store',
  kind: 'comercio',
  name: 'Concept store de 2 niveles',
  summary: 'Salón de ventas con doble vidriera y barra de café; entrepiso de showroom y oficina con escalera.',
  levels: [
    {
      id: 'pb',
      height: 3.4,
      wallInside: 'concrete-plaster',
      wallOutside: 'flooring-agedbrick',
      trim: true,
      walls: [
        ...perimeter('p', 0, 0, 14, 8).map((w) => (w.id === 'p-n' ? { ...w, inside: 'flooring-rusticbrick' } : w)),
        { id: 'div', from: [9.5, 0], to: [9.5, 8] },
        { id: 'div-barra', from: [9.5, 4], to: [14, 4] },
        { id: 'div-bano', from: [9.5, 6], to: [14, 6] },
      ],
      rooms: [
        { id: 'salon', name: 'Salón de ventas', color: '#1F5FE0', rect: [0, 0, 9.5, 8], floor: 'wood-hungarianparquet10', ceiling: 'concrete-plaster' },
        { id: 'barra', name: 'Barra de café', color: '#B97A00', rect: [9.5, 0, 14, 4], floor: 'flooring-terrazzo19', ceiling: 'concrete-plaster' },
        { id: 'deposito', name: 'Depósito', color: '#7A8AA8', rect: [9.5, 4, 14, 6], floor: 'concrete-polished', ceiling: 'concrete-drywall' },
        { id: 'bano', name: 'Baño', color: '#1FA971', rect: [9.5, 6, 14, 8], floor: 'flooring-tile85a', ceiling: 'concrete-drywall' },
      ],
      openings: [
        { id: 'puerta-entrada', type: 'door', wall: 'p-s', at: 2.2, width: 1.6, height: 2.4 },
        { id: 'vidriera-1', type: 'window', wall: 'p-s', at: 5.1, width: 2.4, height: 2.4, sill: 0.3 },
        { id: 'vidriera-2', type: 'window', wall: 'p-s', at: 8.0, width: 2.0, height: 2.4, sill: 0.3 },
        { id: 'ventana-oeste', type: 'window', wall: 'p-w', at: 4, width: 2.4, height: 2, sill: 0.6 },
        { id: 'ventana-barra', type: 'window', wall: 'p-n', at: 11.7, width: 1.6 },
        { id: 'paso-barra', type: 'door', wall: 'div', at: 2, width: 1.2 },
        { id: 'puerta-deposito', type: 'door', wall: 'div', at: 5, width: 0.9 },
        { id: 'puerta-bano', type: 'door', wall: 'div', at: 7, width: 0.8 },
      ],
      items: [
        ...row('kenney-shelf-boxes', [1.4, 0.55], [7.8, 0.55], 5),
        ...grid('coat-rack', [2.4, 2.6], 3, 2, [2.0, 1.4]),
        { asset: 'rectangular-carpet', at: [4.4, 3.3] },
        ...row('kitchen-counter', [8.7, 1.6], [8.7, 3.6], 2, { rotY: Q }),
        { asset: 'kenney-cash-register', at: [8.7, 1.6], y: 0.78, rotY: -Q },
        { asset: 'coffee-machine', at: [8.7, 3.6], y: 0.78 },
        ...row('stool', [7.9, 1.4], [7.9, 3.8], 3),
        { asset: 'sofa', at: [2.2, 7.0], rotY: Math.PI },
        { asset: 'coffee-table', at: [2.2, 5.9] },
        { asset: 'indoor-plant', at: [0.5, 7.4] },
        { asset: 'indoor-plant', at: [9.0, 7.4] },
        { asset: 'floor-lamp', at: [0.5, 5.0] },
        ...row('kitchen-counter', [11.0, 0.7], [13.0, 0.7], 2),
        { asset: 'coffee-machine', at: [11.0, 0.7], y: 0.78 },
        { asset: 'fridge', at: [13.4, 2.4], rotY: -Q },
        ...row('stool', [11.0, 2.2], [12.0, 2.2], 2),
        ...row('kenney-shelf-boxes', [10.6, 4.8], [13.2, 4.8], 3),
        { asset: 'kenney-shelf-bags', at: [13.2, 5.5] },
        { asset: 'toilet', at: [13.4, 7.4] },
        { asset: 'bathroom-sink', at: [10.6, 7.4] },
      ],
      stairs: [{ id: 'escalera', at: [5.5, 6.9], rotY: 0, width: 1.1, steps: 14, to: 'alta', rail: 'both' }],
    },
    {
      id: 'alta',
      height: 2.8,
      wallInside: 'preset-cream',
      wallOutside: 'flooring-agedbrick',
      trim: true,
      walls: [
        { id: 'a-n', from: [9.5, 0], to: [14, 0] },
        { id: 'a-e', from: [14, 0], to: [14, 8] },
        { id: 'a-s', from: [9.5, 8], to: [14, 8] },
        { id: 'baranda', from: [9.5, 0], to: [9.5, 5.6], height: 1.05 },
      ],
      rooms: [
        { id: 'showroom', name: 'Showroom y oficina', color: '#7A8AA8', rect: [9.5, 0, 14, 8], floor: 'wood-woodfine22', ceiling: 'concrete-plaster', open: ['w'] },
      ],
      openings: [
        { id: 'ventana-norte', type: 'window', wall: 'a-n', at: 2.2, width: 1.4 },
        { id: 'ventana-este', type: 'window', wall: 'a-e', at: 3.5, width: 2.6 },
        { id: 'ventana-sur', type: 'window', wall: 'a-s', at: 2.2, width: 1.4 },
      ],
      items: [
        { asset: 'sofa', at: [11.6, 1.2] },
        { asset: 'coffee-table', at: [11.6, 2.4] },
        { asset: 'rectangular-carpet', at: [11.6, 2.2] },
        ...row('coat-rack', [10.4, 3.8], [13.4, 3.8], 4),
        { asset: 'office-table', at: [12.9, 6.9] },
        { asset: 'office-chair', at: [12.9, 6.1], rotY: Math.PI },
        { asset: 'computer', at: [12.9, 6.9], y: 0.78 },
        { asset: 'dresser', at: [13.6, 5.0], rotY: -Q },
        { asset: 'indoor-plant', at: [10.2, 7.4] },
        { asset: 'floor-lamp', at: [10.2, 0.6] },
      ],
    },
  ],
}
```

Create `apps/web/src/lib/templates/definitions/cafe.ts`:

```ts
import { grid, perimeter, row } from '../geometry'
import type { ItemDef, TemplateDefinition } from '../types'

const Q = Math.PI / 2

const interiorTables = grid('dining-table', [1.6, 2.0], 2, 3, [2.4, 2.6])
const terraceTables = grid('dining-table', [2.0, 10.4], 3, 2, [3.6, 1.9])
const chairsAround = (tables: ItemDef[], dx: number): ItemDef[] =>
  tables.flatMap((t) => [
    { asset: 'dining-chair', at: [t.at[0] - dx, t.at[1]] as [number, number], rotY: Q },
    { asset: 'dining-chair', at: [t.at[0] + dx, t.at[1]] as [number, number], rotY: -Q },
  ])

/** Café de especialidad de 12 × 9 m con terraza de 12 × 4 m: madera, ladrillo, azulejo y piedra. */
export const cafe: TemplateDefinition = {
  id: 'cafe',
  kind: 'comercio',
  name: 'Café de especialidad con terraza',
  summary: 'Salón de madera con barra y mesas, cocina y baño con azulejo, depósito y terraza con sombrillas.',
  levels: [
    {
      id: 'pb',
      height: 3.2,
      wallInside: 'preset-cream',
      wallOutside: 'concrete-stucco',
      trim: true,
      walls: [
        ...perimeter('p', 0, 0, 12, 9).map((w) => (w.id === 'p-w' ? { ...w, inside: 'flooring-rusticbrick' } : w)),
        { id: 'div', from: [8, 0], to: [8, 9] },
        { id: 'div-bano', from: [8, 4], to: [12, 4] },
        { id: 'div-dep', from: [8, 6.5], to: [12, 6.5] },
        { id: 't-w', from: [0, 9], to: [0, 13], height: 1.1, inside: 'preset-sage', outside: 'preset-sage' },
        { id: 't-e', from: [12, 9], to: [12, 13], height: 1.1, inside: 'preset-sage', outside: 'preset-sage' },
        { id: 't-s', from: [0, 13], to: [12, 13], height: 1.1, inside: 'preset-sage', outside: 'preset-sage' },
      ],
      rooms: [
        { id: 'salon', name: 'Salón', color: '#1F5FE0', rect: [0, 0, 8, 9], floor: 'wood-woodfine22', ceiling: 'concrete-plaster' },
        { id: 'cocina', name: 'Cocina', color: '#B97A00', rect: [8, 0, 12, 4], floor: 'flooring-tile85a', ceiling: 'concrete-drywall' },
        { id: 'bano', name: 'Baño', color: '#1FA971', rect: [8, 4, 12, 6.5], floor: 'flooring-tile85a', ceiling: 'concrete-drywall' },
        { id: 'deposito', name: 'Depósito', color: '#7A8AA8', rect: [8, 6.5, 12, 9], floor: 'concrete-polished', ceiling: 'concrete-drywall' },
        { id: 'terraza', name: 'Terraza', color: '#1FA971', rect: [0, 9, 12, 13], floor: 'flooring-wallstone1', ceiling: null },
      ],
      openings: [
        { id: 'puerta-salon', type: 'door', wall: 'p-s', at: 3, width: 1.6, height: 2.2 },
        { id: 'vidriera', type: 'window', wall: 'p-s', at: 5.6, width: 3, height: 2.2, sill: 0.4 },
        { id: 'acceso', type: 'door', wall: 't-w', at: 2, width: 1.4 },
        { id: 'ventana-oeste', type: 'window', wall: 'p-w', at: 4.5, width: 2.2 },
        { id: 'ventana-norte', type: 'window', wall: 'p-n', at: 3.5, width: 2.6 },
        { id: 'puerta-cocina', type: 'door', wall: 'div', at: 2, width: 1 },
        { id: 'puerta-bano', type: 'door', wall: 'div', at: 5.2, width: 0.8 },
        { id: 'puerta-deposito', type: 'door', wall: 'div', at: 7.7, width: 0.8 },
      ],
      items: [
        ...row('kitchen-counter', [6.9, 1.3], [6.9, 5.3], 3, { rotY: Q }),
        { asset: 'coffee-machine', at: [6.9, 1.3], y: 0.78 },
        { asset: 'coffee-machine', at: [6.9, 3.3], y: 0.78 },
        { asset: 'kenney-cash-register', at: [6.9, 5.3], y: 0.78, rotY: -Q },
        { asset: 'kenney-display-bread', at: [6.9, 4.3], y: 0.78 },
        ...row('stool', [5.9, 1.3], [5.9, 5.3], 5),
        ...interiorTables,
        ...chairsAround(interiorTables, 0.8),
        ...row('kenney-shelf-boxes', [1.2, 0.55], [2.4, 0.55], 2),
        { asset: 'indoor-plant', at: [0.5, 8.4] },
        { asset: 'indoor-plant', at: [7.4, 8.4] },
        { asset: 'floor-lamp', at: [0.5, 6.4] },
        { asset: 'kitchen', at: [10.0, 0.8] },
        { asset: 'stove', at: [11.4, 0.7] },
        { asset: 'fridge', at: [11.5, 3.4], rotY: -Q },
        { asset: 'kitchen-counter', at: [9.2, 2.6], rotY: Q },
        { asset: 'toilet', at: [11.5, 5.7] },
        { asset: 'bathroom-sink', at: [9.0, 5.7] },
        ...row('kenney-shelf-boxes', [9.0, 7.2], [11.4, 7.2], 3),
        { asset: 'kenney-shelf-bags', at: [11.4, 8.4] },
        ...terraceTables,
        ...chairsAround(terraceTables, 0.8),
        { asset: 'patio-umbrella', at: [2.0, 10.4] },
        { asset: 'patio-umbrella', at: [9.2, 10.4] },
        ...row('indoor-plant', [0.6, 12.4], [11.4, 12.4], 6),
        { asset: 'palm', at: [0.8, 9.8] },
        { asset: 'palm', at: [11.2, 9.8] },
      ],
    },
  ],
}
```

Create `apps/web/src/lib/templates/definitions/supermercado.ts`:

```ts
import { perimeter, row } from '../geometry'
import type { TemplateDefinition } from '../types'

const Q = Math.PI / 2
const aisle = (z: number) => [
  ...row('kenney-shelf-boxes', [1.6, z], [9.6, z], 5),
  ...row('kenney-shelf-bags', [1.6, z + 0.45], [9.6, z + 0.45], 5, { rotY: Math.PI }),
]

/** Supermercado de barrio de 18 × 11 m: concreto pulido, góndolas en pasillos, cajas, panadería y depósito. */
export const supermercado: TemplateDefinition = {
  id: 'supermercado',
  kind: 'comercio',
  name: 'Supermercado de barrio',
  summary: 'Salón con freezers, góndolas en pasillos y tres cajas; panadería, depósito con portón, oficina y baños.',
  levels: [
    {
      id: 'pb',
      height: 3.6,
      wallInside: 'concrete-plaster',
      wallOutside: 'concrete-stucco',
      trim: true,
      walls: [
        ...perimeter('p', 0, 0, 18, 11),
        { id: 'div', from: [13, 0], to: [13, 11] },
        { id: 'div-pan', from: [13, 4.5], to: [18, 4.5] },
        { id: 'div-dep', from: [13, 8], to: [18, 8] },
        { id: 'div-ofi', from: [15.5, 8], to: [15.5, 11] },
      ],
      rooms: [
        { id: 'salon', name: 'Salón de ventas', color: '#1F5FE0', rect: [0, 0, 13, 11], floor: 'concrete-polished', ceiling: 'concrete-raw' },
        { id: 'panaderia', name: 'Panadería', color: '#B97A00', rect: [13, 0, 18, 4.5], floor: 'flooring-tile85a', ceiling: 'concrete-drywall' },
        { id: 'deposito', name: 'Depósito', color: '#7A8AA8', rect: [13, 4.5, 18, 8], floor: 'concrete-polished', ceiling: 'concrete-raw' },
        { id: 'oficina', name: 'Oficina', color: '#1FA971', rect: [13, 8, 15.5, 11], floor: 'wood-woodfine22', ceiling: 'concrete-plaster' },
        { id: 'banos', name: 'Baños', color: '#1FA971', rect: [15.5, 8, 18, 11], floor: 'flooring-tile85a', ceiling: 'concrete-drywall' },
      ],
      openings: [
        { id: 'puerta-doble', type: 'door', wall: 'p-s', at: 3, width: 2.4, height: 2.4 },
        { id: 'vidriera', type: 'window', wall: 'p-s', at: 8.5, width: 5, height: 2.4, sill: 0.3 },
        { id: 'ventana-oeste', type: 'window', wall: 'p-w', at: 5.5, width: 3 },
        { id: 'porton', type: 'door', wall: 'p-e', at: 6.2, width: 2.2, height: 2.6 },
        { id: 'puerta-panaderia', type: 'door', wall: 'div', at: 2.2, width: 1.2 },
        { id: 'puerta-deposito', type: 'door', wall: 'div', at: 6.2, width: 1.8, height: 2.4 },
        { id: 'puerta-oficina', type: 'door', wall: 'div', at: 9.5, width: 0.9 },
        { id: 'puerta-banos', type: 'door', wall: 'div-dep', at: 3.7, width: 0.8 },
      ],
      items: [
        ...row('kenney-freezers-standing', [1.0, 0.6], [7.0, 0.6], 6),
        ...row('kenney-freezer', [8.4, 0.7], [11.6, 0.7], 3),
        ...aisle(3.0),
        ...aisle(5.0),
        ...aisle(7.0),
        ...row('kenney-display-fruit', [10.6, 3.0], [10.6, 6.0], 3),
        { asset: 'kenney-display-bread', at: [12.2, 3.0] },
        ...[2.0, 4.2, 6.4].flatMap((x) => [
          { asset: 'kitchen-counter', at: [x, 9.4] as [number, number] },
          { asset: 'kenney-cash-register', at: [x, 9.4] as [number, number], y: 0.78 },
          { asset: 'kenney-shopping-basket', at: [x + 0.95, 9.6] as [number, number] },
        ]),
        ...row('kenney-shopping-cart', [9.0, 10.2], [11.4, 10.2], 3),
        { asset: 'kenney-bottle-return', at: [0.6, 10.2] },
        ...row('kitchen-counter', [14.2, 0.8], [16.2, 0.8], 2),
        { asset: 'kenney-display-bread', at: [14.2, 0.8], y: 0.78 },
        { asset: 'kenney-display-bread', at: [16.2, 0.8], y: 0.78 },
        { asset: 'stove', at: [17.4, 3.0], rotY: -Q },
        { asset: 'fridge', at: [14.0, 3.8] },
        ...row('kenney-shelf-boxes', [14.0, 5.0], [17.0, 5.0], 4),
        ...row('kenney-shelf-bags', [14.0, 7.2], [17.0, 7.2], 4),
        { asset: 'office-table', at: [14.2, 10.1] },
        { asset: 'office-chair', at: [14.2, 9.3], rotY: Math.PI },
        { asset: 'computer', at: [14.2, 10.1], y: 0.78 },
        { asset: 'toilet', at: [17.3, 9.2] },
        { asset: 'bathroom-sink', at: [16.0, 10.4] },
      ],
    },
  ],
}
```

Create `apps/web/src/lib/templates/definitions/loft.ts`:

```ts
import { perimeter, row } from '../geometry'
import type { TemplateDefinition } from '../types'

const Q = Math.PI / 2

/** Loft de doble altura de 12 × 7 m: concreto pulido, ladrillo expuesto y dormitorio en el entrepiso. */
export const loft: TemplateDefinition = {
  id: 'loft',
  kind: 'vivienda',
  name: 'Loft de doble altura',
  summary: 'Cocina con isla, comedor y estar sobre concreto pulido; baño, estudio y dormitorio en el entrepiso.',
  levels: [
    {
      id: 'pb',
      height: 3.6,
      wallInside: 'concrete-plaster',
      wallOutside: 'flooring-agedbrick',
      trim: true,
      walls: [
        ...perimeter('p', 0, 0, 12, 7).map((w) => (w.id === 'p-w' ? { ...w, inside: 'flooring-rusticbrick' } : w.id === 'p-n' ? { ...w, inside: 'preset-charcoal' } : w)),
        { id: 'div', from: [8.5, 0], to: [8.5, 7] },
        { id: 'div-bano', from: [8.5, 3], to: [12, 3] },
      ],
      rooms: [
        { id: 'salon', name: 'Cocina, comedor y estar', color: '#1F5FE0', rect: [0, 0, 8.5, 7], floor: 'concrete-polished', ceiling: 'concrete-raw' },
        { id: 'bano', name: 'Baño', color: '#1FA971', rect: [8.5, 0, 12, 3], floor: 'flooring-tile85a', ceiling: 'concrete-drywall' },
        { id: 'estudio', name: 'Estudio', color: '#7A8AA8', rect: [8.5, 3, 12, 7], floor: 'wood-woodfine22', ceiling: 'concrete-plaster' },
      ],
      openings: [
        { id: 'puerta-entrada', type: 'door', wall: 'p-s', at: 1.5, width: 1 },
        { id: 'ventanal', type: 'window', wall: 'p-s', at: 5, width: 3.6, height: 2.4, sill: 0.3 },
        { id: 'ventana-oeste', type: 'window', wall: 'p-w', at: 3.5, width: 2 },
        { id: 'ventana-norte', type: 'window', wall: 'p-n', at: 3, width: 2.2 },
        { id: 'ventana-estudio', type: 'window', wall: 'p-e', at: 5, width: 1.6 },
        { id: 'ventana-bano', type: 'window', wall: 'p-e', at: 1.5, width: 0.7, height: 0.6, sill: 1.5 },
        { id: 'puerta-bano', type: 'door', wall: 'div', at: 1.5, width: 0.8 },
        { id: 'puerta-estudio', type: 'door', wall: 'div', at: 5, width: 0.9 },
      ],
      items: [
        { asset: 'fridge', at: [0.7, 0.7] },
        { asset: 'kitchen', at: [2.2, 0.7] },
        { asset: 'stove', at: [3.7, 0.7] },
        { asset: 'hood', at: [3.7, 0.7], y: 1.9 },
        ...row('kitchen-counter', [3.6, 2.6], [5.6, 2.6], 2),
        ...row('stool', [3.4, 3.5], [5.8, 3.5], 3),
        { asset: 'dining-table', at: [2.4, 5.0] },
        { asset: 'dining-chair', at: [1.5, 5.0], rotY: Q },
        { asset: 'dining-chair', at: [3.3, 5.0], rotY: -Q },
        { asset: 'dining-chair', at: [2.4, 4.2] },
        { asset: 'dining-chair', at: [2.4, 5.8], rotY: Math.PI },
        { asset: 'sofa', at: [7.6, 2.4], rotY: -Q },
        { asset: 'coffee-table', at: [6.3, 2.4] },
        { asset: 'rectangular-carpet', at: [6.5, 2.4] },
        { asset: 'tv-stand', at: [4.7, 2.4], rotY: Q },
        { asset: 'bookshelf', at: [8.0, 0.6] },
        { asset: 'floor-lamp', at: [8.0, 4.4] },
        { asset: 'indoor-plant', at: [0.5, 6.4] },
        { asset: 'bathtub', at: [11.0, 0.9] },
        { asset: 'toilet', at: [9.1, 1.0] },
        { asset: 'bathroom-sink', at: [9.6, 2.6] },
        { asset: 'office-table', at: [10.6, 6.2] },
        { asset: 'office-chair', at: [10.6, 5.5], rotY: Math.PI },
        { asset: 'computer', at: [10.6, 6.2], y: 0.78 },
        { asset: 'bookshelf', at: [11.6, 3.6], rotY: -Q },
        { asset: 'indoor-plant', at: [9.0, 6.5] },
        { asset: 'rectangular-carpet', at: [10.3, 4.6] },
      ],
      stairs: [{ id: 'escalera', at: [4.6, 6.2], rotY: 0, width: 1.1, steps: 14, to: 'alta', rail: 'both' }],
    },
    {
      id: 'alta',
      height: 2.8,
      wallInside: 'preset-cream',
      wallOutside: 'flooring-agedbrick',
      trim: true,
      walls: [
        { id: 'a-n', from: [8.5, 0], to: [12, 0] },
        { id: 'a-e', from: [12, 0], to: [12, 7] },
        { id: 'a-s', from: [8.5, 7], to: [12, 7] },
        { id: 'baranda', from: [8.5, 0], to: [8.5, 5], height: 1.05 },
      ],
      rooms: [
        { id: 'dormitorio', name: 'Dormitorio', color: '#7A8AA8', rect: [8.5, 0, 12, 7], floor: 'wood-hungarianparquet10', ceiling: 'concrete-plaster', open: ['w'] },
      ],
      openings: [
        { id: 'ventana-norte', type: 'window', wall: 'a-n', at: 1.7, width: 1.4 },
        { id: 'ventana-este', type: 'window', wall: 'a-e', at: 3.5, width: 2.2 },
      ],
      items: [
        { asset: 'double-bed', at: [10.6, 2.8] },
        { asset: 'bedside-table', at: [9.2, 0.8] },
        { asset: 'bedside-table', at: [11.9, 0.8] },
        { asset: 'closet', at: [11.7, 5.4], rotY: -Q },
        { asset: 'dresser', at: [9.4, 6.4], rotY: Math.PI },
        { asset: 'rectangular-carpet', at: [10.4, 3.0] },
        { asset: 'floor-lamp', at: [9.0, 4.8] },
        { asset: 'indoor-plant', at: [11.6, 6.5] },
      ],
    },
  ],
}
```

- [ ] **Paso 4: Registro de plantillas y miniaturas**

Create `apps/web/src/lib/templates/index.ts`:

```ts
import { cafe } from './definitions/cafe'
import { conceptStore } from './definitions/concept-store'
import { loft } from './definitions/loft'
import { supermercado } from './definitions/supermercado'
import { definitionArea } from './geometry'
import type { TemplateDefinition } from './types'

export const TEMPLATE_DEFINITIONS: readonly TemplateDefinition[] = [conceptStore, cafe, supermercado, loft]

export type TemplateInfo = {
  id: string
  kind: TemplateDefinition['kind']
  name: string
  summary: string
  areaM2: number
  levels: number
  thumbnail: string
  file: string
}

export const TEMPLATES: TemplateInfo[] = TEMPLATE_DEFINITIONS.map((d) => ({
  id: d.id,
  kind: d.kind,
  name: d.name,
  summary: d.summary,
  areaM2: definitionArea(d),
  levels: d.levels.length,
  thumbnail: `/templates/${d.id}.svg`,
  file: `/templates/${d.id}.json`,
}))

export const templatesForKind = (kind: TemplateDefinition['kind']): TemplateInfo[] => TEMPLATES.filter((t) => t.kind === kind)
export const templateById = (id: string): TemplateInfo | undefined => TEMPLATES.find((t) => t.id === id)
```

Create `apps/web/src/lib/templates/thumbnail.ts`:

```ts
import type { TemplateDefinition } from './types'

const W = 240
const H = 160
const PAD = 12

/** Plano de la planta baja como SVG: ambientes de color, muros oscuros, huecos de puertas y ventanas y piezas. Los niveles de arriba van con línea punteada. */
export function renderTemplateThumbnail(def: TemplateDefinition): string {
  const ground = def.levels[0]!
  const xs = ground.walls.flatMap((w) => [w.from[0], w.to[0]])
  const zs = ground.walls.flatMap((w) => [w.from[1], w.to[1]])
  const minX = Math.min(...xs)
  const minZ = Math.min(...zs)
  const spanX = Math.max(...xs) - minX
  const spanZ = Math.max(...zs) - minZ
  const scale = Math.min((W - 2 * PAD) / spanX, (H - 2 * PAD) / spanZ)
  const offX = (W - spanX * scale) / 2
  const offZ = (H - spanZ * scale) / 2
  const sx = (x: number) => (offX + (x - minX) * scale).toFixed(1)
  const sz = (z: number) => (offZ + (z - minZ) * scale).toFixed(1)
  const dim = (n: number) => (n * scale).toFixed(1)

  const rooms = ground.rooms
    .map((r) => `<rect x="${sx(r.rect[0])}" y="${sz(r.rect[1])}" width="${dim(r.rect[2] - r.rect[0])}" height="${dim(r.rect[3] - r.rect[1])}" fill="${r.color}" fill-opacity="0.18"/>`)
    .join('')
  const upper = def.levels
    .slice(1)
    .flatMap((l) => l.rooms)
    .map((r) => `<rect x="${sx(r.rect[0])}" y="${sz(r.rect[1])}" width="${dim(r.rect[2] - r.rect[0])}" height="${dim(r.rect[3] - r.rect[1])}" fill="none" stroke="#1F5FE0" stroke-width="1.2" stroke-dasharray="4 3"/>`)
    .join('')
  const walls = ground.walls
    .map((w) => `<line x1="${sx(w.from[0])}" y1="${sz(w.from[1])}" x2="${sx(w.to[0])}" y2="${sz(w.to[1])}" stroke="#2B3340" stroke-width="2.5" stroke-linecap="square"/>`)
    .join('')
  const gaps = ground.openings
    .map((o) => {
      const w = ground.walls.find((x) => x.id === o.wall)
      if (!w) return ''
      const len = Math.hypot(w.to[0] - w.from[0], w.to[1] - w.from[1])
      const ux = (w.to[0] - w.from[0]) / len
      const uz = (w.to[1] - w.from[1]) / len
      const a = o.at - o.width / 2
      const b = o.at + o.width / 2
      return `<line x1="${sx(w.from[0] + ux * a)}" y1="${sz(w.from[1] + uz * a)}" x2="${sx(w.from[0] + ux * b)}" y2="${sz(w.from[1] + uz * b)}" stroke="${o.type === 'door' ? '#FFFFFF' : '#7FB2FF'}" stroke-width="3.2"/>`
    })
    .join('')
  const items = ground.items.map((i) => `<circle cx="${sx(i.at[0])}" cy="${sz(i.at[1])}" r="1.6" fill="#1F5FE0"/>`).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#EEF2F8"/>${rooms}${upper}${walls}${gaps}${items}</svg>\n`
}
```

Run: `pnpm --filter @interiores/web exec vitest run template-definitions template-thumbnail`
Expected: PASS. Si una definición falla (pieza fuera de un ambiente, abertura pisada, material inexistente), corregir **la definición** según el mensaje, no el validador.

- [ ] **Paso 5: Script que genera los archivos y prueba de los archivos (rojo → verde)**

Create `apps/web/test/template-files.test.ts`:

```ts
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { SCENE_MAX_BYTES, SceneEnvelopeSchema } from '@interiores/contract'
import { describe, expect, it } from 'vitest'
import { TEMPLATE_DEFINITIONS } from '../src/lib/templates'

const file = (name: string) => fileURLToPath(new URL(`../public/templates/${name}`, import.meta.url))
const publicPath = (p: string) => fileURLToPath(new URL(`../public${p}`, import.meta.url))

describe.each(TEMPLATE_DEFINITIONS.map((d) => [d.id, d] as const))('plantilla %s (archivo generado)', (id, def) => {
  const text = existsSync(file(`${id}.json`)) ? readFileSync(file(`${id}.json`), 'utf8') : ''

  it('existen el JSON y la miniatura', () => {
    expect(text.length, `falta public/templates/${id}.json: corre pnpm --filter @interiores/web templates:build`).toBeGreaterThan(0)
    expect(existsSync(file(`${id}.svg`))).toBe(true)
  })

  it('es un SceneEnvelope válido que cabe en 5 MB', () => {
    const envelope = JSON.parse(text)
    expect(SceneEnvelopeSchema.safeParse(envelope).success).toBe(true)
    expect(text.length).toBeLessThan(SCENE_MAX_BYTES)
  })

  it('tiene los niveles, ambientes, aberturas, piezas y escaleras de su definición', () => {
    const nodes = Object.values(JSON.parse(text).graph.nodes) as { type: string }[]
    const count = (t: string) => nodes.filter((n) => n.type === t).length
    const rooms = def.levels.flatMap((l) => l.rooms)
    const openings = def.levels.flatMap((l) => l.openings)
    expect(count('level')).toBe(def.levels.length)
    expect(count('zone')).toBe(rooms.length)
    expect(count('slab')).toBe(rooms.length)
    expect(count('ceiling')).toBe(rooms.filter((r) => r.ceiling !== null).length)
    expect(count('wall')).toBe(def.levels.flatMap((l) => l.walls).length)
    expect(count('door')).toBe(openings.filter((o) => o.type === 'door').length)
    expect(count('window')).toBe(openings.filter((o) => o.type === 'window').length)
    expect(count('item')).toBe(def.levels.flatMap((l) => l.items).length)
    expect(count('stair')).toBe(def.levels.flatMap((l) => l.stairs ?? []).length)
  })

  it('todas las piezas apuntan a archivos locales que existen', () => {
    const nodes = Object.values(JSON.parse(text).graph.nodes) as { type: string; asset?: { src: string } }[]
    for (const n of nodes.filter((x) => x.type === 'item')) {
      expect(existsSync(publicPath((n.asset as { src: string }).src)), (n.asset as { src: string }).src).toBe(true)
    }
  })
})
```

Run: `pnpm --filter @interiores/web exec vitest run template-files`
Expected: FAIL — `falta public/templates/concept-store.json`. Pegar en el PR.

Create `apps/web/scripts/build-templates.ts`:

```ts
// Genera public/templates/<id>.json (escena de Pascal) y <id>.svg (plano) desde las definiciones.
//   tsx scripts/build-templates.ts           escribe los archivos
//   tsx scripts/build-templates.ts --check   falla si los archivos commiteados no coinciden con las definiciones
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PASCAL_CORE_VERSION, SCHEMA_VERSION } from '@interiores/contract'
import { CATALOG_ITEMS } from '../node_modules/@pascal-app/editor/src/components/ui/item-catalog/catalog-items'
import manifest from '../src/editor/local-items.json' with { type: 'json' }
import { kenneyAssets } from '../src/editor/commerce-catalog'
import { localizeCatalogItem } from '../src/editor/catalog'
import { type AssetLike, buildScene } from '../src/editor/templates/scene-builder'
import { TEMPLATE_DEFINITIONS } from '../src/lib/templates'
import { renderTemplateThumbnail } from '../src/lib/templates/thumbnail'

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public/templates')
const check = process.argv.includes('--check')

const assets = new Map<string, AssetLike>()
for (const item of CATALOG_ITEMS) {
  const local = localizeCatalogItem(item as never, manifest as Record<string, string[]>) as AssetLike | null
  if (local) assets.set(local.id, local)
}
for (const k of kenneyAssets()) assets.set(k.id, k)

const stale: string[] = []
mkdirSync(outDir, { recursive: true })
for (const def of TEMPLATE_DEFINITIONS) {
  const envelope = { schemaVersion: SCHEMA_VERSION, pascal: { core: PASCAL_CORE_VERSION }, graph: buildScene(def, assets) }
  const files: [string, string][] = [
    [`${def.id}.json`, `${JSON.stringify(envelope, null, 1)}\n`],
    [`${def.id}.svg`, renderTemplateThumbnail(def)],
  ]
  for (const [name, content] of files) {
    const path = join(outDir, name)
    if (check) {
      if (!existsSync(path) || readFileSync(path, 'utf8') !== content) stale.push(name)
    } else {
      writeFileSync(path, content)
    }
  }
}

if (check) {
  if (stale.length > 0) {
    console.error(`Plantillas desactualizadas: ${stale.join(', ')}. Ejecuta: pnpm --filter @interiores/web templates:build`)
    process.exit(1)
  }
  console.log('Plantillas al día.')
} else {
  console.log(`Listo: ${TEMPLATE_DEFINITIONS.length} plantillas en public/templates/`)
}
```

Modify `apps/web/package.json`: en `scripts` agregar `"templates:build": "tsx scripts/build-templates.ts"` y cambiar `test` a:

```json
    "test": "vitest run && tsx scripts/build-templates.ts --check",
```

Run: `pnpm --filter @interiores/web templates:build`
Expected: `Listo: 4 plantillas en public/templates/`.

Run: `pnpm --filter @interiores/web exec vitest run template-files`
Expected: PASS (4 plantillas × 4 pruebas).

- [ ] **Paso 6: Verificar y commit**

Run: `pnpm verify`
Expected: PASS (incluye `Plantillas al día.`).

```bash
git add -A
git commit -m "feat(tienda): cuatro plantillas de showroom (concept store, café con terraza, supermercado y loft) con materiales, niveles y escalera"
git push -q
```

---

### Task 5: Crear un proyecto desde una plantilla

**Responsable sugerido:** Victoria. Revisa: Silvert.

**Files:**
- Create: `apps/web/src/lib/templates/create-from-template.ts`, `apps/web/src/components/TemplatePicker.tsx`
- Create: `apps/web/test/create-from-template.test.ts`, `apps/web/e2e/templates.spec.ts`
- Modify: `apps/web/app/proyectos/page.tsx`, `apps/web/src/editor/e2e-hooks.ts`

**Interfaces:**
- Consumes: `templateById`, `SceneEnvelopeSchema`, `SCENE_MAX_BYTES`, `ApiClient.createProject/saveScene`.
- Produces:
  - `class TemplateError extends Error`
  - `type CreateFromTemplateResult = { project: ProjectCreated; envelope: SceneEnvelope | null; saved: boolean; error?: unknown }`
  - `createFromTemplate(api: Pick<ApiClient, 'createProject' | 'saveScene'>, input: { name: string; kind: ProjectKind; templateId: string | null }, fetchImpl?: typeof fetch): Promise<CreateFromTemplateResult>`
  - `retrySaveTemplate(api: Pick<ApiClient, 'saveScene'>, result: CreateFromTemplateResult): Promise<CreateFromTemplateResult>`
  - `normalizeProjectName(raw: string): string | null` (recorta; `null` si queda vacío)
  - `window.__e2e.counts(): Record<string, number>` (solo con `NEXT_PUBLIC_E2E=1`)

- [ ] **Paso 1: Pruebas de `createFromTemplate` (rojo)**

Create `apps/web/test/create-from-template.test.ts`:

```ts
import { emptyEnvelope } from '@interiores/contract'
import { describe, expect, it, vi } from 'vitest'
import {
  TemplateError,
  createFromTemplate,
  normalizeProjectName,
  retrySaveTemplate,
} from '../src/lib/templates/create-from-template'

const ID = '0b0e8d9c-6a40-4d6e-9a3c-1f2f6a0f1b11'
const created = { id: ID, name: 'Mi tienda', kind: 'comercio' as const, version: 1 as const }
const envelope = { ...emptyEnvelope(), graph: { nodes: { a: { type: 'wall' } }, rootNodeIds: ['a'] } }

const okFetch = () => vi.fn(async () => new Response(JSON.stringify(envelope), { status: 200 })) as unknown as typeof fetch

function fakeApi(overrides: { saveScene?: ReturnType<typeof vi.fn> } = {}) {
  return {
    createProject: vi.fn(async () => created),
    saveScene: overrides.saveScene ?? vi.fn(async () => ({ version: 2 })),
  }
}

describe('createFromTemplate', () => {
  it('pide la plantilla ANTES de crear el proyecto y guarda su escena con la versión 1', async () => {
    const order: string[] = []
    const api = fakeApi()
    api.createProject.mockImplementation(async () => {
      order.push('crear')
      return created
    })
    const fetchImpl = vi.fn(async () => {
      order.push('pedir')
      return new Response(JSON.stringify(envelope), { status: 200 })
    }) as unknown as typeof fetch
    const result = await createFromTemplate(api, { name: 'Mi tienda', kind: 'comercio', templateId: 'concept-store' }, fetchImpl)
    expect(order).toEqual(['pedir', 'crear'])
    expect(api.saveScene).toHaveBeenCalledWith(ID, envelope, 1)
    expect(result).toMatchObject({ project: created, saved: true })
  })

  it('sin plantilla (en blanco) no pide archivos ni guarda escena', async () => {
    const api = fakeApi()
    const fetchImpl = vi.fn() as unknown as typeof fetch
    const result = await createFromTemplate(api, { name: 'En blanco', kind: 'vivienda', templateId: null }, fetchImpl)
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(api.saveScene).not.toHaveBeenCalled()
    expect(result).toMatchObject({ saved: true, envelope: null })
  })

  it('si la plantilla no carga NO crea el proyecto', async () => {
    const api = fakeApi()
    const fetchImpl = vi.fn(async () => new Response('no', { status: 404 })) as unknown as typeof fetch
    await expect(createFromTemplate(api, { name: 'x', kind: 'comercio', templateId: 'cafe' }, fetchImpl)).rejects.toBeInstanceOf(TemplateError)
    expect(api.createProject).not.toHaveBeenCalled()
  })

  it('si no hay red tampoco crea el proyecto y avisa en castellano', async () => {
    const api = fakeApi()
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('fetch failed')
    }) as unknown as typeof fetch
    await expect(createFromTemplate(api, { name: 'x', kind: 'comercio', templateId: 'cafe' }, fetchImpl)).rejects.toThrow('No pudimos cargar la plantilla')
    expect(api.createProject).not.toHaveBeenCalled()
  })

  it('rechaza una plantilla con formato inválido antes de crear nada', async () => {
    const api = fakeApi()
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ schemaVersion: 9 }), { status: 200 })) as unknown as typeof fetch
    await expect(createFromTemplate(api, { name: 'x', kind: 'comercio', templateId: 'cafe' }, fetchImpl)).rejects.toThrow('formato esperado')
    expect(api.createProject).not.toHaveBeenCalled()
  })

  it('rechaza una plantilla que no existe', async () => {
    const api = fakeApi()
    await expect(createFromTemplate(api, { name: 'x', kind: 'comercio', templateId: 'fantasma' }, okFetch())).rejects.toThrow('plantilla')
    expect(api.createProject).not.toHaveBeenCalled()
  })

  it('si falla el guardado devuelve el proyecto y la escena para reintentar, sin crear otro', async () => {
    const saveScene = vi.fn().mockRejectedValueOnce(new Error('caída')).mockResolvedValueOnce({ version: 2 })
    const api = fakeApi({ saveScene })
    const first = await createFromTemplate(api, { name: 'Mi tienda', kind: 'comercio', templateId: 'cafe' }, okFetch())
    expect(first).toMatchObject({ project: created, saved: false })
    expect(first.error).toBeInstanceOf(Error)
    const second = await retrySaveTemplate(api, first)
    expect(second.saved).toBe(true)
    expect(api.createProject).toHaveBeenCalledTimes(1)
    expect(saveScene).toHaveBeenCalledTimes(2)
  })
})

describe('normalizeProjectName', () => {
  it('recorta espacios y devuelve null si no queda nada', () => {
    expect(normalizeProjectName('  Mi tienda  ')).toBe('Mi tienda')
    expect(normalizeProjectName('     ')).toBeNull()
    expect(normalizeProjectName('')).toBeNull()
  })
})
```

Run: `pnpm --filter @interiores/web exec vitest run create-from-template`
Expected: FAIL — `Failed to resolve import "../src/lib/templates/create-from-template"`. Pegar en el PR.

- [ ] **Paso 2: Implementar `createFromTemplate`**

Create `apps/web/src/lib/templates/create-from-template.ts`:

```ts
import {
  type ProjectCreated,
  type ProjectKind,
  SCENE_MAX_BYTES,
  type SceneEnvelope,
  SceneEnvelopeSchema,
} from '@interiores/contract'
import type { ApiClient } from '../api/client'
import { templateById } from './index'

export class TemplateError extends Error {}

export type CreateFromTemplateResult = {
  project: ProjectCreated
  envelope: SceneEnvelope | null
  saved: boolean
  error?: unknown
}

/** Recorta el nombre; `null` si queda vacío (un nombre de solo espacios no debe llegar a la API). */
export function normalizeProjectName(raw: string): string | null {
  const name = raw.trim()
  return name.length > 0 ? name : null
}

async function loadTemplate(templateId: string, fetchImpl: typeof fetch): Promise<SceneEnvelope> {
  const info = templateById(templateId)
  if (!info) throw new TemplateError('No existe esa plantilla.')
  let response: Response
  try {
    response = await fetchImpl(info.file)
  } catch {
    throw new TemplateError('No pudimos cargar la plantilla. Revisa tu conexión e inténtalo de nuevo.')
  }
  if (!response.ok) throw new TemplateError('No pudimos cargar la plantilla. Inténtalo de nuevo en unos segundos.')
  const text = await response.text()
  if (text.length > SCENE_MAX_BYTES) throw new TemplateError('La plantilla supera el límite de 5 MB.')
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new TemplateError('La plantilla no tiene el formato esperado.')
  }
  const parsed = SceneEnvelopeSchema.safeParse(json)
  if (!parsed.success) throw new TemplateError('La plantilla no tiene el formato esperado.')
  return parsed.data
}

/**
 * Crea el proyecto y guarda la escena de la plantilla. La plantilla se pide y valida ANTES de crear el
 * proyecto: si no carga, no queda un proyecto vacío. Si falla el guardado, devuelve el proyecto y la escena
 * para reintentar sin crear otro.
 */
export async function createFromTemplate(
  api: Pick<ApiClient, 'createProject' | 'saveScene'>,
  input: { name: string; kind: ProjectKind; templateId: string | null },
  fetchImpl: typeof fetch = (...args) => fetch(...args),
): Promise<CreateFromTemplateResult> {
  const envelope = input.templateId ? await loadTemplate(input.templateId, fetchImpl) : null
  const project = await api.createProject({ name: input.name, kind: input.kind })
  if (!envelope) return { project, envelope: null, saved: true }
  return retrySaveTemplate(api, { project, envelope, saved: false })
}

export async function retrySaveTemplate(
  api: Pick<ApiClient, 'saveScene'>,
  result: CreateFromTemplateResult,
): Promise<CreateFromTemplateResult> {
  if (!result.envelope) return { ...result, saved: true }
  try {
    await api.saveScene(result.project.id, result.envelope, 1)
    return { ...result, saved: true, error: undefined }
  } catch (error) {
    return { ...result, saved: false, error }
  }
}
```

Run: `pnpm --filter @interiores/web exec vitest run create-from-template`
Expected: PASS (8 pruebas).

- [ ] **Paso 3: Selector de plantillas y pantalla de proyectos**

Create `apps/web/src/components/TemplatePicker.tsx`:

```tsx
'use client'

import type { ProjectKind } from '@interiores/contract'
import { templatesForKind } from '@/lib/templates'

type Props = { kind: ProjectKind; value: string | null; onChange: (id: string | null) => void }

/** Tarjetas de plantilla (mínimas; el diseño final llega con el spec de interfaz). */
export function TemplatePicker({ kind, value, onChange }: Props) {
  const templates = templatesForKind(kind)
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium">Plantilla</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {templates.map((t) => (
          <label key={t.id} className={`flex cursor-pointer flex-col gap-2 rounded-xl p-3 ${value === t.id ? 'bg-primary/10' : 'bg-secondary'}`}>
            <input checked={value === t.id} className="sr-only" name="plantilla" onChange={() => onChange(t.id)} type="radio" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" className="w-full rounded-lg" height={160} src={t.thumbnail} width={240} />
            <span className="font-medium">{t.name}</span>
            <span className="text-xs text-muted-foreground">
              {t.areaM2} m² · {t.levels > 1 ? `${t.levels} niveles · ` : ''}
              {t.summary}
            </span>
          </label>
        ))}
        <label className={`flex cursor-pointer flex-col justify-center gap-1 rounded-xl p-3 ${value === null ? 'bg-primary/10' : 'bg-secondary'}`}>
          <input checked={value === null} className="sr-only" name="plantilla" onChange={() => onChange(null)} type="radio" />
          <span className="font-medium">En blanco</span>
          <span className="text-xs text-muted-foreground">Empieza desde cero con una escena vacía.</span>
        </label>
      </div>
    </fieldset>
  )
}
```

Modify `apps/web/app/proyectos/page.tsx`:

1. Agregar imports:

```tsx
import { TemplatePicker } from '@/components/TemplatePicker'
import { templatesForKind } from '@/lib/templates'
import { type CreateFromTemplateResult, createFromTemplate, normalizeProjectName, retrySaveTemplate } from '@/lib/templates/create-from-template'
```

2. Estado nuevo junto a los existentes:

```tsx
  const [templateId, setTemplateId] = useState<string | null>(templatesForKind('vivienda')[0]?.id ?? null)
  const [creating, setCreating] = useState(false)
  const [pending, setPending] = useState<CreateFromTemplateResult | null>(null)
```

3. Reemplazar la función `create` por:

```tsx
  function changeKind(next: 'vivienda' | 'comercio') {
    setKind(next)
    setTemplateId(templatesForKind(next)[0]?.id ?? null)
  }

  async function create(e: FormEvent) {
    e.preventDefault()
    const clean = normalizeProjectName(name)
    if (!clean) return setError('Escribe un nombre para tu proyecto.')
    if (creating) return
    setCreating(true)
    setError(null)
    try {
      const result = await createFromTemplate(api, { name: clean, kind, templateId })
      if (result.saved) return router.push(`/proyectos/${result.project.id}`)
      setPending(result)
      setError('El proyecto se creó, pero no pudimos guardar la plantilla. Puedes reintentar.')
    } catch (err) {
      setError(friendlyMessage(err))
    } finally {
      setCreating(false)
    }
  }

  async function retry() {
    if (!pending) return
    setCreating(true)
    const result = await retrySaveTemplate(api, pending)
    setCreating(false)
    if (result.saved) return router.push(`/proyectos/${result.project.id}`)
    setPending(result)
    setError(friendlyMessage(result.error))
  }
```

4. En el formulario: el `<select>` de tipo usa `onChange={(e) => changeKind(e.target.value as 'vivienda' | 'comercio')}`; después del bloque de campos agregar `<TemplatePicker kind={kind} onChange={setTemplateId} value={templateId} />` y cambiar el botón a `disabled={creating}`. Debajo del mensaje de error agregar:

```tsx
      {pending && (
        <div className="flex gap-3">
          <button className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-60" disabled={creating} onClick={retry} type="button">
            Reintentar guardar la plantilla
          </button>
          <Link className="rounded-md bg-secondary px-4 py-2" href={`/proyectos/${pending.project.id}`}>
            Abrir el proyecto vacío
          </Link>
        </div>
      )}
```

(`friendlyMessage` ya está importado en esa página. Si el archivo supera 300 líneas, mover el formulario a `src/components/NewProjectForm.tsx`.)

- [ ] **Paso 4: Gancho de conteos para las pruebas en navegador**

Modify `apps/web/src/editor/e2e-hooks.ts`: dentro del objeto asignado a `window.__e2e`, agregar:

```ts
    counts: () => {
      const total: Record<string, number> = {}
      for (const n of nodes()) total[n.type] = (total[n.type] ?? 0) + 1
      return total
    },
```

- [ ] **Paso 5: Prueba en navegador (rojo → verde)**

Create `apps/web/e2e/templates.spec.ts`:

```ts
import { readFileSync } from 'node:fs'
import { type Page, expect, test } from '@playwright/test'

type Counts = Record<string, number>
const counts = (page: Page) =>
  page.evaluate(() => (window as unknown as { __e2e: { counts(): Record<string, number> } }).__e2e.counts())
const ready = (page: Page) =>
  page.waitForFunction(() => (window as unknown as { __e2e?: { ready(): boolean } }).__e2e?.ready())

function expected(id: string): Counts {
  const json = JSON.parse(readFileSync(`public/templates/${id}.json`, 'utf8'))
  const total: Counts = {}
  for (const n of Object.values(json.graph.nodes) as { type: string }[]) total[n.type] = (total[n.type] ?? 0) + 1
  return total
}

/** Respuestas 4xx/5xx de modelos, texturas y plantillas (lo que rompería el criterio 5 del spec). */
function watchAssetFailures(page: Page): string[] {
  const failed: string[] = []
  page.on('response', (r) => {
    if (r.status() >= 400 && /\/(material|items|templates)\//.test(r.url())) failed.push(`${r.status()} ${r.url()}`)
  })
  return failed
}

async function createFrom(page: Page, kind: 'vivienda' | 'comercio', templateName: string) {
  await page.goto('/proyectos')
  await page.getByLabel('Nombre del proyecto').fill(`E2E ${templateName} ${Date.now()}`)
  await page.getByLabel('Tipo').selectOption(kind)
  await page.getByRole('radio', { name: new RegExp(templateName) }).check({ force: true })
  await page.getByRole('button', { name: 'Crear proyecto' }).click()
  await page.waitForURL(/\/proyectos\/[0-9a-f-]{36}$/, { timeout: 60_000 })
  await ready(page)
}

test('crear desde "Concept store" y recargar deja los mismos niveles, ambientes y piezas, sin texturas rotas', async ({ page }) => {
  const failed = watchAssetFailures(page)
  await createFrom(page, 'comercio', 'Concept store')
  const want = expected('concept-store')
  expect(want.level).toBe(2)
  await expect.poll(async () => (await counts(page)).zone).toBe(want.zone)
  const before = await counts(page)
  for (const type of ['level', 'wall', 'item', 'door', 'window', 'stair'] as const) expect(before[type], type).toBe(want[type])

  await page.waitForTimeout(6000) // deja que carguen las texturas y los modelos
  await page.reload()
  await ready(page)
  await expect.poll(async () => (await counts(page)).zone).toBe(want.zone)
  const after = await counts(page)
  for (const type of ['level', 'zone', 'item', 'stair'] as const) expect(after[type], type).toBe(want[type])
  await page.waitForTimeout(6000)
  expect(failed).toEqual([])
})

test('las cuatro plantillas se abren sin errores ni texturas rotas y dejan una captura para revisión visual', async ({ page }) => {
  test.setTimeout(240_000)
  const errors: string[] = []
  const failed = watchAssetFailures(page)
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
  for (const [kind, name, file] of [
    ['comercio', 'Concept store', 'concept-store'],
    ['comercio', 'Café de especialidad', 'cafe'],
    ['comercio', 'Supermercado', 'supermercado'],
    ['vivienda', 'Loft', 'loft'],
  ] as const) {
    await createFrom(page, kind, name)
    await page.waitForTimeout(6000)
    await page.screenshot({ path: `test-results/plantillas/${file}.png` })
  }
  expect(errors).toEqual([])
  expect(failed).toEqual([])
})

test('un doble clic en "Crear proyecto" crea un solo proyecto', async ({ page }) => {
  const name = `E2E doble ${Date.now()}`
  await page.goto('/proyectos')
  await page.getByLabel('Nombre del proyecto').fill(name)
  await page.getByRole('button', { name: 'Crear proyecto' }).dblclick()
  await page.waitForURL(/\/proyectos\/[0-9a-f-]{36}$/, { timeout: 60_000 })
  await page.goto('/proyectos')
  await expect(page.getByRole('link', { name: new RegExp(name) })).toHaveCount(1)
})

test('un nombre de solo espacios muestra un aviso claro y no crea nada', async ({ page }) => {
  await page.goto('/proyectos')
  await page.getByLabel('Nombre del proyecto').fill('     ')
  await page.getByRole('button', { name: 'Crear proyecto' }).click()
  await expect(page.getByText('Escribe un nombre para tu proyecto.')).toBeVisible()
  await expect(page).toHaveURL(/\/proyectos$/)
})
```

Antes de los Pasos 3 y 4, esta suite **falla** (`getByRole('radio', …)` no existe y `__e2e.counts` no está definida); pegar esa salida en el PR. Con Supabase local arriba:

Run: `pnpm --filter @interiores/web e2e -g "Concept store|cuatro plantillas|doble clic|solo espacios"`
Expected: PASS (4 pruebas). Si los conteos de Pascal difieren de la plantilla (por ejemplo, el editor agrega o ajusta nodos al cargar), anotar la diferencia en `docs/pascal-notes.md` y comparar solo lo que el editor conserva. Si una textura da 4xx, anotar la URL: si es del CDN, aplicar el plan B de las desviaciones.

- [ ] **Paso 6: Revisión visual (la parte que no se puede automatizar)**

Abrir las 4 capturas en `apps/web/test-results/plantillas/*.png` y, para el concept store y el loft, abrir también el proyecto en el navegador y recorrer los dos niveles. Revisar a ojo y corregir **la definición** (no el constructor): muros cerrados y con el material correcto de cada lado, zócalo y cornisa visibles, parquet/ladrillo/terrazo con textura (sin cuadros grises ni rosas), aberturas en su sitio, piezas dentro de cada ambiente y no encimadas, escala razonable de las piezas de Kenney, **orientación y posición de la escalera** (que arranque en la planta baja y llegue al entrepiso por el borde abierto; ajustar `at` y `rotY`), barandas del entrepiso a 1,05 m. Registrar en `docs/bitacora.md` lo que se ajustó y en `docs/pascal-notes.md` la orientación real de la escalera con `rotY = 0`. Volver a correr `pnpm --filter @interiores/web templates:build` y la suite después de cada cambio de definición.

- [ ] **Paso 7: Verificar y commit**

Run: `pnpm verify`
Expected: PASS.

```bash
git add -A
git commit -m "feat(tienda): crear proyecto desde plantilla con reintento y pruebas en navegador"
git push -q
```

---

### Task 6: Avisos de licencia, documentación y PR

**Responsable sugerido:** ambas.

**Files:**
- Create: `THIRD_PARTY_NOTICES.md`
- Modify: `README.md`, `docs/ESTADO.md`, `docs/pascal-notes.md`, `docs/bitacora.md`, `apps/web/CLAUDE.md`

- [ ] **Paso 1: Avisos de terceros**

Create `THIRD_PARTY_NOTICES.md`:

```markdown
# Avisos de terceros

## Pascal Editor — MIT
Código (`@pascal-app/*`, vía npm) y assets copiados de su repositorio (`apps/web/public/{material,icons,hdri,fonts,audios,items}`, muebles de `public/items/<nombre>/` salvo los `kenney-*`).
© Pascal Group Inc. Licencia MIT; copia en `apps/web/public/pascal-LICENSE.txt`. Fuente: https://github.com/pascalorg/editor (commit `86f8e833904f7b6b3358bb1505feb82d801ad9ad`).

### Texturas de materiales servidas por el CDN de Pascal — MIT
La biblioteca de materiales de Pascal (`MATERIAL_CATALOG`) es parte de `@pascal-app/core` (MIT). Las texturas de madera, ladrillo, azulejo y piedra que su repositorio no incluye se piden en tiempo de ejecución a `https://editor.pascal.app/material/` mediante un `rewrite` de Next (`apps/web/next.config.mjs`); **no se copian al repositorio**. Si ese servicio dejara de responder, esos materiales se reemplazan por equivalentes locales (ver el plan de la tienda, desviaciones).

## Kenney — Mini Market 1.0 — CC0 1.0
Doce modelos y sus miniaturas en `apps/web/public/items/kenney-*/`. Creado y distribuido por Kenney (www.kenney.nl); créditos adicionales: Fleur Keijsers y Guus Vermeulen. Licencia CC0 (dominio público); no exige atribución, pero se agradece. Copia del texto original en `apps/web/public/items/kenney-LICENSE.txt`. Fuente: https://kenney.nl/assets/mini-market.
```

- [ ] **Paso 2: Documentación**

Modify `docs/pascal-notes.md` agregando estas filas a la tabla:

```markdown
| `SiteNode`, `BuildingNode`, `LevelNode`, `WallNode`, `ZoneNode`, `SlabNode`, `CeilingNode`, `DoorNode`, `WindowNode`, `ItemNode` se pueden `parse` en Node puro (sin navegador) | `import('@pascal-app/core')` desde un script, 2026-10-11 | Base del constructor de plantillas (`src/editor/templates/scene-builder.ts`). |
| Una puerta o ventana cuelga de su muro (`parentId` y `wallId` = id del muro; `position: [distancia al inicio, altura del centro, 0]`) y el muro la lista en `children` | `scene_19.json` de Pascal y escena real guardada por el editor | `side: 'front'` por defecto. |
| `AssetInput` exige `thumbnail` (texto); el resto de campos del descriptor es opcional | error de Zod al construir un `ItemNode` | Las piezas de Kenney usan su `Previews/<pieza>.png`. |
| Los GLB de Kenney referencian `Textures/colormap.png` por ruta relativa | inspección del GLB | Cada carpeta `public/items/kenney-*/` lleva su `Textures/colormap.png`. |
| Las zonas, losas y cielos son nodos explícitos (no se derivan al cargar) | `scene_19.json` | El constructor crea uno de cada por ambiente (sin cielo en terrazas y entrepisos abiertos). |
| Un material de la biblioteca se aplica con `materialPreset` (losa y cielo) o `interiorMaterialPreset`/`exteriorMaterialPreset` (muro), valor `library:<id>`; `MATERIAL_CATALOG` trae 114 y solo 66 tienen textura en el repo | `MATERIAL_CATALOG` y `apps/web/public/material`, 2026-10-11 | Las demás se piden a `https://editor.pascal.app/material/` con un `rewrites().fallback` de Next (CORS `*`, HTTP 200). |
| Zócalo, cornisa y friso son `skirting`/`crown`/`chairRail` del muro (`{ ...WALL_SKIRTING_DEFAULT, enabled: true, sides: 'interior' }`) | `WallNode` y sus constantes por defecto | Se activan por nivel con `trim: true`. |
| `LevelNode.level` es el índice (0 = planta baja) y `BuildingNode.children` los lista en orden | prototipo de 2 niveles en el editor | La escalera (`StairNode`) cuelga del nivel de abajo con `fromLevelId`/`toLevelId` y `slabOpeningMode: 'destination'`. |
| Orientación de `StairNode` con `rotation = 0` | revisión visual de las plantillas (Tarea 5, Paso 6) | Completar con lo observado. |
```

Modify `apps/web/CLAUDE.md` agregando al final:

```markdown
- **Plantillas** (`src/lib/templates/`): son datos puros, multinivel y con materiales por id de la biblioteca de Pascal. `pnpm --filter @interiores/web templates:build` regenera `public/templates/`; `pnpm verify` falla si los archivos commiteados no coinciden con las definiciones.
- **Piezas de Kenney:** `pnpm --filter @interiores/web assets:kenney`. No editar `public/items/kenney-*` a mano.
```

Modify `README.md`: en la sección "Cómo correrlo" agregar una línea `pnpm --filter @interiores/web templates:build   # regenera las plantillas` y, en "Qué decidí yo", un punto 7: "**Plantillas como código:** cada plantilla es una definición de datos (niveles, escalera, materiales de la biblioteca de Pascal) validada (muros cerrados, aberturas dentro de su muro, piezas dentro de un ambiente, materiales existentes) que un constructor convierte en escena con los esquemas reales de Pascal; el JSON generado se commitea y una prueba falla si se desactualiza. Las texturas que el repo no trae se piden al CDN de Pascal."

Modify `docs/bitacora.md` agregando (con la fecha de hoy): lo que se ajustó en la revisión visual (Tarea 5, Paso 6) y esta línea: "`cabinet` se perdió al autoalojar el catálogo porque se buscaba por id; el modelo vive en la carpeta `kitchen-cabinet`. Se detectó al listar ítems con `tool`."

Modify `docs/ESTADO.md`: en "Hecho" agregar "Spec 2 (tienda) implementado: pestaña Comercio con 45 piezas, gabinete paramétrico recuperado y 4 plantillas de muestra (concept store y loft de 2 niveles con escalera, café con terraza, supermercado) con materiales de la biblioteca de Pascal"; en "Pendiente" reemplazar el punto de la tienda por "Siguiente: spec de interfaz (shell visual con el diseño de Pencil)".

- [ ] **Paso 3: Verificación final y PR**

Run: `pnpm verify`
Expected: PASS. Pegar las últimas líneas en el PR.

Run: `pnpm --filter @interiores/web e2e`
Expected: PASS (las pruebas del spec 1 más las de catálogo y plantillas).

Revisar los 7 criterios de éxito del spec y pegar la evidencia:

| # | Criterio | Evidencia |
|---|---|---|
| 1 | `pnpm verify` verde | salida del Paso 3 |
| 2 | Pestaña Comercio con ≥ 20 piezas sin 404 (modelos y texturas) | `commerce-catalog.test.ts` y `e2e/catalog.spec.ts` |
| 3 | `cabinet` aparece y arma su herramienta | `catalog.test.ts` (conserva `tool`) y `e2e/catalog.spec.ts` ("Modular Cabinet") |
| 4 | 4 plantillas válidas con miniatura, 2 de ellas con 2 niveles y escalera, ≥ 5 materiales cada una | `template-definitions.test.ts`, `template-files.test.ts` |
| 5 | Crear desde "Concept store", recargar y ninguna textura 4xx | `e2e/templates.spec.ts` (1.ª y 2.ª pruebas) |
| 6 | Reintento si falla el guardado | `create-from-template.test.ts` |
| 7 | `THIRD_PARTY_NOTICES.md` | el archivo |

```bash
git add -A
git commit -m "docs(tienda): avisos de terceros, notas de Pascal y estado del spec 2"
git push -q
gh pr create --base feature/fundacion-persistencia --head feature/tienda-plantillas --title "feat: tienda — catálogo de comercio y plantillas (spec 2)" --body-file <archivo con la plantilla de PR completa>
```

El PR apunta a `feature/fundacion-persistencia` mientras el PR #1 no esté fusionado; cuando lo esté, cambiar la base a `main` (`gh pr edit --base main`).

---

## Autorrevisión del plan

**Cobertura del spec.** Criterio 1 (verify) → Tareas 1–6; 2 (pestaña Comercio ≥ 20, sin 404) → Tarea 2; 3 (`cabinet`) → Tarea 2; 4 (4 plantillas válidas, 2 con niveles y escalera, ≥ 5 materiales) → Tareas 3 y 4; 5 (crear, recargar, sin texturas rotas) → Tarea 5; 6 (reintento) → Tarea 5; 7 (avisos, incluido el CDN) → Tarea 6. D1 → Tarea 4; D2 → Tarea 1; D3 → Tareas 3–4 (con la desviación de la miniatura SVG); D4 → Tarea 5; D5 → Tarea 2; D6 → fuera de alcance, sin tarea; D7 (materiales y CDN) → Tareas 3 (rewrite, `MATERIAL_IDS`) y 5 (E2E sin 4xx); D8 (niveles y escalera) → Tareas 3–4.

**Código validado antes de ejecutar.** El código de las Tareas 3 y 4 se extrajo del plan y se corrió el 2026-10-11 (con un `kenney-pieces.json` provisorio): 40 de 40 pruebas verdes y las 4 plantillas construyen un `SceneEnvelope` válido de 61 a 95 KB (concept store: 2 niveles, 11 muros, 49 piezas, 1 escalera; café: 73 piezas; supermercado: 75; loft: 2 niveles, 38 piezas, 1 escalera). Esa corrida corrigió tres errores del borrador (conteo de muros, id con guiones bajos y sillas de la terraza fuera del ambiente). Queda sin validar lo que solo se ve en el editor: posiciones finas, orientación de la escalera y texturas (Tarea 5, Paso 6).

**Marcadores de relleno.** Sin "TBD". Lo único que se decide al ejecutar son las coordenadas finas de piezas y escaleras, que el Paso 6 de la Tarea 5 ajusta con revisión visual y que las pruebas de definición mantienen válidas.

**Consistencia de tipos.** `Pt`, `WallDef`, `RoomDef`, `OpeningDef`, `ItemDef`, `StairDef`, `LevelDef` y `TemplateDefinition` (Tarea 3, `types.ts`) los usan `validateDefinition`, `buildScene`, las cuatro definiciones, `renderTemplateThumbnail` y `build-templates.ts`; `AssetLike` (constructor) coincide con los ítems localizados de la Tarea 2 y con `kenneyAssets()`; `TemplateInfo` (Tarea 4) agrega `levels`, que usa `TemplatePicker` (Tarea 5); `CreateFromTemplateResult` es el mismo en la función, el reintento y la pantalla.

**Review Focus.** (1) plantilla que no carga → `create-from-template.test.ts` (3 casos); (2) doble clic → `e2e/templates.spec.ts`; (3) ambiente que no cierra → `template-validate.test.ts`; (4) 4xx de modelos y texturas → `commerce-catalog.test.ts`, `template-files.test.ts` y `e2e/templates.spec.ts`; (5) nombre de solo espacios → `normalizeProjectName` y `e2e/templates.spec.ts`; (6) escalera, material o abertura inválidos → `template-validate.test.ts`.
