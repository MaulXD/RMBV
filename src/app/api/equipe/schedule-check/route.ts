import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function isWithinSchedule(days: number[], startHour: number, endHour: number): boolean {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  return days.includes(day) && hour >= startHour && hour < endHour;
}

export async function GET() {
  return withAuth(async (user) => {
    if (user.role !== "COLABORADOR" && user.role !== "PESQUISADOR") {
      return NextResponse.json({ allowed: true });
    }

    // Individual rule takes precedence
    const individual = await prisma.userAccessRule.findUnique({
      where: { userId: user.id },
    });

    if (individual && individual.enabled) {
      const days: number[] = (() => { try { return JSON.parse(individual.allowedDays) as number[]; } catch { return [1,2,3,4,5]; } })();
      const allowed = isWithinSchedule(days, individual.startHour, individual.endHour);
      return NextResponse.json({
        allowed,
        source: "individual",
        startHour: individual.startHour,
        endHour: individual.endHour,
        allowedDays: days,
      });
    }

    // Fall back to team schedule
    if (user.teamId) {
      const team = await prisma.team.findUnique({
        where: { id: user.teamId },
        select: { scheduleEnabled: true, scheduleDays: true, scheduleStart: true, scheduleEnd: true },
      });
      if (team && team.scheduleEnabled) {
        const days: number[] = (() => { try { return JSON.parse(team.scheduleDays) as number[]; } catch { return [1,2,3,4,5]; } })();
        const allowed = isWithinSchedule(days, team.scheduleStart, team.scheduleEnd);
        return NextResponse.json({
          allowed,
          source: "team",
          startHour: team.scheduleStart,
          endHour: team.scheduleEnd,
          allowedDays: days,
        });
      }
    }

    return NextResponse.json({ allowed: true, source: "none" });
  });
}
