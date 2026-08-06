import { cookies } from "next/headers";
import { verifyToken, type SessionPayload } from "./jwt";

const SESSION_COOKIE = "session";

export function getSessionCookieName(): string {
  return SESSION_COOKIE;
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function isAuthenticated(session: SessionPayload | null): boolean {
  return session !== null && typeof session.userId === "number";
}
