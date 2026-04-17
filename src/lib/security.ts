import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOGIN_WINDOW_MS = 10 * 60 * 1000;
export const MAX_UPLOAD_FILES = 8;
export const MAX_UPLOAD_FILE_SIZE_BYTES = 30 * 1024 * 1024;
export const MAX_UPLOAD_TOTAL_BYTES = 80 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 60_000_000;
export const MAX_TITLE_LENGTH = 120;
export const MAX_CAPTION_LENGTH = 500;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimits = new Map<string, RateLimitEntry>();

export function jsonNoStore(
  body: unknown,
  init: ResponseInit = {},
): NextResponse {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store, max-age=0");
  headers.set("Pragma", "no-cache");
  return NextResponse.json(body, { ...init, headers });
}

export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

function expectedOrigin(req: Request): string {
  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") || url.protocol.slice(0, -1);
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host;
  return `${proto}://${host}`;
}

export function enforceSameOrigin(req: Request): NextResponse | null {
  const origin = req.headers.get("origin");
  if (!origin) {
    return jsonNoStore({ error: "Forbidden" }, { status: 403 });
  }

  try {
    if (new URL(origin).origin !== expectedOrigin(req)) {
      return jsonNoStore({ error: "Forbidden" }, { status: 403 });
    }
    return null;
  } catch {
    return jsonNoStore({ error: "Forbidden" }, { status: 403 });
  }
}

export function sanitizeText(value: string, maxLength: number): string {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

export function stableId(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 24);
}

export function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const current = rateLimits.get(key);

  if (!current || current.resetAt <= now) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  rateLimits.set(key, current);
  return { allowed: true, retryAfterSeconds: 0 };
}

export function clearRateLimit(key: string): void {
  rateLimits.delete(key);
}
