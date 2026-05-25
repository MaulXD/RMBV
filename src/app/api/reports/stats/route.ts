import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getReadableCategoryIds } from "@/lib/permissions";
import { STATUS_OPTIONS } from "@/lib/client-fields";

export async function GET() {
  return withAuth(async (user) => {
    const readableIds = await getReadableCategoryIds(user);

    const baseWhere = {
      categories: { some: { categoryId: { in: readableIds } } },
    };

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
