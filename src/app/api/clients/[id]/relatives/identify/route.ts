import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const RELATIONSHIP_KEYWORDS: { regex: RegExp; label: string }[] = [
  { regex: /^m[aã]e\b/i, label: "Mãe" },
  { regex: /^pai\b/i, label: "Pai" },
  { regex: /^filho\b/i, label: "Filho" },
  { regex: /^filha\b/i, label: "Filha" },
  { regex: /^irm[aã]o\b/i, label: "Irmão" },
  { regex: /^irm[aã]\b/i, label: "Irmã" },
  { regex: /^av[oô]\b/i, label: "Avô" },
  { regex: /^av[oó]\b/i, label: "Avó" },
  { regex: /^esposo\b|^marido\b/i, label: "Esposo" },
  { regex: /^esposa\b|^mulher\b/i, label: "Esposa" },
  { regex: /^c[oô]njuge\b/i, label: "Cônjuge" },
  { regex: /^tio\b/i, label: "Tio" },
  { regex: /^tia\b/i, label: "Tia" },
  { regex: /^sobrinho\b/i, label: "Sobrinho" },
  { regex: /^sobrinha\b/i, label: "Sobrinha" },
  { regex: /^neto\b/i, label: "Neto" },
  { regex: /^neta\b/i, label: "Neta" },
  { regex: /^primo\b/i, label: "Primo" },
  { regex: /^prima\b/i, label: "Prima" },
  { regex: /^cunhado\b/i, label: "Cunhado" },
  { regex: /^cunhada\b/i, label: "Cunhada" },
  { regex: /^sogro\b/i, label: "Sogro" },
  { regex: /^sogra\b/i, label: "Sogra" },
];

const PHONE_REGEX = /\(?\d{2}\)?\s?\d{4,5}[-\s]?\d{4}/g;

type SuggestedRelative = {
  relationship: string;
  name: string;
  phone1: string;
  phone2: string;
  rawBlock: string;
};

function extractPhones(text: string): string[] {
  return Array.from(new Set(text.match(PHONE_REGEX) ?? []));
}

function parsePesquisa(text: string): SuggestedRelative[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const results: SuggestedRelative[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Try each keyword against the start of this line (strip punctuation like ":" first)
    const clean = line.replace(/[:\-–—]/g, " ").trim();
    const match = RELATIONSHIP_KEYWORDS.find(({ regex }) => regex.test(clean));

    if (match) {
      // Everything after the keyword word on this line may be the name
      const afterKeyword = clean.replace(match.regex, "").trim();

      // Collect block: this line + next lines until next keyword or blank
      const blockLines: string[] = [line];
      let j = i + 1;
      while (j < lines.length) {
        const next = lines[j].replace(/[:\-–—]/g, " ").trim();
        const isNextKeyword = RELATIONSHIP_KEYWORDS.some(({ regex }) => regex.test(next));
        if (isNextKeyword) break;
        blockLines.push(lines[j]);
        j++;
      }

      const block = blockLines.join("\n");
      const phones = extractPhones(block);

      // Name: prefer afterKeyword if not empty and not just a phone number
      let name = afterKeyword.replace(PHONE_REGEX, "").trim();
      // If name came from this line but empty, try next non-phone line in block
      if (!name) {
        for (let k = 1; k < blockLines.length; k++) {
          const candidate = blockLines[k].replace(PHONE_REGEX, "").trim();
          if (candidate && !/^\d/.test(candidate)) {
            name = candidate;
            break;
          }
        }
      }

      if (name || phones.length > 0) {
        results.push({
          relationship: match.label,
          name: name || "",
          phone1: phones[0] ?? "",
          phone2: phones[1] ?? "",
          rawBlock: block,
        });
      }

      i = j;
    } else {
      i++;
    }
  }

  return results;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (user) => {
    const { id } = await params;
    const client = await prisma.client.findUnique({
      where: { id },
      select: { teamId: true, pesquisa: true },
    });
    if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (user.role !== "ADMIN" && client.teamId !== user.teamId)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    if (!client.pesquisa?.trim()) {
      return NextResponse.json({ suggestions: [] });
    }

    const suggestions = parsePesquisa(client.pesquisa);
    return NextResponse.json({ suggestions });
  });
}
