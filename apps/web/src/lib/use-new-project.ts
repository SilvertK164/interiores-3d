'use client'

import type { ProjectKind } from '@interiores/contract'
import { type FormEvent, useCallback, useRef, useState } from 'react'
import { friendlyMessage } from './api/errors'
import { api } from './api/instance'
import { templateById, templatesForKind } from './templates'
import {
  type CreateFromTemplateResult,
  createFromTemplate,
  normalizeProjectName,
  retrySaveTemplate,
} from './templates/create-from-template'
import { useNavigate } from './use-navigate'

const DEFAULT_KIND: ProjectKind = 'comercio'
const SAVE_FAILED = 'El proyecto se creó, pero no pudimos guardar la plantilla. Puedes reintentar.'
const firstTemplateOf = (kind: ProjectKind) => templatesForKind(kind)[0]?.id ?? null

/**
 * Estado del diálogo "Nuevo proyecto": nombre, tipo y plantilla, y la creación con su reintento.
 * Conserva la protección contra doble clic (un candado síncrono, porque el estado de React llega tarde).
 */
export function useNewProject(onPartial?: () => void) {
  const { go } = useNavigate()
  const [name, setNameState] = useState('')
  const [kind, setKind] = useState<ProjectKind>(DEFAULT_KIND)
  const [templateId, setTemplateId] = useState<string | null>(firstTemplateOf(DEFAULT_KIND))
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<CreateFromTemplateResult | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const lock = useRef(false)

  /** Deja el formulario como nuevo; con `presetTemplateId` abre ya con esa plantilla (y su tipo) elegida. */
  const reset = useCallback((presetTemplateId?: string | null) => {
    const preset = presetTemplateId ? templateById(presetTemplateId) : undefined
    const nextKind = preset?.kind ?? DEFAULT_KIND
    setNameState('')
    setKind(nextKind)
    setTemplateId(preset?.id ?? firstTemplateOf(nextKind))
    setBusy(false)
    setPending(null)
    setNameError(null)
    setError(null)
    lock.current = false
  }, [])

  function setName(value: string) {
    setNameState(value)
    setNameError(null)
  }

  function chooseKind(next: ProjectKind) {
    setKind(next)
    setTemplateId(firstTemplateOf(next))
  }

  function release() {
    lock.current = false
    setBusy(false)
  }

  function finish(result: CreateFromTemplateResult, failMessage: string) {
    if (result.saved) {
      go(`/proyectos/${result.project.id}`) // el candado sigue puesto: la página se reemplaza
      return
    }
    setPending(result)
    setError(failMessage)
    onPartial?.()
    release()
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (lock.current || pending) return
    const clean = normalizeProjectName(name)
    if (!clean) return setNameError('Escribe un nombre para tu proyecto.')
    lock.current = true
    setBusy(true)
    setError(null)
    try {
      finish(await createFromTemplate(api, { name: clean, kind, templateId }), SAVE_FAILED)
    } catch (err) {
      setError(friendlyMessage(err))
      release()
    }
  }

  async function retry() {
    if (!pending || lock.current) return
    lock.current = true
    setBusy(true)
    const result = await retrySaveTemplate(api, pending)
    finish(result, friendlyMessage(result.error))
  }

  return { name, setName, kind, chooseKind, templateId, setTemplateId, busy, pending, nameError, error, reset, submit, retry }
}
