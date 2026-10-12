/** Une nombres de clase: descarta lo que no sea texto (falso, nulo, indefinido o vacío). */
export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ')
