import PDFDocument from "pdfkit";
import type { ClientProfileData } from "./client-fields";
import { STATUS_OPTIONS } from "./client-fields";

type ReportMeta = {
  title: string;
  teseName: string | null;
  statusFilter: string | null;
  generatedAt: Date;
  stats: { label: string; count: number }[];
  clients: ClientProfileData[];
};

function statusLabel(status: string) {
  return STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
}

export async function generateClientsPdfReport(meta: ReportMeta): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).font("Helvetica-Bold").text(meta.title, { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).font("Helvetica");
    doc.text(`Gerado em: ${meta.generatedAt.toLocaleString("pt-BR")}`);
    doc.text(`Tese: ${meta.teseName ?? "Todas"}`);
    doc.text(`Filtro de status: ${meta.statusFilter ?? "Todos"}`);
    doc.moveDown();

    doc.fontSize(12).font("Helvetica-Bold").text("Resumo por status");
    doc.moveDown(0.3);
    doc.fontSize(10).font("Helvetica");
    for (const item of meta.stats) {
      doc.text(`${item.label}: ${item.count}`);
    }
    doc.text(`Total de clientes no relatório: ${meta.clients.length}`);
    doc.moveDown();

    doc.fontSize(12).font("Helvetica-Bold").text("Clientes");
    doc.moveDown(0.5);

    if (meta.clients.length === 0) {
      doc.fontSize(10).font("Helvetica").text("Nenhum cliente encontrado com os filtros aplicados.");
    } else {
      meta.clients.forEach((client, index) => {
        if (doc.y > 700) doc.addPage();
        doc.fontSize(11).font("Helvetica-Bold").text(`${index + 1}. ${client.name}`);
        doc.fontSize(9).font("Helvetica");
        doc.text(`COD: ${client.cod ?? "—"} | TESE: ${client.tese ?? "—"} | CPF: ${client.cpf ?? "—"}`);
        doc.text(`Status: ${statusLabel(client.status)}`);
        const phones = [
          client.phone1,
          client.phone2,
          client.phone3,
          client.phone4,
          client.phone5,
        ]
          .filter(Boolean)
          .join(" | ");
        if (phones) doc.text(`Telefones: ${phones}`);
        if (client.address1) doc.text(`Endereço: ${client.address1}`);
        doc.moveDown(0.4);
      });
    }

    doc.end();
  });
}
