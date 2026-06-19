import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const upsertSchema = z.object({
  userId: z.string(),
  allowedDays: z.array(z.number().int().min(0).max(6)).min(1),
  startHour: z.number().int().min(0).max(23),
  endHour: z.number().int().min(1).max(24),
  enabled: z.boolean().optional().default(true),
});

export async function GET(request: Request) {
  return withAuth(async (user) => {
    if (user.role !== "ADMIN" && user.role !== "ADV" && user.role !== "GERENTE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const teamId = user.role === "ADMIN"
      ? (new URL(request.url).searchParams.get("teamId") ?? undefined)
      : (user.teamId ?? undefined);

    const rules = await prisma.userAccessRule.findMany({
      where: teamId ? { teamId } : {},
      include: { user: { select: { id: true, name: true, role: true } } },
    });
    return NextResponse.json({ rules });
  });
}

export async function POST(request: Request) {
  return withAuth(async (user) => {
    if (user.role !== "ADMIN" && user.role !== "ADV") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

    const { userId, allowedDays, startHour, endHour, enabled } = parsed.data;

    // Verify target user belongs to same team
    const target = await prisma.user.findUnique({ where: { id: userId }, select: { teamId: true, role: true } });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (user.role !== "ADMIN" && target.teamId !== user.teamId)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (target.role === "ADMIN" || target.role === "ADV")
      return NextResponse.json({ error: "Não é possível restringir ADV ou ADMIN" }, { status: 400 });

    const teamId = target.teamId!;
    const rule = await prisma.userAccessRule.upsert({
      where: { userId },
      create: { userId, teamId, allowedDays: JSON.stringify(allowedDays), startHour, endHour, enabled },
      update: { allowedDays: JSON.stringify(allowedDays), startHour, endHour, enabled },
    });
    return NextResponse.json(rule);
  });
}
