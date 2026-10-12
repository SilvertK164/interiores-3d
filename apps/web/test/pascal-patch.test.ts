import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const fromRoot = (path: string) => fileURLToPath(new URL(`../../../${path}`, import.meta.url))
const editorIndex = fileURLToPath(
  new URL('../node_modules/@pascal-app/editor/src/components/editor/index.tsx', import.meta.url),
)
const PATCH_FILE = 'patches/@pascal-app__editor@1.0.3.patch'
const ATTRIBUTES = ['data-pascal-dock', 'data-pascal-inspector', 'data-pascal-helpers', 'data-pascal-level-selector']
const FLAGS = ['dock', 'inspector', 'helpers', 'levelSelector']

describe('parche de @pascal-app/editor (propiedad chrome)', () => {
  it('Pascal sigue fijado en 1.0.3 y el parche está registrado en pnpm-workspace.yaml', () => {
    const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'))
    expect(pkg.dependencies['@pascal-app/editor']).toBe('1.0.3')
    const workspace = readFileSync(fromRoot('pnpm-workspace.yaml'), 'utf8')
    expect(workspace).toMatch(
      /patchedDependencies:\s*\n\s+'?@pascal-app\/editor@1\.0\.3'?:\s*patches\/@pascal-app__editor@1\.0\.3\.patch/,
    )
    expect(existsSync(fromRoot(PATCH_FILE))).toBe(true)
  })

  it('el paquete instalado trae el parche: la propiedad y los cuatro atributos estables', () => {
    const source = readFileSync(editorIndex, 'utf8')
    expect(source).toContain('chrome?: EditorChrome')
    for (const attribute of ATTRIBUTES) expect(source, attribute).toContain(attribute)
    for (const flag of FLAGS) expect(source, flag).toContain(`chrome.${flag} !== false`)
  })

  it('el archivo del parche guarda esos mismos cambios (si node_modules se regenera, vuelven)', () => {
    const patch = readFileSync(fromRoot(PATCH_FILE), 'utf8')
    expect(patch).toContain('src/components/editor/index.tsx')
    for (const attribute of ATTRIBUTES) expect(patch, attribute).toMatch(new RegExp(`^\\+.*${attribute}`, 'm'))
  })

  it('el plano de Pascal ignora el azimut 3D con __madoriPlanNorth (parche en floorplan-panel)', () => {
    const panel = readFileSync(editorIndex.replace('index.tsx', 'floorplan-panel.tsx'), 'utf8')
    expect(panel).toContain('__madoriPlanNorth')
    expect(readFileSync(fromRoot(PATCH_FILE), 'utf8')).toMatch(/^\+.*__madoriPlanNorth/m)
  })
})
