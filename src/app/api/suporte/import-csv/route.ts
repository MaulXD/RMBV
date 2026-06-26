import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ";" && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export async function POST(request: Request) {
  return withAuth(async (user) => {
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas administradores podem importar dados" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.replace(/\r/g, "").split("\n").filter(Boolean);
    if (lines.length < 2) {
      return NextResponse.json({ error: "CSV vazio" }, { status: 400 });
    }

    const headerLine = lines[0]!.replace(/^\uFEFF/, "");
    const headers = parseCSVLine(headerLine);

    const nameIdx = headers.findIndex((h) => h.includes("Seu Nome"));
    const salaIdx = headers.findIndex((h) => h.includes("Sala"));
    const necessIdx = headers.findIndex((h) => h.includes("Qual a necessidade"));
    const obsIdx = headers.findIndex((h) => h.includes("Observação"));
    const emailIdx = headers.findIndex((h) => h.includes("Endereço de e-mail"));
    const dateIdx = headers.findIndex((h) => h.includes("Carimbo de data/hora"));

    if (nameIdx === -1 || salaIdx === -1 || necessIdx === -1) {
      return NextResponse.json({ error: "Colunas obrigatórias não encontradas no CSV" }, { status: 400 });
    }

    let imported = 0;
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const row = parseCSVLine(lines[i]!);
      const name = row[nameIdx]?.trim();
      const sala = row[salaIdx]?.trim();
      const necessidade = row[necessIdx]?.trim();
      if (!name || !sala || !necessidade) { skipped++; continue; }

      const email = row[emailIdx]?.trim() || null;
      const obs = row[obsIdx]?.trim() || null;
      const createdAt = dateIdx !== -1 && row[dateIdx]?.trim()
        ? new Date(row[dateIdx]!.trim())
        : new Date();

      await prisma.supportRequest.create({
        data: { name, sala, necessidade, obs, email, requesterId: null, createdAt },
      });
      imported++;
    }

    return NextResponse.json({ imported, skipped });
  });
}
