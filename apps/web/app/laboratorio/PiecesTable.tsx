import { type DetectedFurniture, furnitureLabel } from '@/lib/lab/schema'

const percent = (value: number) => `${Math.round(value * 100)} %`

/** Las piezas que detectó TP3, tal cual las devuelve (proporciones del ambiente), sin interpretarlas. */
export function PiecesTable({ furniture }: { furniture: DetectedFurniture[] }) {
  if (furniture.length === 0) {
    return <p className="text-sm text-muted-foreground">TP3 no detectó ningún mueble en esta foto.</p>
  }
  const rows = furniture.map((piece, index) => ({ piece, key: `${index}-${piece.type}` }))
  return (
    <div className="overflow-x-auto rounded-xl bg-secondary">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Piezas detectadas</caption>
        <thead className="text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium" scope="col">Pieza</th>
            <th className="px-3 py-2 font-medium" scope="col">Confianza</th>
            <th className="px-3 py-2 font-medium" scope="col">Posición del centro</th>
            <th className="px-3 py-2 font-medium" scope="col">Tamaño estimado</th>
            <th className="px-3 py-2 font-medium" scope="col">Giro (horario)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ piece, key }) => (
            <tr key={key}>
              <th className="px-3 py-2 font-medium" scope="row">{furnitureLabel(piece.type)}</th>
              <td className="px-3 py-2">{percent(piece.confidence)}</td>
              <td className="px-3 py-2">{percent(piece.x)} del ancho · {percent(piece.y)} del fondo</td>
              <td className="px-3 py-2">{percent(piece.width)} × {percent(piece.depth)}</td>
              <td className="px-3 py-2">{Math.round(piece.rotation_deg)}°</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
