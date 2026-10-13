'use client'

import { useEffect, useState } from 'react'

/** Una URL temporal para mostrar un archivo que la persona eligió (vista previa); se libera al cambiar de archivo y al salir. */
export function useObjectUrl(file: Blob | null): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!file) {
      setUrl(null)
      return
    }
    const next = URL.createObjectURL(file)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [file])
  return url
}
