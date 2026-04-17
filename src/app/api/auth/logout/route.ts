import { ADMIN_COOKIE } from "@/lib/auth";
import { enforceSameOrigin, jsonNoStore } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const sameOriginError = enforceSameOrigin(req);
  if (sameOriginError) return sameOriginError;

  const res = jsonNoStore({ ok: true });
  res.cookies.set({
    name: ADMIN_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
