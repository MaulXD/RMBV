"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PdfOrganizerTool } from "@/components/PdfOrganizerTool";
import { TeseChecklistTool } from "@/components/ChecklistTools";
import { CpfCnpjValidatorTool } from "@/components/CpfCnpjValidatorTool";
import { CsvConverterTool } from "@/components/CsvConverterTool";
import { NoticeGeneratorTool } from "@/components/NoticeGeneratorTool";
import { canAccessTools } from "@/lib/roles";
import { Icon } from "@/components/ui/Icon";

type ToolId =
  | "pdf-organizer"
  | "checklist"
  | "cpf-cnpj"
  | "csv-converter"
  | "notice-generator";

const TOOLS: { id: ToolId; label: string; description: string }[] = [
  {
    id: "pdf-organizer",
    label: "Organizador de PDF",
    description: "Juntar, Bates, marca d'água, redação, compressão, OCR e salvar no cliente.",
  },
  {
    id: "checklist",
    label: "Checklist por tese",
    description: "Configure itens obrigatórios por tese para a equipe marcar no cliente.",
  },
  {
    id: "cpf-cnpj",
    label: "Validador CPF/CNPJ",
    description: "Valide documentos em lote no navegador.",
  },
  {
    id: "csv-converter",
    label: "Conversor CSV",
    description: "Valide e converta planilhas no formato RMBV.",
  },
  {
    id: "notice-generator",
    label: "Gerador ofício / WhatsApp",
    description: "Preencha templates com dados do cliente.",
  },
];

export default function FerramentasPage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [activeTool, setActiveTool] = useState<ToolId>("pdf-organizer");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        const userRole = d.user?.role ?? null;
        setRole(userRole);
        setTeamId(d.user?.teamId ?? null);
        if (!userRole || !canAccessTools({ role: userRole })) {
          router.replace("/dashboard");
        }
      })
      .finally(() => setChecking(false));
  }, [router]);

  if (checking) {
    return (
      <AppShell>
        <p className="text-sm text-muted">Carregando...</p>
      </AppShell>
    );
  }

  if (!role || !canAccessTools({ role })) {
    return null;
  }

  return (
    <AppShell>
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Icon name="wrench" className="h-6 w-6 text-primary" />
          <h1 className="font-display text-xl font-semibold tracking-wide">Ferramentas</h1>
        </div>
        <p className="mt-1 text-sm text-muted">
          Utilitários do escritório — a maior parte roda localmente no navegador.
        </p>
      </div>

      <div className="mb-6 max-w-md">
        <label className="mb-1 block text-xs font-medium text-muted">Ferramenta</label>
        <select
          className="industrial-input"
          value={activeTool}
          onChange={(e) => setActiveTool(e.target.value as ToolId)}
        >
          {TOOLS.map((tool) => (
            <option key={tool.id} value={tool.id}>
              {tool.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-muted">
          {TOOLS.find((t) => t.id === activeTool)?.description}
        </p>
      </div>

      {activeTool === "pdf-organizer" && <PdfOrganizerTool />}
      {activeTool === "checklist" && <TeseChecklistTool userRole={role} />}
      {activeTool === "cpf-cnpj" && <CpfCnpjValidatorTool />}
      {activeTool === "csv-converter" && <CsvConverterTool />}
      {activeTool === "notice-generator" && <NoticeGeneratorTool teamId={teamId} />}
    </AppShell>
  );
}
