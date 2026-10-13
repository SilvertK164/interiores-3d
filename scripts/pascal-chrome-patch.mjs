// Aplica el parche `chrome` de Madori sobre @pascal-app/editor 1.0.3 (un solo archivo: components/editor/index.tsx).
// Uso: pnpm patch @pascal-app/editor@1.0.3 --edit-dir ../pascal-editor-edit
//      node scripts/pascal-chrome-patch.mjs ../pascal-editor-edit
//      pnpm patch-commit ../pascal-editor-edit
// Falla (y no escribe nada) si algún ancla ya no aparece exactamente una vez: señal de que Pascal cambió.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = process.argv[2]
if (!dir) {
  console.error('Uso: node scripts/pascal-chrome-patch.mjs <carpeta abierta con pnpm patch>')
  process.exit(1)
}

const EDITS = [
  [
    `export interface EditorProps {
  // Layout version — 'v1' (default) or 'v2' (navbar + two-column)
  layoutVersion?: 'v1' | 'v2'
`,
    `/** Parche de Madori: qué chrome propio de Pascal se dibuja en el layout v2 (todo visible por omisión). */
export type EditorChrome = {
  dock?: boolean
  inspector?: boolean
  helpers?: boolean
  levelSelector?: boolean
}

export interface EditorProps {
  // Layout version — 'v1' (default) or 'v2' (navbar + two-column)
  layoutVersion?: 'v1' | 'v2'
  /** Parche de Madori: oculta el dock, el inspector, los ayudantes o el selector de nivel de Pascal (v2). */
  chrome?: EditorChrome
`,
  ],
  [
    `  layoutVersion = 'v1',
  appMenuButton,
`,
    `  layoutVersion = 'v1',
  chrome = {},
  appMenuButton,
`,
  ],
  [
    `                  {!(isCaptureMode || stageOverlay) && <FloatingLevelSelector />}
                  {!(isVersionPreviewMode || isCaptureMode || isStudioMode) && (
                    <div className="pointer-events-auto">
                      <ActionMenu />
                    </div>
                  )}
                  {!(isVersionPreviewMode || isCaptureMode || isStudioMode) && (
                    <div className="pointer-events-auto">
                      <PanelManager
                        inspectorFooter={inspectorFooter}
                        multiSelectionFooter={multiSelectionFooter}
                      />
                    </div>
                  )}
                  {!isCaptureMode && (
                    <div className="pointer-events-auto">
                      <HelperManager />
                    </div>
                  )}
`,
    `                  {chrome.levelSelector !== false && !(isCaptureMode || stageOverlay) && (
                    <div data-pascal-level-selector>
                      <FloatingLevelSelector />
                    </div>
                  )}
                  {chrome.dock !== false && !(isVersionPreviewMode || isCaptureMode || isStudioMode) && (
                    <div className="pointer-events-auto" data-pascal-dock>
                      <ActionMenu />
                    </div>
                  )}
                  {chrome.inspector !== false && !(isVersionPreviewMode || isCaptureMode || isStudioMode) && (
                    <div className="pointer-events-auto" data-pascal-inspector>
                      <PanelManager
                        inspectorFooter={inspectorFooter}
                        multiSelectionFooter={multiSelectionFooter}
                      />
                    </div>
                  )}
                  {chrome.helpers !== false && !isCaptureMode && (
                    <div className="pointer-events-auto" data-pascal-helpers>
                      <HelperManager />
                    </div>
                  )}
`,
  ],
]

const file = join(dir, 'src/components/editor/index.tsx')
let text = readFileSync(file, 'utf8')
for (const [from, to] of EDITS) {
  if (text.split(from).length !== 2) {
    console.error(`El ancla no aparece exactamente una vez (¿cambió Pascal?):\n${from.split('\n')[0]}`)
    process.exit(1)
  }
  text = text.replace(from, () => to)
}
writeFileSync(file, text)
console.log('Parche chrome aplicado a', file)
