import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, passHash } from "./lib/auth";

export async function middleware(req: NextRequest) {
  const pass = process.env.STUDIO_PASSCODE;
  if (!pass) return NextResponse.next();
  const { pathname } = req.nextUrl;
  if (pathname === "/login" || pathname === "/api/login") return NextResponse.next();
  if (req.cookies.get(COOKIE)?.value === (await passHash(pass))) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!_next/|favicon.ico).*)"] };
