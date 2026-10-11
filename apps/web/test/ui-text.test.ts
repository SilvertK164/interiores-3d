import { describe, expect, it } from 'vitest'
import {
  greetingForHour,
  initialsFromEmail,
  kindLabel,
  nameFromEmail,
  pluralProjects,
  relativeTime,
  templateMeta,
  whenLabel,
} from '../src/lib/ui-text'

// Fechas en hora local (como las ve la persona): new Date(año, mes0, día, hora, minuto).
const NOW = new Date(2026, 9, 11, 15, 0) // 11 de octubre de 2026, 15:00

describe('greetingForHour', () => {
  it('saluda según la hora del día', () => {
    expect(greetingForHour(5)).toBe('Buenos días')
    expect(greetingForHour(11)).toBe('Buenos días')
    expect(greetingForHour(12)).toBe('Buenas tardes')
    expect(greetingForHour(19)).toBe('Buenas tardes')
    expect(greetingForHour(20)).toBe('Buenas noches')
    expect(greetingForHour(0)).toBe('Buenas noches')
    expect(greetingForHour(4)).toBe('Buenas noches')
  })
})

describe('nameFromEmail', () => {
  it('toma la primera palabra del correo con la inicial en mayúscula', () => {
    expect(nameFromEmail('silvert.quispe@correo.com')).toBe('Silvert')
    expect(nameFromEmail('victoria_villalba@correo.com')).toBe('Victoria')
    expect(nameFromEmail('ANA@correo.com')).toBe('Ana')
  })
  it('ignora números y símbolos del principio y devuelve vacío si no hay letras', () => {
    expect(nameFromEmail('123.maria@correo.com')).toBe('Maria')
    expect(nameFromEmail('1234@correo.com')).toBe('')
    expect(nameFromEmail('')).toBe('')
    expect(nameFromEmail(undefined)).toBe('')
  })
})

describe('initialsFromEmail', () => {
  it('usa la inicial de las dos primeras palabras del correo', () => {
    expect(initialsFromEmail('silvert.quispe@correo.com')).toBe('SQ')
    expect(initialsFromEmail('victoria_villalba-diaz@correo.com')).toBe('VV')
  })
  it('con una sola palabra usa sus dos primeras letras', () => {
    expect(initialsFromEmail('silvert@correo.com')).toBe('SI')
    expect(initialsFromEmail('a@correo.com')).toBe('A')
  })
  it('sin letras devuelve un signo neutro', () => {
    expect(initialsFromEmail('')).toBe('?')
    expect(initialsFromEmail(undefined)).toBe('?')
    expect(initialsFromEmail('123@correo.com')).toBe('?')
  })
})

describe('relativeTime', () => {
  const at = (d: Date) => d.toISOString()
  it('muy reciente y en minutos', () => {
    expect(relativeTime(at(new Date(2026, 9, 11, 14, 59, 40)), NOW)).toBe('hace un momento')
    expect(relativeTime(at(new Date(2026, 9, 11, 14, 25)), NOW)).toBe('hace 35 min')
  })
  it('en horas, hasta 24 horas atrás', () => {
    expect(relativeTime(at(new Date(2026, 9, 11, 13, 0)), NOW)).toBe('hace 2 h')
    expect(relativeTime(at(new Date(2026, 9, 10, 18, 0)), NOW)).toBe('hace 21 h')
  })
  it('"ayer" si fue el día anterior y pasaron más de 24 horas', () => {
    expect(relativeTime(at(new Date(2026, 9, 10, 9, 0)), NOW)).toBe('ayer')
  })
  it('con fecha ("8 de octubre") desde anteayer; con el año si es de otro año', () => {
    expect(relativeTime(at(new Date(2026, 9, 8, 10, 0)), NOW)).toBe('8 de octubre')
    expect(relativeTime(at(new Date(2026, 0, 3, 10, 0)), NOW)).toBe('3 de enero')
    expect(relativeTime(at(new Date(2025, 11, 24, 10, 0)), NOW)).toBe('24 de diciembre de 2025')
  })
  it('una fecha futura (reloj desfasado) cuenta como "hace un momento"', () => {
    expect(relativeTime(at(new Date(2026, 9, 11, 15, 5)), NOW)).toBe('hace un momento')
  })
  it('una fecha inválida no rompe la pantalla', () => {
    expect(relativeTime('no es fecha', NOW)).toBe('hace tiempo')
  })
})

describe('whenLabel', () => {
  it('antepone el texto y agrega "el" solo ante una fecha', () => {
    expect(whenLabel('Editado', new Date(2026, 9, 11, 13, 0).toISOString(), NOW)).toBe('Editado hace 2 h')
    expect(whenLabel('Editado', new Date(2026, 9, 10, 9, 0).toISOString(), NOW)).toBe('Editado ayer')
    expect(whenLabel('Editado', new Date(2026, 9, 8, 10, 0).toISOString(), NOW)).toBe('Editado el 8 de octubre')
    expect(whenLabel('Último cambio', new Date(2026, 9, 11, 13, 0).toISOString(), NOW)).toBe('Último cambio hace 2 h')
  })
})

describe('textos de proyectos y plantillas', () => {
  it('kindLabel', () => {
    expect(kindLabel('vivienda')).toBe('Vivienda')
    expect(kindLabel('comercio')).toBe('Comercio')
    expect(kindLabel(null)).toBe('Sin tipo')
  })
  it('pluralProjects', () => {
    expect(pluralProjects(1)).toBe('1 proyecto')
    expect(pluralProjects(3)).toBe('3 proyectos')
  })
  it('templateMeta junta superficie y niveles', () => {
    expect(templateMeta({ areaM2: 108, levels: 2 })).toBe('108 m² · 2 niveles')
    expect(templateMeta({ areaM2: 140, levels: 1 })).toBe('140 m²')
  })
})
