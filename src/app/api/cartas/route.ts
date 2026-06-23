import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api";
import { buildClientWhere } from "@/lib/client-query";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const teseId = searchParams.get("teseId");
    const workflowStatus = searchParams.get("workflowStatus");
    const search = searchParams.get("search");

    const where = await buildClientWhere(user, {
      status,
      teseId,
      workflowStatus,
      search,
    });

    const clients = await prisma.client.findMany({
      where,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        cod: true,
        cpf: true,
        status: true,
        cep: true,
        logradouro: true,
        numero: true,
        complemento: true,
        bairro: true,
        cidade: true,
        uf: true,
        teseRef: { select: { id: true, name: true, color: true } },
        categories: { include: { category: { select: { id: true, name: true } } } },
      },
    });

    return NextResponse.json({ clients });
  });
}
