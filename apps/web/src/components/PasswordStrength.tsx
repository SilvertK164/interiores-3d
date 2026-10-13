import { passwordStrength } from '@/lib/password-strength'

const FILL = { 1: 'bg-danger', 2: 'bg-sun', 3: 'bg-ok-dot' } as const
const TEXT = { 1: 'text-danger-ink', 2: 'text-sun-ink', 3: 'text-ok' } as const

/**
 * Medidor de fuerza de la contraseña: tres barras y el nivel escrito (Débil, Aceptable o Buena), para que no dependa
 * del color. Es una región de estado: el lector de pantalla anuncia el cambio de nivel, no cada tecla.
 */
export function PasswordStrength({ password, id }: { password: string; id?: string }) {
  const { level, label } = passwordStrength(password)
  if (level === 0) return null
  return (
    <div className="mt-2 flex items-center gap-2 px-1.5" data-level={level} id={id} role="status">
      {[1, 2, 3].map((step) => (
        <span aria-hidden className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${step <= level ? FILL[level] : 'bg-brand-wash'}`} key={step} />
      ))}
      <span className={`ml-1 w-[4.5rem] text-[12px] font-medium ${TEXT[level]}`}>{label}</span>
    </div>
  )
}
