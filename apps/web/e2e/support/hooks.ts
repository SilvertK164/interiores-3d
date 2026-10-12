import type { Page } from '@playwright/test'
import type { E2eApi } from '../../src/editor/e2e-hooks'

/** Llama a un gancho de `window.__e2e` con sus tipos (existe solo con NEXT_PUBLIC_E2E=1). */
export const hook = <K extends keyof E2eApi>(page: Page, name: K, ...args: Parameters<E2eApi[K]>) =>
  page.evaluate(
    ([n, a]) => (window as unknown as { __e2e: Record<string, (...x: unknown[]) => unknown> }).__e2e[n as string]?.(...(a as unknown[])),
    [name, args] as [string, unknown[]],
  ) as Promise<Awaited<ReturnType<E2eApi[K]>>>
