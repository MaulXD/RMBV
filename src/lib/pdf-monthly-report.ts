import PDFDocument from "pdfkit";
import { STATUS_OPTIONS } from "./client-fields";
import { readClientDocument } from "./document-storage";

// --- Types ---
export type MonthlyReportDoc = {
  id: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  tags: string[];
};

export type MonthlyReportClient = {
  id: string;
  name: string;
  cod: string | null;
  cpf: string | null;
  tese: string | null;
  status: string;
  documents: MonthlyReportDoc[];
};

export type MonthlyReportData = {
  period: { start: string; end: string };
  teamName: string;
  teseName: string | null;
  summary: { totalCreated: number; totalFinalized: number; totalLocalized: number };
  byStatus: { status: string; label: string; count: number }[];
  byMonth: { monthKey: string; label: string; created: number; finalized: number }[];
  byCollaborator: { name: string; created: number; finalized: number }[];
  clients: MonthlyReportClient[];
  includeCharts: string[];   // ["status","month","collaborator","summary"]
  docMode: "none" | "list" | "preview";
};

// --- Helpers ---
const COLORS = {
  primary: "#2563eb",
  success: "#059669",
  danger: "#e11d48",
  warning: "#d97706",
  muted: "#64748b",
  border: "#e2e8f0",
  barBg: "#f1f5f9",
  blue: "#3b82f6",
  green: "#22c55e",
  amber: "#f59e0b",
  red: "#ef4444",
  slate: "#94a3b8",
  violet: "#8b5cf6",
};

const STATUS_COLORS: Record<string, string> = {
  AGUARDANDO: COLORS.slate,
  LOCALIZADO: COLORS.green,
  SEM_SUCESSO: COLORS.red,
  TENTE_NOVAMENTE: COLORS.amber,
};

function statusLabel(status: string) {
  return STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
}

function hex2rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

// --- Chart drawing helpers ---
function drawHorizontalBars(
  doc: PDFKit.PDFDocument,
  items: { label: string; value: number; color: string }[],
  x: number,
  y: number,
  width: number
): number {
  if (items.length === 0) return y;
  const max = Math.max(...items.map((i) => i.value), 1);
  const rowH = 22;
  const labelW = 140;
  const barAreaW = width - labelW - 40;

  for (const item of items) {
    const barW = Math.max(2, (item.value / max) * barAreaW);
    const [r, g, b] = hex2rgb(item.color);

    // label
    doc.fontSize(8).fillColor(COLORS.muted).text(item.label, x, y + 5, { width: labelW - 4, ellipsis: true });
    // bar bg
    doc.rect(x + labelW, y + 4, barAreaW, 14).fillColor(COLORS.barBg).fill();
    // bar fill
    doc.rect(x + labelW, y + 4, barW, 14).fillColor([r, g, b]).fill();
    // value
    doc.fontSize(8).fillColor(COLORS.muted).text(
      String(item.value),
      x + labelW + barAreaW + 4,
      y + 5,
      { width: 32 }
    );
    y += rowH;
  }
  return y;
}

function drawVerticalBars(
  doc: PDFKit.PDFDocument,
  items: { label: string; created: number; finalized: number }[],
  x: number,
  y: number,
  width: number,
  height: number
): number {
  if (items.length === 0) return y + height + 30;
  const max = Math.max(...items.flatMap((i) => [i.created, i.finalized]), 1);
  const gap = 4;
  const groupW = (width - gap * (items.length - 1)) / items.length;
  const barW = Math.max(6, (groupW - 2) / 2);

  // Axes
  doc.moveTo(x, y).lineTo(x, y + height).stroke(COLORS.border);
  doc.moveTo(x, y + height).lineTo(x + width, y + height).stroke(COLORS.border);

  // Legend
  const legendY = y - 18;
  doc.rect(x, legendY, 10, 8).fillColor(hex2rgb(COLORS.blue)).fill();
  doc.fontSize(7).fillColor(COLORS.muted).text("Criados", x + 13, legendY + 1);
  doc.rect(x + 65, legendY, 10, 8).fillColor(hex2rgb(COLORS.green)).fill();
  doc.text("Finalizados", x + 78, legendY + 1);

  items.forEach((item, i) => {
    const bx = x + i * (groupW + gap);
    const createdH = (item.created / max) * height;
    const finalizedH = (item.finalized / max) * height;

    // created bar
    if (item.created > 0) {
      doc.rect(bx, y + height - createdH, barW, createdH).fillColor(hex2rgb(COLORS.blue)).fill();
    }
    // finalized bar
    if (item.finalized > 0) {
      doc.rect(bx + barW + 1, y + height - finalizedH, barW, finalizedH)
        .fillColor(hex2rgb(COLORS.green)).fill();
    }

    // label
    doc.fontSize(6).fillColor(COLORS.muted).text(
      item.label.replace(" ", "\n"),
      bx,
      y + height + 4,
      { width: groupW + gap - 1, align: "center" }
    );
  });

  return y + height + 28;
}

// --- Main PDF generator ---
export async function generateMonthlyPdfReport(data: MonthlyReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 45, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const W = doc.page.width - 90; // usable width
    const L = 45; // left margin

    // ── HEADER ──
    doc.rect(L, 40, W, 56).fillColor(hex2rgb("#1e3a5f")).fill();
    doc.fontSize(16).font("Helvetica-Bold").fillColor("#ffffff")
      .text("Relatório Mensal", L + 14, 52);
    doc.fontSize(9).font("Helvetica").fillColor("#c7d9f0")
      .text(`${data.teamName}${data.teseName ? " · " + data.teseName : ""}`, L + 14, 73);
    doc.fillColor("#c7d9f0")
      .text(
        `Período: ${new Date(data.period.start + "T12:00:00").toLocaleDateString("pt-BR")} a ${new Date(data.period.end + "T12:00:00").toLocaleDateString("pt-BR")}   ·   Gerado em: ${new Date().toLocaleString("pt-BR")}`,
        L + 14, 86
      );

    let y = 115;

    // ── SUMMARY CARDS ──
    if (data.includeCharts.includes("summary")) {
      const cards = [
        { label: "Clientes criados", value: data.summary.totalCreated, color: COLORS.blue },
        { label: "Finalizados", value: data.summary.totalFinalized, color: COLORS.green },
        { label: "Localizados", value: data.summary.totalLocalized, color: COLORS.amber },
      ];
      const cw = (W - 12) / cards.length;
      cards.forEach((card, i) => {
        const cx = L + i * (cw + 6);
        doc.rect(cx, y, cw, 48).fillColor(hex2rgb(COLORS.barBg)).fill();
        doc.rect(cx, y, 3, 48).fillColor(hex2rgb(card.color)).fill();
        doc.fontSize(22).font("Helvetica-Bold").fillColor(hex2rgb(card.color))
          .text(String(card.value), cx + 10, y + 8);
        doc.fontSize(8).font("Helvetica").fillColor(COLORS.muted)
          .text(card.label, cx + 10, y + 34);
      });
      y += 62;
    }

    // ── STATUS BARS ──
    if (data.includeCharts.includes("status") && data.byStatus.some((s) => s.count > 0)) {
      doc.fontSize(10).font("Helvetica-Bold").fillColor("#1e293b").text("Distribuição por status", L, y);
      y += 16;
      const items = data.byStatus
        .filter((s) => s.count > 0)
        .map((s) => ({ label: s.label, value: s.count, color: STATUS_COLORS[s.status] ?? COLORS.slate }));
      y = drawHorizontalBars(doc, items, L, y, W);
      y += 12;
    }

    // ── MONTH BARS ──
    if (data.includeCharts.includes("month") && data.byMonth.length > 0) {
      if (y > 550) { doc.addPage(); y = 45; }
      doc.fontSize(10).font("Helvetica-Bold").fillColor("#1e293b").text("Evolução mensal", L, y);
      y += 24;
      y = drawVerticalBars(doc, data.byMonth, L, y, W, 100);
      y += 10;
    }

    // ── COLLABORATOR BARS ──
    if (data.includeCharts.includes("collaborator") && data.byCollaborator.length > 0) {
      if (y > 580) { doc.addPage(); y = 45; }
      doc.fontSize(10).font("Helvetica-Bold").fillColor("#1e293b").text("Produção por colaborador", L, y);
      y += 16;
      const items = data.byCollaborator.map((c) => [
        { label: c.name, value: c.created, color: COLORS.blue },
        { label: `${c.name} (fin.)`, value: c.finalized, color: COLORS.green },
      ]).flat().filter((i) => i.value > 0);
      y = drawHorizontalBars(doc, items, L, y, W);
      y += 14;
    }

    // ── CLIENT LIST ──
    if (data.clients.length > 0 && data.docMode !== "none") {
      if (y > 580) { doc.addPage(); y = 45; }
      doc.fontSize(10).font("Helvetica-Bold").fillColor("#1e293b").text("Clientes do período", L, y);
      y += 6;
      doc.moveTo(L, y).lineTo(L + W, y).stroke(COLORS.border);
      y += 10;

      for (const client of data.clients) {
        if (y > 700) { doc.addPage(); y = 45; }

        doc.fontSize(9).font("Helvetica-Bold").fillColor("#1e293b")
          .text(`${client.name}`, L, y, { continued: true })
          .font("Helvetica").fillColor(COLORS.muted)
          .text(`  ·  CPF ${client.cpf ?? "—"}  ·  COD ${client.cod ?? "—"}  ·  ${statusLabel(client.status)}  ·  ${client.tese ?? "—"}`);
        y += 14;

        if (client.documents.length > 0) {
          doc.fontSize(7.5).fillColor(COLORS.muted)
            .text("Documentos: " + client.documents.map((d) =>
              d.tags.length > 0 ? `${d.originalName} [${d.tags.join(", ")}]` : d.originalName
            ).join("  |  "), L + 6, y, { width: W - 6 });
          y += 12;
        }

        y += 4;
      }
    }

    doc.end();
  });
}

// With image preview (async, fetches blobs)
export async function generateMonthlyPdfWithPreviews(data: MonthlyReportData): Promise<Buffer> {
  // Collect image buffers first (before starting the PDF stream)
  type Preview = { clientId: string; storedName: string; originalName: string; tags: string[]; buffer: Buffer };
  const previews: Preview[] = [];

  if (data.docMode === "preview") {
    for (const client of data.clients) {
      for (const doc of client.documents) {
        if (!doc.mimeType.startsWith("image/")) continue;
        try {
          const buf = await readClientDocument(client.id, doc.storedName);
          previews.push({ clientId: client.id, storedName: doc.storedName, originalName: doc.originalName, tags: doc.tags, buffer: buf });
        } catch {
          // skip unavailable files
        }
      }
    }
  }

  // Now generate PDF (synchronous stream, images already in memory)
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 45, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const W = doc.page.width - 90;
    const L = 45;

    // Header
    doc.rect(L, 40, W, 56).fillColor(hex2rgb("#1e3a5f")).fill();
    doc.fontSize(16).font("Helvetica-Bold").fillColor("#ffffff").text("Relatório Mensal — Documentos", L + 14, 52);
    doc.fontSize(9).font("Helvetica").fillColor("#c7d9f0")
      .text(`${data.teamName}${data.teseName ? " · " + data.teseName : ""}  ·  ${new Date(data.period.start + "T12:00:00").toLocaleDateString("pt-BR")} a ${new Date(data.period.end + "T12:00:00").toLocaleDateString("pt-BR")}`, L + 14, 78);

    let y = 116;

    for (const client of data.clients) {
      const clientPreviews = previews.filter((p) => p.clientId === client.id);
      const clientDocs = client.documents;
      if (clientDocs.length === 0) continue;

      if (y > 660) { doc.addPage(); y = 45; }

      doc.fontSize(10).font("Helvetica-Bold").fillColor("#1e293b")
        .text(`${client.name}  ·  COD ${client.cod ?? "—"}  ·  CPF ${client.cpf ?? "—"}`, L, y);
      y += 14;

      for (const d of clientDocs) {
        const preview = clientPreviews.find((p) => p.storedName === d.storedName);
        if (y > 680) { doc.addPage(); y = 45; }

        doc.fontSize(8).font("Helvetica-Bold").fillColor("#334155").text(`  ${d.originalName}`, L, y);
        if (d.tags.length > 0) {
          doc.fontSize(7.5).font("Helvetica").fillColor(COLORS.muted)
            .text(`  ${d.tags.join("  ·  ")}`, L, y + 10);
          y += 10;
        }
        y += 14;

        if (preview) {
          if (y + 160 > 760) { doc.addPage(); y = 45; }
          try {
            doc.image(preview.buffer, L + 6, y, { width: Math.min(W - 12, 240), height: 150, fit: [W - 12, 150] });
            y += 158;
          } catch {
            // image failed to embed
          }
        }
      }
      y += 8;
    }

    doc.end();
  });
}
