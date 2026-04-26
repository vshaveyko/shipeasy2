import { NextResponse, type NextRequest } from "next/server";

/**
 * CORS for the admin REST API.
 *
 * The devtools overlay can be embedded on any customer site and authenticates
 * with a Bearer admin SDK key (no cookies, no CSRF surface). That auth model
 * is fundamentally cross-origin, so we mirror the request's `Origin` back —
 * the admin token already gates access. Cookies remain off-limits
 * (`Allow-Credentials` stays false) so the dashboard's session cookie can't
 * be exfiltrated by a malicious origin.
 *
 * For the same-origin dashboard (Next.js form actions, server components),
 * the `Origin` header equals the host and the headers are no-ops.
 */
const ADMIN_API_PREFIX = "/api/admin";

function corsHeaders(origin: string | null): Headers {
  const h = new Headers();
  // Echo the caller's origin (or `*` if absent). With Allow-Credentials:false
  // either is safe; echoing keeps us flexible if we ever flip credentials on.
  h.set("Access-Control-Allow-Origin", origin ?? "*");
  h.set("Vary", "Origin");
  h.set("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
  h.set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-SDK-Key");
  h.set("Access-Control-Max-Age", "600");
  return h;
}

export function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith(ADMIN_API_PREFIX)) return NextResponse.next();

  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
  }

  const res = NextResponse.next();
  for (const [k, v] of corsHeaders(origin)) res.headers.set(k, v);
  return res;
}

export const config = {
  matcher: ["/api/admin/:path*"],
};
