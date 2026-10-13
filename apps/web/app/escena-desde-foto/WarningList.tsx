import { TriangleAlert } from 'lucide-react'

/** Lista de avisos con un título; no muestra nada si no hay avisos. */
export function WarningList({ title, warnings }: { title: string; warnings: string[] }) {
  if (warnings.length === 0) return null
  // Los avisos pueden repetirse: la clave lleva el lugar de cada uno.
  const items = warnings.map((text, index) => ({ text, key: `${index}-${text}` }))
  return (
    <div className="rounded-[20px] bg-brand-mist px-4 py-3 text-sm">
      <h4 className="m-0 flex items-center gap-2 font-medium">
        <TriangleAlert aria-hidden className="shrink-0 text-brand-deep" size={16} />
        {title}
      </h4>
      <ul className="m-0 mt-1.5 list-disc pl-9 text-ink">
        {items.map(({ text, key }) => (
          <li key={key}>{text}</li>
        ))}
      </ul>
    </div>
  )
}
