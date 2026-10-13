import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Pruebas estáticas de las migraciones: las de comportamiento (RLS, disparadores) están en supabase/tests y necesitan la base local.
const repo = fileURLToPath(new URL('..', import.meta.url))
const dir = join(repo, 'supabase', 'migrations')
const files = readdirSync(dir).sort()
const read = (name: string) => readFileSync(join(dir, name), 'utf8')

describe('migración 004 (analysis_usage)', () => {
  const name = files.find((f) => /_004_analysis_usage\.sql$/.test(f))
  const sql = name ? read(name) : ''

  it('existe, con timestamp posterior al de la 003', () => {
    expect(name, 'falta supabase/migrations/<timestamp>_004_analysis_usage.sql').toBeDefined()
    const previous = files.find((f) => /_003_limits\.sql$/.test(f)) as string
    expect((name as string).slice(0, 14) > previous.slice(0, 14)).toBe(true)
  })

  it('crea la tabla con RLS y sin acceso para anon en la misma migración (.claude/rules/datos-y-rls.md)', () => {
    expect(sql).toMatch(/create table public\.analysis_usage/)
    expect(sql).toMatch(/alter table public\.analysis_usage enable row level security/)
    expect(sql).toMatch(/revoke all on public\.analysis_usage from anon/)
  })

  it('cada persona solo puede insertar y leer lo suyo: hay políticas para select e insert y ninguna para update ni delete', () => {
    expect(sql).toMatch(/create policy \w+ on public\.analysis_usage for select to authenticated\s+using \(user_id = \(select auth\.uid\(\)\)\)/)
    expect(sql).toMatch(/create policy \w+ on public\.analysis_usage for insert to authenticated\s+with check \(user_id = \(select auth\.uid\(\)\)\)/)
    expect(sql).not.toMatch(/create policy \w+ on public\.analysis_usage for (update|delete|all)/)
    expect(sql).toMatch(/revoke update, delete[^;]* on public\.analysis_usage from authenticated/)
  })

  it('tiene el índice por persona y hora', () => {
    expect(sql).toMatch(/create index \w+ on public\.analysis_usage \(user_id, created_at/)
  })

  it('el disparador repite el tope del contrato (ANALYSES_PER_HOUR) y la ventana de una hora', () => {
    const contract = readFileSync(join(repo, 'packages', 'contract', 'src', 'analyze-room.ts'), 'utf8')
    const perHour = Number(/ANALYSES_PER_HOUR = (\d+)/.exec(contract)?.[1])
    expect(perHour).toBeGreaterThan(0)
    expect(sql).toMatch(new RegExp(`>= ${perHour}\\b`))
    expect(sql).toContain(`límite de ${perHour} análisis por hora`)
    expect(sql).toMatch(/interval '1 hour'/)
    expect(sql).toMatch(/errcode = '53400'/)
    expect(sql).toMatch(/pg_advisory_xact_lock/)
    expect(sql).toMatch(/set search_path = ''/)
  })
})
