import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";
import { prisma } from "./prisma";
import { normalizeLoginId } from "./login-id";

const COOKIE_NAME = "gestao_session";
const JWT_EXPIRY = "8h";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  teamId: string | null;
  teamName: string | null;
  avatarUrl: string | null;
};

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET não configurado");
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub || !payload.email || !payload.role) return null;
    return {
      id: payload.sub,
      email: String(payload.email),
      name: String(payload.name ?? ""),
      role: payload.role as Role,
      teamId: null,
      teamName: null,
      avatarUrl: null,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await verifySessionToken(token);
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      teamId: true,
      avatarUrl: true,
      team: { select: { name: true } },
    },
  });

  if (!user || !user.isActive) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    teamId: user.teamId,
    teamName: user.team?.name ?? null,
    avatarUrl: user.avatarUrl ?? null,
  };
}

function normalizeLogin(login: string) {
  return String(login ?? "").trim();
}

export async function authenticateUser(login: string, password: string) {
  const raw = normalizeLogin(login);
  const normalized = raw.toLowerCase();

  const adminAlias = process.env.ADMIN_NAME?.trim().toLowerCase() ?? "admin";
  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@sistema.local")
    .trim()
    .toLowerCase();

  const lookup =
    normalized === adminAlias ? adminEmail : normalizeLoginId(raw);

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: lookup }, { name: { equals: raw.trim(), mode: "insensitive" } }],
    },
  });
  if (!user || !user.isActive) return null;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;

  const full = await prisma.user.findUnique({
    where: { id: user.id },
    select: { teamId: true, team: { select: { name: true } } },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    teamId: full?.teamId ?? null,
    teamName: full?.team?.name ?? null,
    avatarUrl: null,
  } satisfies SessionUser;
}
