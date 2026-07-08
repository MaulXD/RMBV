"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "./ui/Icon";

const STORAGE_KEY = "onboarding-wizard-done";
const TOTAL_STEPS = 6;

// ---------------------------------------------------------------------------
// Illustrations (CSS / inline SVG only — no external images)
// ---------------------------------------------------------------------------

function WelcomeIllustration() {
  return (
    <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
      <div className="absolute inset-[-20px] rounded-full bg-primary/[0.04]" />
      <div className="absolute inset-[-10px] rounded-full bg-primary/[0.07]" />
      <div className="absolute inset-0 rounded-2xl bg-primary/12" />
      <Icon name="fileText" className="relative h-12 w-12 text-primary" strokeWidth={1.5} />
    </div>
  );
}

function DashboardIllustration() {
  const rows = [
    { w1: 72, w2: 55, badge: "bg-blue-500/35" },
    { w1: 58, w2: 68, badge: "bg-amber-500/35" },
    { w1: 82, w2: 48, badge: "bg-green-500/35" },
    { w1: 65, w2: 60, badge: "bg-blue-500/35" },
  ];
  return (
    <div className="mx-auto w-full max-w-[288px] overflow-hidden rounded-xl border border-border bg-surface-elevated shadow-sm">
      {/* Fake browser chrome */}
      <div className="flex items-center gap-2 border-b border-border bg-surface px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-red-400/70" />
        <span className="h-2 w-2 rounded-full bg-amber-400/70" />
        <span className="h-2 w-2 rounded-full bg-green-400/70" />
        <span className="ml-2 h-2.5 flex-1 rounded-md bg-border/60" />
      </div>
      {/* Table header */}
      <div className="grid grid-cols-3 gap-2 border-b border-border/50 bg-surface/60 px-3 py-1.5">
        {["Nome", "Status", "Equipe"].map((h) => (
          <div key={h} className="h-2 rounded bg-primary/20" />
        ))}
      </div>
      {/* Table rows */}
      {rows.map((row, i) => (
        <div key={i} className="grid grid-cols-3 gap-2 border-b border-border/30 px-3 py-2 last:border-0">
          <div className="h-2 rounded bg-border/80" style={{ width: `${row.w1}%` }} />
          <div className={`h-2 rounded ${row.badge}`} style={{ width: `${row.w2}%` }} />
          <div className="h-2 rounded bg-border/50" style={{ width: "65%" }} />
        </div>
      ))}
    </div>
  );
}

function HistoryIllustration() {
  return (
    <div className="mx-auto w-full max-w-[288px] space-y-2.5">
      {/* Note 1 — with @mention */}
      <div className="rounded-xl border border-border bg-surface-elevated px-3 py-2.5">
        <div className="mb-1.5 flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-primary/20" />
          <div className="h-2 w-14 rounded bg-border/80" />
          <div className="ml-auto h-2 w-10 rounded bg-border/40" />
        </div>
        <div className="space-y-1 pl-8">
          <div className="flex flex-wrap items-center gap-1">
            <div className="h-2 w-14 rounded bg-border/60" />
            <span className="inline-flex h-4 items-center rounded bg-amber-500/15 px-1.5 text-[9px] font-semibold text-amber-700 dark:text-amber-400">
              @ana
            </span>
            <div className="h-2 w-10 rounded bg-border/60" />
          </div>
          <div className="h-2 w-28 rounded bg-border/40" />
        </div>
      </div>
      {/* Note 2 */}
      <div className="rounded-xl border border-border bg-surface px-3 py-2.5">
        <div className="mb-1.5 flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-emerald-500/20" />
          <div className="h-2 w-20 rounded bg-border/80" />
        </div>
        <div className="space-y-1 pl-8">
          <div className="h-2 w-32 rounded bg-border/60" />
          <div className="h-2 w-20 rounded bg-border/40" />
        </div>
      </div>
    </div>
  );
}

function KanbanIllustration() {
  const columns = [
    {
      label: "A Fazer",
      accent: "bg-slate-400/25 text-slate-600 dark:text-slate-400",
      cards: [3, 2],
    },
    {
      label: "Em Curso",
      accent: "bg-blue-400/25 text-blue-600 dark:text-blue-400",
      cards: [2, 1],
    },
    {
      label: "Pronto",
      accent: "bg-green-400/25 text-green-700 dark:text-green-400",
      cards: [1],
    },
  ];
  return (
    <div className="mx-auto flex w-full max-w-[288px] gap-2">
      {columns.map((col) => (
        <div key={col.label} className="flex flex-1 flex-col gap-1.5 rounded-xl border border-border bg-surface p-2">
          <div className={`rounded-md px-1.5 py-1 text-center text-[9px] font-semibold ${col.accent}`}>
            {col.label}
          </div>
          {col.cards.map((width, ci) => (
            <div key={ci} className="rounded-lg border border-border bg-surface-elevated px-2 py-1.5">
              <div className="mb-1 h-2 rounded bg-border/80" style={{ width: `${40 + width * 12}%` }} />
              <div className="h-1.5 w-1/2 rounded bg-border/40" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ShortcutsIllustration() {
  const shortcuts: { keys: string[]; label: string }[] = [
    { keys: ["Ctrl", "K"], label: "Busca global" },
    { keys: ["G", "D"], label: "Ir ao Dashboard" },
    { keys: ["?"], label: "Ver todos os atalhos" },
  ];
  return (
    <div className="mx-auto w-full max-w-[288px] space-y-3">
      {shortcuts.map((s) => (
        <div key={s.keys.join("+")} className="flex items-center gap-3">
          <div className="flex shrink-0 items-center gap-1">
            {s.keys.map((key, i) => (
              <span key={i} className="flex items-center gap-1">
                <kbd className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-md border border-border bg-surface-elevated px-2 font-mono text-xs font-semibold shadow-sm">
                  {key}
                </kbd>
                {i < s.keys.length - 1 && (
                  <span className="text-[10px] text-muted">+</span>
                )}
              </span>
            ))}
          </div>
          <span className="text-sm text-muted">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

function DoneIllustration() {
  return (
    <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
      <div className="absolute inset-[-16px] rounded-full bg-green-500/[0.06]" />
      <div className="absolute inset-[-6px] rounded-full bg-green-500/10" />
      <div className="absolute inset-0 rounded-full bg-green-500/15" />
      <Icon name="check" className="relative h-12 w-12 text-green-600 dark:text-green-400" strokeWidth={2.5} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------

type StepDef = {
  title: string;
  subtitle: string;
  body: string;
  illustration: React.ReactNode;
};

const STEP_DEFS: StepDef[] = [
  {
    title: "Bem-vindo ao SCS System",
    subtitle: "Vamos configurar sua conta",
    body: "O SCS System é sua central de gestão de clientes, tarefas e chamados. Em poucos passos vamos te mostrar o essencial para começar.",
    illustration: <WelcomeIllustration />,
  },
  {
    title: "Dashboard de clientes",
    subtitle: "Busca, filtros e visão geral",
    body: "No painel principal você encontra todos os clientes da equipe. Use os filtros por status, workflow e pesquisa para localizar qualquer cliente rapidamente.",
    illustration: <DashboardIllustration />,
  },
  {
    title: "Histórico e anotações",
    subtitle: "Colabore com @menções",
    body: "Em cada cliente há um histórico completo. Adicione anotações e mencione colegas com @nome para notificá-los diretamente sobre qualquer atualização.",
    illustration: <HistoryIllustration />,
  },
  {
    title: "Chamados e tarefas",
    subtitle: "Kanban e chamados integrados",
    body: "Organize tarefas no quadro Kanban com colunas personalizáveis. Priorize, arraste cards e acompanhe o progresso. Chamados de suporte ficam em área separada.",
    illustration: <KanbanIllustration />,
  },
  {
    title: "Atalhos de teclado",
    subtitle: "Navegue mais rápido",
    body: "Use os atalhos abaixo para agilizar seu fluxo de trabalho. Pressione ? a qualquer momento para ver a lista completa.",
    illustration: <ShortcutsIllustration />,
  },
  {
    title: "Tudo pronto!",
    subtitle: "Sua conta está configurada",
    body: "Você já sabe o essencial para usar o SCS System. Explore as funcionalidades no seu ritmo e conte com o suporte sempre que precisar.",
    illustration: <DoneIllustration />,
  },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function OnboardingWizard() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      const done = localStorage.getItem(STORAGE_KEY);
      if (!done || done === "false") {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable — skip wizard
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // ignore
    }
    setVisible(false);
  }

  if (!visible) return null;

  const isFirst = step === 0;
  const isLast = step === TOTAL_STEPS - 1;
  const current = STEP_DEFS[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-surface-elevated shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-3.5">
          <span className="text-xs font-semibold tabular-nums text-muted">
            {step + 1} / {TOTAL_STEPS}
          </span>

          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Etapa ${i + 1}`}
                onClick={() => setStep(i)}
                className={`rounded-full transition-all duration-200 ${
                  i === step
                    ? "w-5 h-1.5 bg-primary"
                    : i < step
                    ? "w-1.5 h-1.5 bg-primary/40"
                    : "w-1.5 h-1.5 bg-border"
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={dismiss}
            className="btn-ghost px-3 py-1 text-xs"
          >
            Pular
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-8">
          {/* Illustration */}
          <div className="mb-7 flex justify-center">
            {current.illustration}
          </div>

          {/* Text */}
          <div className="text-center">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-primary">
              {current.subtitle}
            </p>
            <h2 className="mb-3 text-xl font-bold text-foreground">{current.title}</h2>
            <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted">
              {current.body}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={isFirst}
            className="btn-ghost flex items-center gap-1.5 px-4 py-2 text-sm disabled:pointer-events-none disabled:opacity-30"
          >
            <Icon name="chevronLeft" className="h-4 w-4" />
            Voltar
          </button>

          {isLast ? (
            <Link
              href="/dashboard"
              onClick={dismiss}
              className="btn-primary flex items-center gap-1.5 px-5 py-2 text-sm"
            >
              Ir para o Dashboard
              <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1))}
              className="btn-primary flex items-center gap-1.5 px-5 py-2 text-sm"
            >
              Próximo
              <Icon name="arrowRight" className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
