import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isAdminUser, TeamAccessError, assertUserHasTeam } from "@/lib/team-access";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(request.url);
    const teamIdParam = searchParams.get("teamId");

    let teamId: string;
    if (isAdminUser(user)) {
      if (!teamIdParam) {
        return NextResponse.json({ error: "Informe teamId" }, { status: 400 });
      }
      teamId = teamIdParam;
    } else {
      try {
        assertUserHasTeam(user);
        teamId = user.teamId!;
      } catch (err) {
        if (err instanceof TeamAccessError) {
          return NextResponse.json({ error: err.message }, { status: 403 });
        }
        throw err;
      }
    }

    const members = await prisma.user.findMany({
      where: { teamId, isActive: true },
      orderBy: [{ role: "desc" }, { name: "asc" }],
      select: { id: true, name: true, role: true },
    });

    return NextResponse.json({ members });
  });
}
