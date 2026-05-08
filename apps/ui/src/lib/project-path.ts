/** Top-level dashboard segments that are NOT project-scoped. */
export const WORKSPACE_SCOPED_SEGMENTS = new Set(["projects", "team", "billing"]);

/** Build a project-scoped dashboard URL. `subPath` may start with or without "/". */
export function projectPath(projectId: string, subPath: string = ""): string {
  if (!projectId)
    return `/dashboard${subPath ? (subPath.startsWith("/") ? subPath : `/${subPath}`) : ""}`;
  if (!subPath) return `/dashboard/${projectId}`;
  const tail = subPath.startsWith("/") ? subPath : `/${subPath}`;
  return `/dashboard/${projectId}${tail}`;
}

/** Extract the projectId segment from a /dashboard pathname, or null if none. */
export function projectIdFromPathname(pathname: string): string | null {
  const m = pathname.match(/^\/dashboard\/([^/]+)/);
  if (!m) return null;
  const seg = m[1]!;
  if (WORKSPACE_SCOPED_SEGMENTS.has(seg)) return null;
  return seg;
}

/**
 * Replace the projectId segment in a dashboard pathname. Returns the input
 * unchanged if it isn't a project-scoped dashboard path.
 */
export function replaceProjectIdInPath(pathname: string, newProjectId: string): string {
  const m = pathname.match(/^\/dashboard\/([^/]+)(\/.*)?$/);
  if (!m) return `/dashboard/${newProjectId}`;
  const seg = m[1]!;
  const rest = m[2] ?? "";
  if (WORKSPACE_SCOPED_SEGMENTS.has(seg)) return `/dashboard/${newProjectId}`;
  return `/dashboard/${newProjectId}${rest}`;
}
