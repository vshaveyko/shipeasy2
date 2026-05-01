import { NextResponse, type NextRequest } from "next/server";

// Inject the raw URL search string as a header so server components (and the
// Shipeasy server SDK) can read it without a dependency on Next.js internals.
export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-se-search", request.nextUrl.search);
  return NextResponse.next({ request: { headers: requestHeaders } });
}
