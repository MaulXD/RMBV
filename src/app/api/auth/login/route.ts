import { NextResponse } from "next/server";
import { authenticateUser, createSessionToken, setSessionCookie } from "@/lib/auth";
import { assertAuthEnv, getAuthErrorMessage } from "@/lib/auth-errors";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: Request) {
  try {
    assertAuthEnv();

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

    // Check access time rule (skip for ADMIN, ADV, GERENTE)
    if (user.role === "COLABORADOR") {
      const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      const now = new Date();
      const dayOfWeek = now.getDay();
      const hour = now.getHours();

      const individual = await prisma.userAccessRule.findUnique({ where: { userId: user.id } });

      if (individual && individual.enabled) {
        const allowedDays: number[] = JSON.parse(individual.allowedDays);
        if (!allowedDays.includes(dayOfWeek) || hour < individual.startHour || hour >= individual.endHour) {
          const daysStr = allowedDays.map((d) => dayNames[d]).join(", ");
          return NextResponse.json(
            { error: `Acesso bloqueado. Seu horário permitido: ${daysStr}, ${individual.startHour}h–${individual.endHour}h.` },
            { status: 403 }
          );
        }
      } else if (user.teamId) {
        const team = await prisma.team.findUnique({
          where: { id: user.teamId },
          select: { scheduleEnabled: true, scheduleDays: true, scheduleStart: true, scheduleEnd: true },
        });
        if (team && team.scheduleEnabled) {
          const allowedDays: number[] = JSON.parse(team.scheduleDays);
          if (!allowedDays.includes(dayOfWeek) || hour < team.scheduleStart || hour >= team.scheduleEnd) {
            const daysStr = allowedDays.map((d) => dayNames[d]).join(", ");
            return NextResponse.json(
              { error: `Acesso bloqueado. Horário da equipe: ${daysStr}, ${team.scheduleStart}h–${team.scheduleEnd}h.` },
              { status: 403 }
            );
          }
        }
      }
    }

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
