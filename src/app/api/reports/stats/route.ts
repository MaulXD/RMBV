import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { buildClientWhere } from "@/lib/client-query";
import { STATUS_OPTIONS } from "@/lib/client-fields";
export const runtime = "nodejs";

export async function GET(request: Request) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const teseId = searchParams.get("teseId");

    const baseWhere = await buildClientWhere(user, { status, teseId });

    const total = await prisma.client.count({ where: baseWhere });

    const byStatus = await Promise.all(
      STATUS_OPTIONS.map(async ({ value, label }) => ({
        status: value,
        label,
        count: await prisma.client.count({
          where: { ...baseWhere, status: value },
        }),
      }))
    );

    return NextResponse.json({ total, byStatus });
  });
}
