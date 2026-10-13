import type {
  CreateProjectBody,
  ProjectCreated,
  ProjectDetail,
  ProjectSummary,
  SceneEnvelope,
  UpdateProjectBody,
} from '@interiores/contract'

export type Ctx = { userId: string; token: string }
export type SaveSceneResult = { kind: 'ok'; version: number } | { kind: 'not_found' } | { kind: 'conflict' }

export interface ProjectStore {
  list(ctx: Ctx): Promise<ProjectSummary[]>
  create(ctx: Ctx, input: CreateProjectBody): Promise<ProjectCreated>
  get(ctx: Ctx, id: string): Promise<ProjectDetail | null>
  update(ctx: Ctx, id: string, patch: UpdateProjectBody): Promise<ProjectSummary | null>
  remove(ctx: Ctx, id: string): Promise<boolean>
  saveScene(ctx: Ctx, id: string, scene: SceneEnvelope, expectedVersion: number): Promise<SaveSceneResult>
}
