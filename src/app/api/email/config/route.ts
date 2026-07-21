import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const configSchema = z.object({
  host: z.string().min(1, "Host obrigatório"),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean(),
  user: z.string().min(1, "Usuário obrigatório"),
  pass: z.string().min(1, "Senha obrigatória"),
  fromName: z.string().optional(),
  fromEmail: z.string().email("E-mail de origem inválido"),
});

export async function GET() {
  return withAuth(async (user) => {
    if (!user.teamId) {
      return NextResponse.json({ error: "Usuário sem equipe" }, { status: 403 });
    }

    const config = await prisma.emailConfig.findUnique({
      where: { teamId: user.teamId },
    });

    if (!config) {
      return NextResponse.json({ config: null });
    }

    return NextResponse.json({
      config: {
        id: config.id,
        teamId: config.teamId,
        host: config.host,
        port: config.port,
        secure: config.secure,
        user: config.user,
        pass: config.pass ? "***" : "",
        fromName: config.fromName,
        fromEmail: config.fromEmail,
        isActive: config.isActive,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      },
    });
  });
}

export async function PUT(request: Request) {
  return withAuth(async (user) => {
    if (!user.teamId) {
      return NextResponse.json({ error: "Usuário sem equipe" }, { status: 403 });
    }

    if (user.role !== "ADMIN" && user.role !== "GERENTE") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = configSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { host, port, secure, user: smtpUser, pass, fromName, fromEmail } = parsed.data;

    const config = await prisma.emailConfig.upsert({
      where: { teamId: user.teamId },
      create: {
        teamId: user.teamId,
        host,
        port,
        secure,
        user: smtpUser,
        pass,
        fromName: fromName ?? null,
        fromEmail,
        isActive: true,
      },
      update: {
        host,
        port,
        secure,
        user: smtpUser,
        pass,
        fromName: fromName ?? null,
        fromEmail,
        isActive: true,
      },
    });

    return NextResponse.json({
      config: {
        id: config.id,
        teamId: config.teamId,
        host: config.host,
        port: config.port,
        secure: config.secure,
        user: config.user,
        pass: "***",
        fromName: config.fromName,
        fromEmail: config.fromEmail,
        isActive: config.isActive,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      },
    });
  });
}
