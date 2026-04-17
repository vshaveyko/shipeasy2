import { ApiError, findProjectById, getPlan, type Plan } from "@shipeasy/core";
import { getEnvAsync } from "./env";

export async function loadProjectPlan(projectId: string): Promise<Plan> {
  const env = await getEnvAsync();
  const project = await findProjectById(env.DB, projectId);
  if (!project) throw new ApiError("Project not found", 404);
  return getPlan(project.plan);
}

export async function loadProject(projectId: string) {
  const env = await getEnvAsync();
  const project = await findProjectById(env.DB, projectId);
  if (!project) throw new ApiError("Project not found", 404);
  return project;
}
