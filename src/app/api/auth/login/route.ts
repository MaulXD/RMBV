import { NextResponse } from "next/server";
import { authenticateUser, createSessionToken, setSessionCookie } from "@/lib/auth";
import { assertAuthEnv, getAuthErrorMessage } from "@/lib/auth-errors";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: Request) {
  try {
    assertAuthEnv();

    const ip = getClientIp(request);
    const rl = checkRateLimit(`login:${ip}`);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Muitas tentativas. Tente novamente em ${Math.ceil(rl.retryAfterSecs / 60)} minuto(s).` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const login = String(body.login ?? body.email ?? "").trim();
    const password = String(body.password ?? "");

    if (!login || !password) {
      return NextResponse.json({ error: "Login e senha obrigatórios" }, { status: 400 });
    }

    const user = await authenticateUser(login, password);
    if (!user) {
      return NextResponse.json(
        {
          error:
            "Credenciais inválidas ou usuário inexistente. Em produção, confirme se o seed foi executado no banco online.",
        },
        { status: 401 }
      );
    }

    // Reset rate limit on success
    resetRateLimit(`login:${ip}`);

    // Record session
    void prisma.userSession.create({
      data: {
        userId: user.id,
        ipAddress: getClientIp(request),
        userAgent: request.headers.get("user-agent") ?? null,
      },
    }).catch(() => {});

    const token = await createSessionToken(user);
    await setSessionCookie(token);

    return NextResponse.json({ user });
  } catch (err) {
    console.error("[auth/login]", err);
    const { message, status } = getAuthErrorMessage(err);
    return NextResponse.json({ error: message }, { status });
  }
}
