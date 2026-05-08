import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { auth } from "@/auth";
import { getEnvAsync } from "@/lib/env";
import { findProjectById, listProjectsByEmail } from "@shipeasy/core";

export default async function DashboardRootPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/signin");

  const email = session.user?.email ?? "";
  const sessionProjectId = session.user?.project_id ?? "";
  const cookieStore = await cookies();
  const cookieProjectId = cookieStore.get("active_project_id")?.value ?? "";

  const env = await getEnvAsync().catch(() => null);

  let target: string | null = null;

  // Prefer the cookie/session-provided projectId. Use DB only to verify
  // ownership when the DB is reachable; if the lookup fails (DB unavailable,
  // schema not yet migrated, etc.) fall back to trusting the session value
  // — the [projectId]/layout still enforces access on the destination.
  async function verify(id: string | undefined | null): Promise<string | null> {
    if (!id) return null;
    if (!env) return id;
    try {
      const proj = await findProjectById(env.DB, id);
      if (!proj) return id; // schema/data may be missing in dev — trust input
      if (proj.ownerEmail === email) return proj.id;
      return null;
    } catch {
      return id;
    }
  }

  target = await verify(cookieProjectId);
  if (!target) target = await verify(sessionProjectId);
  if (!target && env) {
    const list = await listProjectsByEmail(env.DB, email).catch(() => []);
    target = list[0]?.id ?? null;
  }

  if (!target) redirect("/dashboard/projects/new");

  // Honor `?next=/dashboard/<feature>/...` (set by middleware when it
  // intercepts a legacy URL with no active-project cookie). Inject the
  // resolved projectId between /dashboard/ and the rest.
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;

  // Forward all non-`next` query params on the redirect so triggers like
  // `?se`, `?se_devtools`, `?se_edit_labels`, and `?se_*` overrides survive
  // the project-resolving hop.
  const forwarded = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (k === "next" || v === undefined) continue;
    if (Array.isArray(v)) v.forEach((item) => forwarded.append(k, item));
    else forwarded.append(k, v);
  }
  const qs = forwarded.toString();
  const suffix = qs ? `?${qs}` : "";

  if (next && next.startsWith("/dashboard/") && !next.startsWith(`/dashboard/${target}`)) {
    const remainder = next.slice("/dashboard/".length);
    redirect(`/dashboard/${target}/${remainder}${suffix}`);
  }

  redirect(`/dashboard/${target}${suffix}`);
}
