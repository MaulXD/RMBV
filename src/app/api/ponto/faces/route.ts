import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Público — retorna descritores faciais de uma equipe para matching client-side
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get("teamId");

  if (!teamId) {
    return NextResponse.json({ error: "teamId obrigatório" }, { status: 400 });
  }

  const allUsers = await prisma.user.findMany({
    where: { teamId, isActive: true },
    select: { id: true, name: true, faceDescriptor: true },
  });

  const users = allUsers.filter((u) => u.faceDescriptor !== null);

  return NextResponse.json({ users });
}
