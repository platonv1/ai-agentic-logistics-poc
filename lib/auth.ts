import { jwtVerify, SignJWT } from "jose";

export type StaffRole = "staff" | "driver";

export interface StaffAccount {
  username: string;
  password: string;
  role: StaffRole;
  displayName: string;
}

/**
 * Prototype demo accounts only — plaintext, hardcoded, no user database.
 * This matches the rest of this POC's "no database" design and is documented
 * openly in USER-GUIDE.md. Not how a real staff/driver login would work.
 */
export const STAFF_ACCOUNTS: StaffAccount[] = [
  { username: "staff", password: "staff123", role: "staff", displayName: "Dispatch Staff" },
  { username: "driver", password: "driver123", role: "driver", displayName: "Driver" },
];

export const SESSION_COOKIE_NAME = "dispatch_session";
const SESSION_DURATION = "8h";
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

export interface SessionPayload {
  username: string;
  role: StaffRole;
  displayName: string;
}

function getSecretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export function findAccount(username: string, password: string): StaffAccount | null {
  return (
    STAFF_ACCOUNTS.find((a) => a.username === username && a.password === password) ?? null
  );
}

export async function signSession(account: StaffAccount): Promise<string> {
  return new SignJWT({
    username: account.username,
    role: account.role,
    displayName: account.displayName,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSecretKey());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (
      typeof payload.username !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.displayName !== "string"
    ) {
      return null;
    }
    return {
      username: payload.username,
      role: payload.role as StaffRole,
      displayName: payload.displayName,
    };
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE = SESSION_MAX_AGE_SECONDS;
