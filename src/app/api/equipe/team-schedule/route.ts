import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withAuth(async (user) => {
    const teamId = user.role === "ADMIN"
      ? (new URL(request.url).searchParams.get("teamId") ?? user.teamId)
      : user.teamId;
    if (!teamId) return NextResponse.json({ error: "Sem equipe" }, { status: 400 });
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { scheduleEnabled: true, scheduleDays: true, scheduleStart: true, scheduleEnd: true },
    });
    if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({
      scheduleEnabled: team.scheduleEnabled,
      scheduleDays: JSON.parse(team.scheduleDays) as number[],
      scheduleStart: team.scheduleStart,
      scheduleEnd: team.scheduleEnd,
    });
  });
}

export async function PATCH(request: Request) {
  return withAuth(async (user) => {
    if (user.role !== "ADV" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // ADMIN can pass ?teamId= to target any team
    const url = new URL(request.url);
    const teamId = user.role === "ADMIN"
      ? (url.searchParams.get("teamId") ?? user.teamId)
      : user.teamId;
    if (!teamId) return NextResponse.json({ error: "Sem equipe" }, { status: 400 });

    const body = await request.json();
    const scheduleEnabled = typeof body.scheduleEnabled === "boolean" ? body.scheduleEnabled : undefined;
    const scheduleDays = Array.isArray(body.scheduleDays) ? (body.scheduleDays as number[]) : undefined;
    const scheduleStart = typeof body.scheduleStart === "number" ? body.scheduleStart : undefined;
    const scheduleEnd = typeof body.scheduleEnd === "number" ? body.scheduleEnd : undefined;

    if ((scheduleStart !== undefined || scheduleEnd !== undefined) &&
        (scheduleStart ?? 0) >= (scheduleEnd ?? 24)) {
      return NextResponse.json({ error: "Hora final deve ser maior que a inicial" }, { status: 400 });
    }

    const updated = await prisma.team.update({
      where: { id: teamId },
      data: {
        ...(scheduleEnabled !== undefined && { scheduleEnabled }),
        ...(scheduleDays !== undefined && { scheduleDays: JSON.stringify(scheduleDays) }),
        ...(scheduleStart !== undefined && { scheduleStart }),
        ...(scheduleEnd !== undefined && { scheduleEnd }),
      },
      select: { scheduleEnabled: true, scheduleDays: true, scheduleStart: true, scheduleEnd: true },
    });

    return NextResponse.json({
      scheduleEnabled: updated.scheduleEnabled,
      scheduleDays: JSON.parse(updated.scheduleDays) as number[],
      scheduleStart: updated.scheduleStart,
      scheduleEnd: updated.scheduleEnd,
    });
  });
}
