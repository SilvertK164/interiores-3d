/** Métodos de `pdfkit` cuyo primer argumento puede ser un color (`fill('#fff', 'even-odd')` también lo es). */
const COLOR_METHODS = new Set(['fillColor', 'strokeColor', 'fill', 'stroke'])

type AnyFunction = (...args: unknown[]) => unknown

/** Solo se filtran los colores en hexadecimal: las reglas de relleno ('even-odd'), los números y los objetos pasan igual. */
function mapColor(value: unknown, filter: (color: string) => string): unknown {
  return typeof value === 'string' && value.startsWith('#') ? filter(value) : value
}

/**
 * Envuelve un documento de `pdfkit` para que todo color que se le pida pase por `filter` (modo Papel: todo negro o
 * blanco). Cada método se llama con el proxy como `this`, así que el encadenado (`raw.save().fillColor(...)`) sigue
 * filtrado. El documento original no se toca: quien lo tenga sin envolver dibuja con los colores que pida.
 */
export function withColorFilter<T extends object>(raw: T, filter: (color: string) => string): T {
  return new Proxy(raw, {
    get(target, key, receiver) {
      const value: unknown = Reflect.get(target, key, receiver)
      if (typeof value !== 'function') return value
      const method = value as AnyFunction
      if (key === 'fillAndStroke') {
        return (...args: unknown[]) =>
          method.apply(receiver, [mapColor(args[0], filter), mapColor(args[1], filter), ...args.slice(2)])
      }
      if (typeof key === 'string' && COLOR_METHODS.has(key)) {
        return (...args: unknown[]) => method.apply(receiver, [mapColor(args[0], filter), ...args.slice(1)])
      }
      return value
    },
  })
}
