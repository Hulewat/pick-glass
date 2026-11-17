import { NextResponse } from "next/server";
import { COOKIE, passHash } from "@/lib/auth";

export async function POST(req: Request) {
  const { pass } = (await req.json().catch(() => ({}))) as { pass?: string };
  const expected = process.env.STUDIO_PASSCODE;
  if (!expected) return NextResponse.json({ ok: true });
  if (!pass || pass !== expected) return NextResponse.json({ error: "That passcode isn't right." }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await passHash(expected), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
  return res;
}
