import { LoginScreen } from '@/components/LoginScreen'
import { parseLoginParams } from '@/lib/login-params'

/**
 * `/login`, `/login?modo=crear` (abre "Crear cuenta"), `/login?motivo=sesion&next=<ruta>` (la sesión venció: se avisa y,
 * al ingresar, se vuelve a `next`). Los parámetros se leen en el servidor, así la pestaña correcta sale en el primer pintado.
 */
export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { mode, reason, next } = parseLoginParams(await searchParams)
  return <LoginScreen initialMode={mode} next={next} reason={reason} />
}
