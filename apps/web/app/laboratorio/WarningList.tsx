/** Lista de avisos con un título; no muestra nada si no hay avisos. */
export function WarningList({ title, warnings }: { title: string; warnings: string[] }) {
  if (warnings.length === 0) return null
  const items = warnings.map((text, index) => ({ text, key: `${index}-${text}` }))
  return (
    <div className="rounded-xl bg-secondary px-4 py-3 text-sm">
      <h3 className="font-medium">{title}</h3>
      <ul className="list-disc pl-5">
        {items.map(({ text, key }) => (
          <li key={key}>{text}</li>
        ))}
      </ul>
    </div>
  )
}
