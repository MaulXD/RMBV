import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { buildClientWhere, clientListInclude } from "@/lib/client-query";
import { clientToExportRow, formatClientForApi, STATUS_OPTIONS } from "@/lib/client-fields";
import type { ClientProfileData } from "@/lib/client-fields";
import { clientsToCsv } from "@/lib/csv-import";
import { EXPORT_MAX_CLIENTS } from "@/lib/export-limits";

export const runtime = "nodejs";

type Row = Record<string, string>;

const WORKFLOW_LABELS: Record<string, string> = {
  EM_ANDAMENTO: "Em andamento",
  FINALIZACAO_SOLICITADA: "Finaliza\u00E7\u00E3o solicitada",
  FINALIZADO: "Finalizado",
};

function buildAdvancedRow(client: ClientProfileData, fields: string[]): Row {
  const statusLabel = STATUS_OPTIONS.find((s) => s.value === client.status)?.label ?? client.status;
  const allValues: Record<string, string> = {
    cod: client.cod ?? "",
    name: client.name,
    cpf: client.cpf ?? "",
    birthDate: client.birthDate ?? "",
    tese: client.tese ?? "",
    status: statusLabel,
    workflowStatus: WORKFLOW_LABELS[client.workflowStatus] ?? client.workflowStatus,
    followUpAt: client.followUpAt ? client.followUpAt.slice(0, 10) : "",
    obito: client.obito ?? "",
    deathDate: client.deathDate ?? "",
    phone1: client.phone1 ?? "", phone2: client.phone2 ?? "",
    phone3: client.phone3 ?? "", phone4: client.phone4 ?? "",
    phone5: client.phone5 ?? "", phone6: client.phone6 ?? "",
    phone7: client.phone7 ?? "", phone8: client.phone8 ?? "",
    phone9: client.phone9 ?? "", phone10: client.phone10 ?? "",
    address1: client.address1 ?? "", address2: client.address2 ?? "", address3: client.address3 ?? "",
    cep: client.cep ?? "", logradouro: client.logradouro ?? "",
    numero: client.numero ?? "", complemento: client.complemento ?? "",
    bairro: client.bairro ?? "", cidade: client.cidade ?? "", uf: client.uf ?? "",
    createdAt: client.createdAt.slice(0, 10),
    updatedAt: client.updatedAt.slice(0, 10),
  };

  const LABELS: Record<string, string> = {
    cod: "CODIGO", name: "NOME", cpf: "CPF", birthDate: "DATA NASCIMENTO",
    tese: "TESE", status: "STATUS", workflowStatus: "WORKFLOW", followUpAt: "DATA RETORNO",
    obito: "\u00D3BITO", deathDate: "DATA \u00D3BITO",
    phone1: "TELEFONE 1", phone2: "TELEFONE 2", phone3: "TELEFONE 3", phone4: "TELEFONE 4",
    phone5: "TELEFONE 5", phone6: "TELEFONE 6", phone7: "TELEFONE 7", phone8: "TELEFONE 8",
    phone9: "TELEFONE 9", phone10: "TELEFONE 10",
    address1: "ENDERECO 1", address2: "ENDERECO 2", address3: "ENDERECO 3",
    cep: "CEP", logradouro: "LOGRADOURO", numero: "NUMERO", complemento: "COMPLEMENTO",
    bairro: "BAIRRO", cidade: "CIDADE", uf: "UF",
    createdAt: "CRIADO EM", updatedAt: "ATUALIZADO EM",
  };

  const row: Row = {};
  for (const field of fields) {
    const header = LABELS[field] ?? field.toUpperCase();
    row[header] = allValues[field] ?? "";
  }
  return row;
}

export async function GET(request: Request) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const teseId = searchParams.get("teseId");
    const idsParam = searchParams.get("ids");
    const fieldsParam = searchParams.get("fields");
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const where = await buildClientWhere(user, { status, teseId });
    const ids = idsParam
      ? idsParam.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    let exportWhere = ids.length > 0 ? { ...where, id: { in: ids } } : where;

    if (fromParam || toParam) {
      const dateFilter: Record<string, Date> = {};
      if (fromParam) dateFilter.gte = new Date(fromParam);
      if (toParam) {
        const d = new Date(toParam);
        d.setHours(23, 59, 59, 999);
        dateFilter.lte = d;
      }
      exportWhere = { ...exportWhere, createdAt: dateFilter };
    }

    const totalMatching = await prisma.client.count({ where: exportWhere });
    const truncated = totalMatching > EXPORT_MAX_CLIENTS;

    const clients = await prisma.client.findMany({
      where: exportWhere,
      orderBy: { name: "asc" },
      take: EXPORT_MAX_CLIENTS,
      include: clientListInclude,
    });

    const fields = fieldsParam
      ? fieldsParam.split(",").map((s) => s.trim()).filter(Boolean)
      : null;

    const formatted = clients.map((c) => formatClientForApi(c));
    const exportRows = fields
      ? formatted.map((c) => buildAdvancedRow(c, fields))
      : formatted.map((c) => clientToExportRow(c));

    const csv = `\uFEFF${clientsToCsv(exportRows)}`;
    const filename = `relatorio-clientes-${new Date().toISOString().slice(0, 10)}${truncated ? "-parcial" : ""}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Export-Truncated": truncated ? "true" : "false",
        "X-Export-Total": String(totalMatching),
        "X-Export-Limit": String(EXPORT_MAX_CLIENTS),
      },
    });
  });
}
