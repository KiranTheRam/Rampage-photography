import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { ADMIN_SESSION_MAX_AGE_SECONDS } from "@/lib/security";

const COOKIE_NAME = "rampage_admin";

function passwordHash(): string | null {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return null;
  return createHash("sha256").update(pw).digest("hex");
}

export function authConfigError(): string | null {
  if (!process.env.ADMIN_PASSWORD) return "ADMIN_PASSWORD is required.";
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    return "ADMIN_SESSION_SECRET must be set to a random value at least 32 characters long.";
  }
  return null;
}

export function verifyPassword(candidate: string): boolean {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  if (candidate.length > 512) return false;
  const a = createHash("sha256").update(pw).digest();
  const b = createHash("sha256").update(candidate).digest();
  return timingSafeEqual(a, b);
}

function sessionSecret(): string | null {
  const error = authConfigError();
  if (error) return null;
  return process.env.ADMIN_SESSION_SECRET!;
}

function sessionSignature(expiresAt: number, nonce: string): string | null {
  const secret = sessionSecret();
  const pwHash = passwordHash();
  if (!secret || !pwHash) return null;
  return createHmac("sha256", secret)
    .update(`${expiresAt}.${nonce}.${pwHash}`)
    .digest("base64url");
}

export function issueSessionToken(): string | null {
  const expiresAt = Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE_SECONDS;
  const nonce = randomBytes(16).toString("base64url");
  const signature = sessionSignature(expiresAt, nonce);
  if (!signature) return null;
  return `${expiresAt}.${nonce}.${signature}`;
}

export async function isAuthed(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const [expiresRaw, nonce, signature] = token.split(".");
  if (!expiresRaw || !nonce || !signature) return false;
  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) {
    return false;
  }
  const expected = sessionSignature(expiresAt, nonce);
  if (!expected) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const ADMIN_COOKIE = COOKIE_NAME;
