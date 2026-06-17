"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PdfOrganizerTool } from "@/components/PdfOrganizerTool";
import { TeseChecklistTool } from "@/components/ChecklistTools";
import { CpfCnpjValidatorTool } from "@/components/CpfCnpjValidatorTool";
import { CsvConverterTool } from "@/components/CsvConverterTool";
import { NoticeGeneratorTool } from "@/components/NoticeGeneratorTool";
import { ToolPickerCard } from "@/components/ToolPickerCard";
import { canAccessTools } from "@/lib/roles";
import { Icon, type IconName } from "@/components/ui/Icon";

type ToolId =
  | "pdf-organizer"
  | "checklist"
  | "cpf-cnpj"
  | "csv-converter"
  | "notice-generator";

const TOOLS: {
  id: ToolId;
  label: string;
  description: string;
  icon: IconName;
  accent: "primary" | "amber" | "emerald" | "sky" | "violet";
}[] = [
  {
    id: "pdf-organizer",
    label: "Organizador de PDF",
    description: "Juntar, dividir, Bates, marca d'água, OCR e salvar no cliente.",
    icon: "layers",
    accent: "primary",
  },
  {
    id: "checklist",
    label: "Checklist por tese",
    description: "Itens obrigatórios por tese para marcar no perfil do cliente.",
    icon: "clipboardList",
    accent: "amber",
  },
  {
    id: "cpf-cnpj",
    label: "Validador CPF/CNPJ",
    description: "Cole uma lista e valide documentos em lote no navegador.",
    icon: "idCard",
    accent: "emerald",
  },
  {
    id: "csv-converter",
    label: "Conversor CSV",
    description: "Formato RMBV, ponto-e-vírgula para Excel e validação de colunas.",
    icon: "table",
    accent: "sky",
  },
  {
    id: "notice-generator",
    label: "Ofício / WhatsApp",
    description: "Templates com nome, código, CPF e telefone do cliente.",
    icon: "messageSquare",
    accent: "violet",
  },
];

export default function FerramentasPage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);

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

  const activeMeta = TOOLS.find((t) => t.id === activeTool);

  return (
    <AppShell>
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <Icon name="wrench" className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-wide">Ferramentas</h1>
            <p className="text-sm text-muted">
              Escolha uma ferramenta — processamento local no navegador quando possível.
            </p>
          </div>
        </div>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-xs font-semibold tracking-widest text-muted uppercase">
          Escolha a ferramenta
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {TOOLS.map((tool) => (
            <ToolPickerCard
              key={tool.id}
              icon={tool.icon}
              title={tool.label}
              description={tool.description}
              accent={tool.accent}
              active={activeTool === tool.id}
              onClick={() => setActiveTool(tool.id)}
            />
          ))}
        </div>
      </section>

      {activeTool && activeMeta && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
            <div className="flex items-center gap-2">
              <Icon name={activeMeta.icon} className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">{activeMeta.label}</h2>
            </div>
            <button type="button" className="btn-ghost text-xs" onClick={() => setActiveTool(null)}>
              ← Voltar às ferramentas
            </button>
          </div>

          {activeTool === "pdf-organizer" && <PdfOrganizerTool />}
          {activeTool === "checklist" && <TeseChecklistTool userRole={role} />}
          {activeTool === "cpf-cnpj" && <CpfCnpjValidatorTool />}
          {activeTool === "csv-converter" && <CsvConverterTool />}
          {activeTool === "notice-generator" && <NoticeGeneratorTool teamId={teamId} />}
        </section>
      )}
    </AppShell>
  );
}
