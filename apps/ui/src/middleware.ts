import { NextResponse, type NextRequest } from "next/server";

// opennextjs-cloudflare doesn't support Next.js 16's new Node.js-runtime
// proxy/middleware — it errors with "Node.js middleware is not currently
// supported". Pin to the Edge runtime so the build succeeds. Next 16's
// default for proxy.ts is nodejs.
export const runtime = "edge";

// Inject the raw URL search string as a header so server components (and the
// Shipeasy server SDK) can read it without a dependency on Next.js internals.
export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-se-search", request.nextUrl.search);
  return NextResponse.next({ request: { headers: requestHeaders } });
}
