import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { LandingDemoChart } from "@/components/LandingDemoChart";

const FEATURES = [
  {
    icon: "dashboard" as const,
    title: "Clientes e teses",
    description: "Cadastro completo, filtros por tese, histórico e checklist por caso.",
  },
  {
    icon: "kanban" as const,
    title: "Kanban da equipe",
    description: "Tarefas com prazos, alertas de atraso e vínculo com o cliente.",
  },
  {
    icon: "layers" as const,
    title: "Ferramentas PDF",
    description: "Juntar, dividir, Bates, marca d'água, OCR e salvar nos documentos.",
  },
  {
    icon: "reports" as const,
    title: "Relatórios",
    description: "Gráficos, metas, exportação CSV e PDF por tese ou equipe.",
  },
  {
    icon: "fileText" as const,
    title: "Documentos",
    description: "Upload seguro por cliente com controle de acesso por equipe.",
  },
  {
    icon: "search" as const,
    title: "Pesquisa inteligente",
    description: "Identifique telefones e endereços no texto e marque verificações.",
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-border bg-surface-elevated">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Icon name="fileText" className="h-5 w-5 text-primary" />
            <span className="font-display text-lg font-semibold tracking-wide">RMBV</span>
          </div>
          <Link href="/login" className="btn-primary px-4 py-2 text-sm">
            <Icon name="logIn" className="h-4 w-4" />
            Entrar
          </Link>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-border">
          {/* Animated gradient background */}
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden
            style={{
              background:
                "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 22%, transparent), color-mix(in srgb, var(--color-surface) 0%, transparent) 40%, color-mix(in srgb, var(--color-accent) 18%, transparent) 70%, color-mix(in srgb, var(--color-surface) 0%, transparent))",
              backgroundSize: "300% 300%",
              animation: "hero-gradient 8s ease infinite",
            }}
          />
          <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-primary uppercase">
              Sistema de gestão jurídica
            </p>
            <h1 className="font-display max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Organize clientes, teses e documentos em um só lugar
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
              O RMBV reúne cadastro de clientes, kanban da equipe, relatórios, documentação e
              ferramentas de PDF — pensado para escritórios que trabalham com volume e múltiplas
              teses.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="btn-primary px-6 py-3">
                <Icon name="logIn" className="h-4 w-4" />
                Acessar o sistema
              </Link>
              <a href="#demonstracao" className="btn-ghost px-6 py-3">
                Ver demonstração
              </a>
            </div>
          </div>
        </section>

        <LandingDemoChart />

        <section id="recursos" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mb-10 max-w-xl">
            <h2 className="font-display text-2xl font-semibold sm:text-3xl">O que o sistema oferece</h2>
            <p className="mt-2 text-muted">
              Tudo integrado por equipe, com permissões por papel e foco no dia a dia do
              escritório.
            </p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <li
                key={feature.title}
                className="panel-solid flex flex-col gap-3 p-5 transition-shadow hover:shadow-md"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  <Icon name={feature.icon} className="h-5 w-5" />
                </span>
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{feature.description}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t border-border bg-surface-elevated">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-14 text-center sm:px-6">
            <h2 className="font-display text-2xl font-semibold">Pronto para começar?</h2>
            <p className="max-w-md text-sm text-muted">
              Acesso restrito à sua equipe. Use o login fornecido pelo administrador.
            </p>
            <Link href="/login" className="btn-primary px-8 py-3">
              Entrar no RMBV
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted">
        RMBV System · Gestão de clientes e equipes
      </footer>
    </div>
  );
}
