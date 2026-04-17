import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "rampage_admin";

function expectedToken(): string | null {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return null;
  return createHash("sha256").update(pw).digest("hex");
}

export function verifyPassword(candidate: string): boolean {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  const a = Buffer.from(pw);
  const b = Buffer.from(candidate);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function tokenFromPassword(): string | null {
  return expectedToken();
}

export async function isAuthed(): Promise<boolean> {
  const expected = expectedToken();
  if (!expected) return false;
  const store = await cookies();
  const got = store.get(COOKIE_NAME)?.value;
  if (!got) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(got);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const ADMIN_COOKIE = COOKIE_NAME;
