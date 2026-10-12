import { describe, expect, it } from 'vitest'
import { type KeyEventLike, type KeyFamily, keyFamilies, shouldTrap } from '../src/editor/shell/key-guard'

const press = (key: string, extra: Partial<KeyEventLike> = {}): KeyEventLike => ({
  key,
  code: /^[a-z]$/i.test(key) ? `Key${key.toUpperCase()}` : key,
  ctrlKey: false,
  metaKey: false,
  ...extra,
})

describe('keyFamilies', () => {
  it('las teclas de herramienta de Pascal, con o sin mayúscula', () => {
    for (const key of ['1', '2', '3', 'f', 'z', 'm', 'v', 'b', 'x', 'p', 'g', 'r', 't', 'e', 'c', '[', ']', 'B']) {
      expect(keyFamilies(press(key)), key).toContain('tool')
    }
  })

  it('Supr y Retroceso borran, también con Ctrl; Ctrl o Cmd con C, X o V son el portapapeles', () => {
    expect(keyFamilies(press('Delete'))).toEqual(['delete'])
    expect(keyFamilies(press('Backspace', { ctrlKey: true }))).toEqual(['delete'])
    for (const key of ['c', 'x', 'v']) {
      expect(keyFamilies(press(key, { ctrlKey: true }))).toEqual(['clipboard'])
      expect(keyFamilies(press(key, { metaKey: true }))).toEqual(['clipboard'])
    }
  })

  it('Ctrl o Cmd con Z (en mayúscula si va con Mayús) es el historial', () => {
    expect(keyFamilies(press('z', { ctrlKey: true }))).toEqual(['history'])
    expect(keyFamilies(press('Z', { metaKey: true }))).toEqual(['history'])
  })

  it('W, A, S, D y Espacio desplazan la cámara según la tecla física; la z de un teclado francés es la W física', () => {
    for (const code of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space']) {
      expect(keyFamilies({ ...press('?'), code }), code).toEqual(['pan'])
    }
    expect(keyFamilies({ ...press('z'), code: 'KeyW' })).toEqual(['tool', 'pan'])
  })

  it('Escape, Enter, Tab, las flechas, el cambio de nivel y los atajos de la aplicación no pertenecen a ninguna familia', () => {
    for (const key of ['Escape', 'Enter', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End']) expect(keyFamilies(press(key)), key).toEqual([])
    expect(keyFamilies(press('ArrowUp', { ctrlKey: true }))).toEqual([]) // cambia de nivel: no modifica la escena
    expect(keyFamilies(press('s', { ctrlKey: true }))).toEqual([]) // el guardado es automático y lo ignora Pascal
    expect(keyFamilies(press('k', { ctrlKey: true }))).toEqual([]) // paleta de comandos
  })
})

describe('shouldTrap', () => {
  const FAMILIES: KeyFamily[] = ['tool', 'delete', 'clipboard', 'history', 'pan']
  const trapped = (ctx: { mode: 'ver' | 'editar'; inShell: boolean; editable?: boolean; walking?: boolean }) =>
    FAMILIES.filter((family) => shouldTrap(family, { editable: false, walking: false, ...ctx }))

  it('con el foco en un campo de texto no se frena nada', () => {
    expect(trapped({ mode: 'ver', inShell: true, editable: true })).toEqual([])
    expect(trapped({ mode: 'editar', inShell: true, editable: true })).toEqual([])
  })

  it('en Ver se frena todo lo que modifica, esté donde esté el foco (incluido Deshacer); desplazar solo dentro del shell', () => {
    expect(trapped({ mode: 'ver', inShell: false })).toEqual(['tool', 'delete', 'clipboard', 'history'])
    expect(trapped({ mode: 'ver', inShell: true })).toEqual(FAMILIES)
  })

  it('en Editar se frena con el foco en el shell todo menos el historial; con el foco en el lienzo, nada', () => {
    expect(trapped({ mode: 'editar', inShell: true })).toEqual(['tool', 'delete', 'clipboard', 'pan'])
    expect(trapped({ mode: 'editar', inShell: false })).toEqual([])
  })

  it('durante el recorrido no se frena nada: Pascal apaga sus atajos y las teclas del recorrido son suyas', () => {
    expect(trapped({ mode: 'ver', inShell: true, walking: true })).toEqual([])
    expect(trapped({ mode: 'ver', inShell: false, walking: true })).toEqual([])
  })
})
