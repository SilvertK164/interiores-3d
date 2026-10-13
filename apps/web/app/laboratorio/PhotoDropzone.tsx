'use client'

import { ImagePlus, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { cx } from '@/lib/cx'
import { formatFileSize } from '@/lib/format'
import { useObjectUrl } from '@/lib/use-object-url'

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp']

type Props = {
  file: File | null
  onFile: (file: File | null) => void
  disabled?: boolean
}

/**
 * Zona para elegir la foto del ambiente: un solo control (la etiqueta entera abre el selector de archivos, también con teclado) que
 * admite arrastrar y soltar y muestra la vista previa de la imagen elegida con su nombre y su peso. El `<input>` queda oculto a la
 * vista pero sigue siendo el control con foco: el anillo de foco se dibuja en la etiqueta.
 */
export function PhotoDropzone({ file, onFile, disabled = false }: Props) {
  const preview = useObjectUrl(file)
  const [over, setOver] = useState(false)

  return (
    <label
      className={cx(
        'focus-ring relative flex min-h-[220px] flex-col items-center justify-center gap-2 overflow-hidden rounded-[24px] border-2 border-dashed p-5 text-center transition-colors duration-150',
        preview ? 'border-transparent' : over ? 'border-brand bg-brand-mist' : 'border-ink/50 bg-white/60 hover:bg-white/80',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
      )}
      onDragLeave={() => setOver(false)}
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) setOver(true)
      }}
      onDrop={(event) => {
        event.preventDefault()
        setOver(false)
        const dropped = [...event.dataTransfer.files].find((candidate) => ACCEPT.includes(candidate.type))
        if (dropped && !disabled) onFile(dropped)
      }}
    >
      <input
        accept={ACCEPT.join(',')}
        className="sr-only"
        disabled={disabled}
        onChange={(event) => onFile(event.target.files?.[0] ?? null)}
        type="file"
      />
      {preview && file ? (
        <>
          <span className="sr-only">Foto del ambiente</span>
          {/* biome-ignore lint/performance/noImgElement: vista previa local (blob:); next/image no optimiza archivos del navegador */}
          <img alt="Vista previa de la foto elegida" className="absolute inset-0 size-full object-cover" src={preview} />
          <span className="absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-left text-[13px] shadow-soft">
            <span className="min-w-0 flex-1 truncate font-medium">{file.name}</span>
            <span className="shrink-0 text-ink-muted">{formatFileSize(file.size)}</span>
            <span className="inline-flex shrink-0 items-center gap-1 font-medium text-brand">
              <RefreshCw aria-hidden size={14} />
              Cambiar
            </span>
          </span>
        </>
      ) : (
        <>
          <span className="grid size-12 place-items-center rounded-full bg-brand-wash text-brand-deep">
            <ImagePlus aria-hidden size={24} />
          </span>
          <span className="font-display text-lg font-bold tracking-[-0.02em]">Foto del ambiente</span>
          <span className="max-w-[30ch] text-sm text-ink-muted">JPG, PNG o WebP. Arrástrala aquí o toca para elegirla.</span>
        </>
      )}
    </label>
  )
}
