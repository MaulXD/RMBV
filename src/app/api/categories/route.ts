import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getReadableCategoryIds } from "@/lib/permissions";
export const runtime = "nodejs";

export async function GET() {
  return withAuth(async (user) => {
    const readableIds = await getReadableCategoryIds(user);

    const categories = await prisma.category.findMany({
      where: { id: { in: readableIds } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true },
    });

    return NextResponse.json({ categories });
  });
}
