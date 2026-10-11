import { readFileSync } from 'node:fs'
import type { Page } from '@playwright/test'

export type Counts = Record<string, number>

/** Cuántos nodos de cada tipo tiene la escena abierta en el editor (gancho `window.__e2e`, solo con NEXT_PUBLIC_E2E=1). */
export const counts = (page: Page) =>
  page.evaluate(() => (window as unknown as { __e2e: { counts(): Record<string, number> } }).__e2e.counts())

/** Espera a que el editor haya cargado la escena (hay al menos un nivel). */
export const ready = (page: Page) =>
  page.waitForFunction(() => (window as unknown as { __e2e?: { ready(): boolean } }).__e2e?.ready())

/** Nodos por tipo del archivo generado de una plantilla (`public/templates/<id>.json`). */
export function templateCounts(id: string): Counts {
  const json = JSON.parse(readFileSync(`public/templates/${id}.json`, 'utf8'))
  const total: Counts = {}
  for (const n of Object.values(json.graph.nodes) as { type: string }[]) total[n.type] = (total[n.type] ?? 0) + 1
  return total
}
