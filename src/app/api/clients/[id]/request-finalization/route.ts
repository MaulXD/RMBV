import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  assertCategoryPermission,
  PermissionDeniedError,
} from "@/lib/permissions";
import { getClientIfAllowed } from "@/lib/client-access";
import { formatClientForApi } from "@/lib/client-fields";
import { clientListInclude } from "@/lib/client-query";
import { syncClientTasksOnFinalizationRequest } from "@/lib/task-finalization-sync";
export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    const { id } = await params;
    const client = await getClientIfAllowed(id, user);
    if (!client) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }

    const categoryId = client.categories[0]?.categoryId;
    if (!categoryId) {
      return NextResponse.json({ error: "Cliente sem categoria" }, { status: 400 });
    }

    try {
      await assertCategoryPermission(user, categoryId, "canUpdate");
    } catch (err) {
      if (err instanceof PermissionDeniedError) {
        return NextResponse.json({ error: err.message }, { status: 403 });
      }
      throw err;
    }

    if (client.workflowStatus === "FINALIZADO") {
      return NextResponse.json({ error: "Cliente já está finalizado" }, { status: 400 });
    }

    if (client.workflowStatus === "FINALIZACAO_SOLICITADA") {
      return NextResponse.json(
        { error: "Finalização já foi solicitada. Aguarde aprovação do Gerente ou superior." },
        { status: 400 }
      );
    }

    const updated = await prisma.client.update({
      where: { id },
      data: {
        workflowStatus: "FINALIZACAO_SOLICITADA",
        finalizationRequestedAt: new Date(),
        finalizationRequestedById: user.id,
      },
      include: clientListInclude,
    });

    const { moved } = await syncClientTasksOnFinalizationRequest(
      id,
      client.teamId,
      user.id
    );

    return NextResponse.json({
      client: formatClientForApi(updated),
      message:
        moved > 0
          ? `Solicitação enviada. ${moved} tarefa(s) movida(s) para Aguardando no kanban.`
          : "Solicitação de finalização enviada.",
      tasksMoved: moved,
    });
  });
}
