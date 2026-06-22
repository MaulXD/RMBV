import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { getScheduleAccess } from "@/lib/schedule-access";

export const runtime = "nodejs";

export async function GET() {
  return withAuth(
    async (user) => {
      const access = await getScheduleAccess(user);
      return NextResponse.json({
        allowed: access.allowed,
        source: access.source,
        startHour: access.startHour,
        endHour: access.endHour,
        allowedDays: access.allowedDays,
      });
    },
    { skipSchedule: true },
  );
}
