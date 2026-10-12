import type { SceneSaver } from './scene-saver'

const PAUSED = ['conflict', 'unauthorized', 'rejected']

/**
 * El `onSave` que `<Editor>` de Pascal llama tras 1 s sin cambios. Pascal no acepta más cambios mientras la
 * promesa que devolvemos siga pendiente (los aplaza) y al terminar da todo por guardado; si esperáramos el
 * PUT (2 s de espera del guardador + la red), un cambio hecho en esa ventana se enviaría un ciclo tarde y
 * se perdería al cerrar la página. Por eso aquí solo se encola en el guardador (que ya junta cambios, reintenta
 * y manda siempre lo último) y se devuelve enseguida. Con el guardado en pausa se rechaza, como antes.
 */
export function createSaveHandler<T>(getSaver: () => SceneSaver<T> | null) {
  return async (scene: T, options?: { keepalive?: boolean }): Promise<void> => {
    const saver = getSaver()
    if (!saver) return
    if (options?.keepalive) return saver.flushNow(scene)
    if (PAUSED.includes(saver.status)) return saver.save(scene)
    saver.save(scene).catch(() => {})
  }
}
