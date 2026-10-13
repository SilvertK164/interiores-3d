/** La cancelación de la exportación: el mismo nombre de error que usa el parche de Pascal cuando corta la generación. */
export const abortError = (): DOMException => new DOMException('Exportación cancelada', 'AbortError')

/**
 * Espera a `promise`, pero se rinde en cuanto `signal` se cancela con un `AbortError`. La generación de Pascal solo mira la señal
 * entre una imagen y la siguiente (con muchos muebles puede tardar) y quien cancela necesita la respuesta ya. El trabajo que
 * sigue en segundo plano se corta solo en su próximo punto de control y su resultado o su error se descartan.
 */
export function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (signal.aborted) {
      promise.catch(() => {})
      reject(abortError())
      return
    }
    const onAbort = () => reject(abortError())
    signal.addEventListener('abort', onAbort, { once: true })
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort))
  })
}
