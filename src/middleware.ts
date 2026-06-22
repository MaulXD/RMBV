import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PREFIX_PATHS = [
  "/login",
  "/primeiro-acesso",
  "/kiosk",
  "/api/auth/login",
  "/api/health",
];

function isPublicApiPonto(pathname: string, method: string) {
  if (pathname === "/api/ponto" && method === "POST") return true;
  if (pathname === "/api/ponto/match" && method === "POST") return true;
  return false;
}

function isPublicCron(pathname: string, request: NextRequest) {
  return pathname === "/api/cron/purge-retention" && request.method === "GET";
}
const COOKIE_NAME = "gestao_session";

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

async function hasValidSession(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const secret = getSecret();
  if (!secret) return false;
  try {
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

function isPublicPath(pathname: string, request: NextRequest) {
  if (pathname === "/") return true;
  if (isPublicApiPonto(pathname, request.method)) return true;
  if (isPublicCron(pathname, request)) return true;
  return PUBLIC_PREFIX_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.endsWith(".ico")
  ) {
    return NextResponse.next();
  }

  const isPublic = isPublicPath(pathname, request);

  if (isPublic) {
    if ((pathname === "/login" || pathname === "/") && (await hasValidSession(request))) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  const authenticated = await hasValidSession(request);

  if (!authenticated) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
