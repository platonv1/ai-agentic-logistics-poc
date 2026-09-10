import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { findAccount, signSession, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { username, password } = body as { username?: string; password?: string };

  if (!username || !password) {
    return Response.json({ error: "Username and password are required" }, { status: 400 });
  }

  const account = findAccount(username, password);
  if (!account) {
    return Response.json({ error: "Invalid username or password" }, { status: 401 });
  }

  let token: string;
  try {
    token = await signSession(account);
  } catch {
    return Response.json(
      { error: "Server is missing JWT_SECRET — see USER-GUIDE.md to set it up" },
      { status: 500 }
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return Response.json({ ok: true, role: account.role, displayName: account.displayName });
}
