import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isOfficeGpsConfigured } from "@/lib/gps-ponto";

export const runtime = "nodejs";

/** Configuração GPS relevante para o colaborador bater ponto. */
export async function GET() {
  return withAuth(async (user) => {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        gpsRequired: true,
        gpsRadiusMeters: true,
        team: {
          select: {
            officeLatitude: true,
            officeLongitude: true,
            defaultGpsRadiusMeters: true,
          },
        },
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    const radiusMeters =
      dbUser.gpsRadiusMeters ?? dbUser.team?.defaultGpsRadiusMeters ?? 200;

    return NextResponse.json({
      gpsRequired: dbUser.gpsRequired,
      officeConfigured: isOfficeGpsConfigured(
        dbUser.team?.officeLatitude,
        dbUser.team?.officeLongitude,
      ),
      radiusMeters,
    });
  });
}
