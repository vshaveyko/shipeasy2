import { NextResponse, type NextRequest } from "next/server";
import { encode } from "next-auth/jwt";

const SESSION_COOKIE = "authjs.session-token";
const ONE_DAY = 60 * 60 * 24;

// Dev-only helper: mint an auth.js session cookie for the seeded e2e fixture
// user and redirect to the requested dashboard page. Refuses to run in
// production so it cannot be used as a back-door.
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("dev-login disabled in production", { status: 403 });
  }
  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId") ?? "e2e-project-id";
  const next = url.searchParams.get("next") ?? `/dashboard/${projectId}`;

  const secret = process.env.AUTH_SECRET;
  if (!secret) return new NextResponse("AUTH_SECRET not set", { status: 500 });

  const token = await encode({
    token: {
      sub: "e2e-user-id",
      id: "e2e-user-id",
      name: "E2E Test User",
      email: "e2e@shipeasy.test",
      picture: null,
      project_id: projectId,
    },
    secret,
    salt: SESSION_COOKIE,
    maxAge: ONE_DAY,
  });

  const res = NextResponse.redirect(new URL(next, url.origin));
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_DAY,
  });
  res.cookies.set("active_project_id", projectId, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_DAY,
  });
  return res;
}
