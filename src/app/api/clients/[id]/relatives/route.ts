import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  name: z.string().min(1),
  relationship: z.string().min(1),
  phone1: z.string().optional(),
  phone2: z.string().optional(),
  phone3: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (user) => {
    const { id } = await params;
    const client = await prisma.client.findUnique({ where: { id }, select: { teamId: true } });
    if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (user.role !== "ADMIN" && client.teamId !== user.teamId)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const relatives = await prisma.clientRelative.findMany({
      where: { clientId: id },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(relatives);
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (user) => {
    const { id } = await params;
    const client = await prisma.client.findUnique({ where: { id }, select: { teamId: true } });
    if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (user.role !== "ADMIN" && client.teamId !== user.teamId)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

    const relative = await prisma.clientRelative.create({
      data: { clientId: id, ...parsed.data },
    });
    return NextResponse.json(relative);
  });
}
