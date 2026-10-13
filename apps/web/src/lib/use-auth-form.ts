'use client'

import { useEffect, useRef, useState } from 'react'
import type { AuthNotice } from './auth-errors'
import { type AuthField, type AuthMode, type AuthValues, validateAuthForm, visibleErrors } from './auth-form'

/**
 * Estado de un formulario de acceso: los valores, la validación en línea (al salir de cada campo y al enviar) y el foco.
 * El correo es compartido: lo guarda quien usa el hook para que no se pierda al cambiar de pestaña (el nombre y la
 * contraseña no se comparten). Tras un error del servidor lleva el foco al campo afectado o, si no hay, al botón.
 */
export function useAuthForm(mode: AuthMode, shared: { email: string; onEmail: (value: string) => void }, serverError: AuthNotice | null) {
  const [own, setOwn] = useState({ name: '', password: '' })
  const [touched, setTouched] = useState<Partial<Record<AuthField, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const submitRef = useRef<HTMLButtonElement>(null)

  const values: AuthValues = { name: own.name, email: shared.email, password: own.password }
  const { errors: all, first } = validateAuthForm(mode, values)
  const errors = visibleErrors(mode, values, { touched, submitted })
  const ok = (field: AuthField) => Boolean((touched[field] || submitted) && values[field] !== '' && !all[field])

  function set(field: AuthField, value: string) {
    if (field === 'email') shared.onEmail(value)
    else setOwn((current) => ({ ...current, [field]: value }))
  }

  const blur = (field: AuthField) => setTouched((current) => (current[field] ? current : { ...current, [field]: true }))

  /** Marca todo como visto; si hay errores lleva el foco al primer campo inválido y devuelve `false`. */
  function validate(): boolean {
    setSubmitted(true)
    const byField = { name: nameRef, email: emailRef, password: passwordRef }
    if (first) byField[first].current?.focus()
    return first === null
  }

  useEffect(() => {
    if (serverError?.tone !== 'error') return
    const byField = { name: nameRef, email: emailRef, password: passwordRef }
    const target = serverError.field ? byField[serverError.field].current : submitRef.current
    target?.focus()
    if (serverError.field === 'password') passwordRef.current?.select()
  }, [serverError])

  return { values, errors, ok, set, blur, validate, refs: { name: nameRef, email: emailRef, password: passwordRef }, submitRef }
}
