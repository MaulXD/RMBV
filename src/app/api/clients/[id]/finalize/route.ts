import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getClientIfAllowed } from "@/lib/client-access";
import { formatClientForApi } from "@/lib/client-fields";
import { clientListInclude } from "@/lib/client-query";
import { canFinalizeClients } from "@/lib/roles";
export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    if (!canFinalizeClients(user)) {
      return NextResponse.json(
        { error: "Somente Gerente, ADV ou Administrador podem finalizar clientes" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const client = await getClientIfAllowed(id, user);
    if (!client) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }

    if (client.workflowStatus === "FINALIZADO") {
      return NextResponse.json({ error: "Cliente já está finalizado" }, { status: 400 });
    }

    if (client.workflowStatus !== "FINALIZACAO_SOLICITADA") {
      return NextResponse.json(
        {
          error:
            "O cliente precisa ter uma solicitação de finalização antes de ser concluído.",
        },
        { status: 400 }
      );
    }

    const updated = await prisma.client.update({
      where: { id },
      data: {
        workflowStatus: "FINALIZADO",
        finalizedAt: new Date(),
        finalizedById: user.id,
      },
      include: clientListInclude,
    });

    return NextResponse.json({
      client: formatClientForApi(updated),
      message: "Cliente finalizado com sucesso.",
    });
  });
}
