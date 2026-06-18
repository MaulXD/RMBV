import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { assertUserHasTeam, isAdminUser } from "@/lib/team-access";

import { ONBOARDING_STEPS } from "@/lib/onboarding";

export const runtime = "nodejs";

const bodySchema = z.object({
  step: z.string().min(1),
  dismissed: z.boolean().optional(),
});

export async function GET() {
  return withAuth(async (user) => {
    const row = await prisma.userOnboarding.findUnique({ where: { userId: user.id } });
    const steps = ONBOARDING_STEPS[user.role] ?? ONBOARDING_STEPS.COLABORADOR;
    const completed = (row?.completedSteps as string[] | null) ?? [];
    return NextResponse.json({
      dismissed: row?.dismissed ?? false,
      completedSteps: completed,
      steps,
      nextStep: steps.find((s) => !completed.includes(s.title)) ?? null,
    });
  });
}

export async function PATCH(request: Request) {
  return withAuth(async (user) => {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const existing = await prisma.userOnboarding.findUnique({ where: { userId: user.id } });
    const completed = new Set<string>((existing?.completedSteps as string[]) ?? []);
    if (parsed.data.step) completed.add(parsed.data.step);

    const row = await prisma.userOnboarding.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        completedSteps: [...completed],
        dismissed: parsed.data.dismissed ?? false,
      },
      update: {
        completedSteps: [...completed],
        ...(parsed.data.dismissed !== undefined ? { dismissed: parsed.data.dismissed } : {}),
      },
    });

    return NextResponse.json({ ok: true, onboarding: row });
  });
}
