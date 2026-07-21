import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  return withAuth(async (user) => {
    if (!user.teamId) {
      return NextResponse.json({ config: null });
    }

    const config = await prisma.whatsAppConfig.findUnique({
      where: { teamId: user.teamId },
      select: {
        id: true,
        instanceId: true,
        token: true,
        phone: true,
        isActive: true,
      },
    });

    return NextResponse.json({ config: config ?? null });
  });
}

export async function PUT(request: Request) {
  return withAuth(async (user) => {
    if (user.role !== "ADMIN" && user.role !== "GERENTE" && user.role !== "ADV") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    if (!user.teamId) {
      return NextResponse.json({ error: "Usuário sem equipe" }, { status: 400 });
    }

    const body = await request.json();
    const { instanceId, token, phone } = body as {
      instanceId?: string;
      token?: string;
      phone?: string;
    };

    if (!instanceId?.trim() || !token?.trim()) {
      return NextResponse.json(
        { error: "instanceId e token são obrigatórios" },
        { status: 400 }
      );
    }

    const config = await prisma.whatsAppConfig.upsert({
      where: { teamId: user.teamId },
      create: {
        teamId: user.teamId,
        instanceId: instanceId.trim(),
        token: token.trim(),
        phone: phone?.trim() || null,
      },
      update: {
        instanceId: instanceId.trim(),
        token: token.trim(),
        phone: phone?.trim() || null,
      },
      select: {
        id: true,
        instanceId: true,
        token: true,
        phone: true,
        isActive: true,
      },
    });

    return NextResponse.json({ config });
  });
}
