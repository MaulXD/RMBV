"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { LandingDemoChart } from "@/components/LandingDemoChart";
import { ScrollAnimate } from "@/components/ScrollAnimate";
import { useTheme } from "@/components/ThemeProvider";

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

function HeroShapes() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Large blob top-left */}
      <div
        className="animate-float-a absolute -left-20 -top-20 rounded-full bg-primary/20 dark:bg-primary/10"
        style={{ width: 360, height: 360, filter: "blur(60px)" }}
      />
      {/* Medium blob top-right */}
      <div
        className="animate-float-b absolute -right-12 top-8 rounded-full bg-accent/15 dark:bg-accent/8"
        style={{ width: 240, height: 240, filter: "blur(48px)", animationDelay: "2s" }}
      />
      {/* Small circle mid */}
      <div
        className="animate-float-c absolute left-1/2 top-1/3 rounded-full bg-emerald-500/12 dark:bg-emerald-500/6"
        style={{ width: 180, height: 180, filter: "blur(36px)", animationDelay: "4s" }}
      />
      {/* Tiny circle */}
      <div
        className="animate-float-d absolute bottom-8 left-1/3 rounded-full bg-primary/18 dark:bg-primary/9"
        style={{ width: 120, height: 120, filter: "blur(28px)", animationDelay: "1s" }}
      />
      {/* Extra accent blob */}
      <div
        className="animate-float-a absolute bottom-0 right-1/4 rounded-full bg-violet-500/10 dark:bg-violet-500/5"
        style={{ width: 200, height: 160, filter: "blur(50px)", animationDelay: "6s" }}
      />
    </div>
  );
}

export function LandingPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-border bg-surface-elevated">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Icon name="fileText" className="h-5 w-5 text-primary" />
            <span className="font-display text-lg font-semibold tracking-wide">RMBV</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-primary/40 hover:bg-primary/[0.06] hover:text-primary"
              title={theme === "dark" ? "Modo claro" : "Modo escuro"}
              aria-label={theme === "dark" ? "Modo claro" : "Modo escuro"}
            >
              <Icon name={theme === "dark" ? "sun" : "moon"} className="h-4 w-4" />
            </button>
            <Link href="/login" className="btn-primary px-4 py-2 text-sm">
              <Icon name="logIn" className="h-4 w-4" />
              Entrar
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border">
          <HeroShapes />
          <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <p
              className="animate-slide-up mb-3 text-xs font-semibold tracking-[0.2em] text-primary uppercase"
              style={{ animationDelay: "0ms" }}
            >
              Sistema de gestão jurídica
            </p>
            <h1
              className="animate-slide-up font-display max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl"
              style={{ animationDelay: "80ms" }}
            >
              Organize clientes, teses e documentos em um só lugar
            </h1>
            <p
              className="animate-slide-up mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg"
              style={{ animationDelay: "180ms" }}
            >
              O RMBV reúne cadastro de clientes, kanban da equipe, relatórios, documentação e
              ferramentas de PDF — pensado para escritórios que trabalham com volume e múltiplas
              teses.
            </p>
            <div
              className="animate-slide-up mt-8 flex flex-wrap gap-3"
              style={{ animationDelay: "280ms" }}
            >
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

        {/* Demo charts */}
        <ScrollAnimate>
          <LandingDemoChart />
        </ScrollAnimate>

        {/* Features */}
        <section id="recursos" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <ScrollAnimate className="mb-10 max-w-xl">
            <h2 className="font-display text-2xl font-semibold sm:text-3xl">O que o sistema oferece</h2>
            <p className="mt-2 text-muted">
              Tudo integrado por equipe, com permissões por papel e foco no dia a dia do escritório.
            </p>
          </ScrollAnimate>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, i) => (
              <ScrollAnimate key={feature.title} as="li" delay={i * 80}>
                <div className="panel-solid flex h-full flex-col gap-3 p-5 transition-shadow hover:shadow-md">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
                    <Icon name={feature.icon} className="h-5 w-5" />
                  </span>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-muted">{feature.description}</p>
                </div>
              </ScrollAnimate>
            ))}
          </ul>
        </section>

        {/* CTA */}
        <ScrollAnimate>
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
        </ScrollAnimate>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted">
        RMBV System · Gestão de clientes e equipes
      </footer>
    </div>
  );
}
