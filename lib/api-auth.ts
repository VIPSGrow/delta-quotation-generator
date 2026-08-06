import { cookies } from "next/headers";
import { verifyToken } from "./jwt";
import { getSessionCookieName } from "./auth";

/**
 * Verifies the authentication token from cookies.
 * Returns the session payload if valid, otherwise null.
 */
export async function verifyApiSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;
  if (!token) return null;
  return verifyToken(token);
}
