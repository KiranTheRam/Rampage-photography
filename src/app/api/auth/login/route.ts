import {
  ADMIN_COOKIE,
  authConfigError,
  issueSessionToken,
  secureAuthCookie,
  verifyPassword,
} from "@/lib/auth";
import {
  ADMIN_SESSION_MAX_AGE_SECONDS,
  MAX_LOGIN_ATTEMPTS,
  LOGIN_WINDOW_MS,
  clearRateLimit,
  consumeRateLimit,
  enforceSameOrigin,
  getClientIp,
  jsonNoStore,
} from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const sameOriginError = enforceSameOrigin(req);
  if (sameOriginError) return sameOriginError;

  const authError = authConfigError();
  if (authError) {
    return jsonNoStore({ error: "Login is unavailable." }, { status: 500 });
  }

  const clientKey = `login:${getClientIp(req)}`;
  const rateLimit = consumeRateLimit(
    clientKey,
    MAX_LOGIN_ATTEMPTS,
    LOGIN_WINDOW_MS,
  );
  if (!rateLimit.allowed) {
    return jsonNoStore(
      { error: "Too many login attempts. Try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  const body = await req.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!verifyPassword(password)) {
    return jsonNoStore({ error: "Invalid credentials." }, { status: 401 });
  }

  clearRateLimit(clientKey);
  const token = issueSessionToken();
  if (!token) {
    return jsonNoStore({ error: "Login is unavailable." }, { status: 500 });
  }

  const res = jsonNoStore({ ok: true });
  res.cookies.set({
    name: ADMIN_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "strict",
    secure: secureAuthCookie(),
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });
  return res;
}
