import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/auth";

// Only guards the pages/routes an authenticated staff/driver session is
// actually required for. The customer-facing /track pages and the chat
// agent stay fully public on purpose.
export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  if (session) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return Response.json(
      { error: "Unauthorized — sign in at /dispatch first" },
      { status: 401 }
    );
  }

  return NextResponse.redirect(new URL("/dispatch", request.url));
}

export const config = {
  matcher: ["/dispatch/console", "/api/agents/exceptions", "/api/agents/dispatch"],
};
