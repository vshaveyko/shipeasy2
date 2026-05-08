import { NextResponse, type NextRequest } from "next/server";

// Top-level dashboard segments that are NOT project-scoped (workspace-level).
const WORKSPACE_SCOPED = new Set(["projects", "team", "billing"]);

// Top-level dashboard segments that ARE project-scoped — these used to live
// at /dashboard/<seg>/... but now live at /dashboard/<projectId>/<seg>/...
// Anything not in WORKSPACE_SCOPED and not in this set is treated as a
// projectId in the URL.
const PROJECT_SCOPED_SEGMENTS = new Set([
  "gates",
  "configs",
  "experiments",
  "metrics",
  "i18n",
  "feedback",
  "keys",
  "settings",
  "bugs",
  "feature-requests",
]);

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const match = pathname.match(/^\/dashboard\/([^/]+)(\/.*)?$/);
  if (!match) return NextResponse.next();

  const segment = match[1]!;
  const rest = match[2] ?? "";

  // Workspace-scoped routes pass through untouched.
  if (WORKSPACE_SCOPED.has(segment)) return NextResponse.next();

  // Legacy project-scoped path (no projectId in URL): redirect to the
  // active project's URL so /dashboard/gates becomes /dashboard/<active>/gates.
  if (PROJECT_SCOPED_SEGMENTS.has(segment)) {
    const activeProjectId = req.cookies.get("active_project_id")?.value ?? "";
    if (!activeProjectId) {
      // No cookie yet — defer to /dashboard which can resolve the user's
      // active project from the session, then continue to the requested page.
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      url.searchParams.set("next", `${pathname}${search}`);
      return NextResponse.redirect(url);
    }
    const url = req.nextUrl.clone();
    url.pathname = `/dashboard/${activeProjectId}/${segment}${rest}`;
    url.search = search;
    return NextResponse.redirect(url);
  }

  // Otherwise, the segment is treated as a projectId — sync the cookie so
  // `session.user.project_id` (and any cookie-driven helpers) reflect the URL.
  const projectId = segment;
  const cookieProjectId = req.cookies.get("active_project_id")?.value ?? "";
  if (cookieProjectId === projectId) return NextResponse.next();

  const requestHeaders = new Headers(req.headers);
  const existing = requestHeaders.get("cookie") ?? "";
  const stripped = existing
    .split(";")
    .map((c) => c.trim())
    .filter((c) => c && !c.startsWith("active_project_id="));
  stripped.push(`active_project_id=${projectId}`);
  requestHeaders.set("cookie", stripped.join("; "));

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.cookies.set("active_project_id", projectId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}

export const config = {
  matcher: "/dashboard/:path*",
};
