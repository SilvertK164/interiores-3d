import { levelDisplayName } from '@/lib/editor-names'
import type { PlanBuildArgs, PlanDeps, PlanLevel, PlanResult } from '@/lib/export/types'

export type { PlanDeps } from '@/lib/export/types'

/** Exportar plano: medir las plantas y armar el PDF. Todo lo que el diálogo sabe de Pascal está aquí (D13). */
export function createPlanSlice(deps: PlanDeps) {
  return {
    plan: {
      /** Las plantas del edificio activo, de la más baja a la más alta, con su nombre en castellano (`Planta baja`, `Planta 1`, `Sótano 1`). */
      async measureLevels(): Promise<PlanLevel[]> {
        const levels = await deps.measureLevels()
        return levels.map((level) => ({
          id: level.id,
          label: levelDisplayName({ name: level.name, level: level.level }),
          widthM: level.widthM,
          heightM: level.heightM,
          empty: level.empty,
        }))
      },
      build(args: PlanBuildArgs): Promise<PlanResult> {
        return deps.buildPlan(args)
      },
    },
  }
}
