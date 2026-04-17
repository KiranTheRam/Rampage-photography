import { NextResponse } from "next/server";
import { ADMIN_COOKIE, tokenFromPassword, verifyPassword } from "@/lib/auth";

export async function POST(req: Request) {
  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD not configured on the server." },
      { status: 500 },
    );
  }
  const body = await req.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!verifyPassword(password)) {
    return NextResponse.json(
      { error: "Incorrect password." },
      { status: 401 },
    );
  }
  const token = tokenFromPassword();
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: ADMIN_COOKIE,
    value: token!,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
