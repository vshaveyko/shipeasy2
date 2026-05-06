import { NextResponse, type NextRequest } from "next/server";

// Inject the raw URL search string as a header so server components (and the
// Shipeasy server SDK) can read it without a dependency on Next.js internals.
//
// Uses the legacy `middleware.ts` (Edge runtime) instead of Next 16's new
// `proxy.ts`. proxy.ts always runs on the Node.js runtime with no opt-out,
// and opennextjs-cloudflare 1.19.x can't bundle Node-runtime middleware —
// the build dies with "Route segment config is not allowed in Proxy file".
// Migrate back to proxy.ts once opennext supports the Node runtime.
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-se-search", request.nextUrl.search);
  return NextResponse.next({ request: { headers: requestHeaders } });
}
