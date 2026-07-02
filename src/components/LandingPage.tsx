"use client";

import Link from "next/link";
import { ScrollAnimate } from "@/components/ScrollAnimate";

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
    title: "Clientes e teses",
    description: "Cadastro completo, filtros por tese, histórico detalhado e checklist por caso.",
    color: "#6366f1",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="8" width="5" height="13" rx="1"/>
        <rect x="17" y="5" width="5" height="16" rx="1"/>
      </svg>
    ),
    title: "Kanban da equipe",
    description: "Tarefas com prazos, alertas de atraso e vínculo direto com o cliente.",
    color: "#a855f7",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
    title: "Ferramentas PDF",
    description: "Juntar, dividir, Bates, marca d'água, OCR e salvar nos documentos do cliente.",
    color: "#f59e0b",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    title: "Relatórios",
    description: "Gráficos, metas, exportação CSV e PDF por tese ou equipe.",
    color: "#34d399",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    title: "Documentos",
    description: "Upload seguro por cliente com controle de acesso por equipe.",
    color: "#38bdf8",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
    ),
    title: "Pesquisa inteligente",
    description: "Identifique telefones e endereços no texto e marque verificações.",
    color: "#f472b6",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        <path d="M21 21v-2a4 4 0 0 0-3-3.87"/>
      </svg>
    ),
    title: "Ponto eletrônico facial",
    description: "Colaboradores registram entrada e saída pelo celular com reconhecimento facial — sem cartão, sem senha.",
    color: "#10b981",
    badge: "Diferencial",
  },
];

type Feature = typeof FEATURES[number];

const STATS = [
  { value: "100%", label: "Baseado em equipes" },
  { value: "8h", label: "Sessão segura JWT" },
  { value: "PDF", label: "Export completo" },
  { value: "Multi", label: "Teses simultâneas" },
];

export function LandingPage() {
  return (
    <>
      <style>{`
        @keyframes landingShimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        .landing-shimmer {
          background: linear-gradient(90deg,#818cf8 0%,#c084fc 30%,#f0abfc 50%,#c084fc 70%,#818cf8 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: landingShimmer 4s linear infinite;
        }
        @keyframes pulseDot {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:.5; transform:scale(1.4); }
        }
        .pulse-dot { animation: pulseDot 2s ease-in-out infinite; }
        @keyframes floatCard {
          0%,100% { transform: translateY(0px) rotate(-0.5deg); }
          50%      { transform: translateY(-10px) rotate(0.5deg); }
        }
        @keyframes floatCard2 {
          0%,100% { transform: translateY(0px) rotate(0.5deg); }
          50%      { transform: translateY(-14px) rotate(-0.5deg); }
        }
        .float-1 { animation: floatCard  7s ease-in-out infinite; }
        .float-2 { animation: floatCard2 9s ease-in-out infinite 1.5s; }
      `}</style>

      <div
        className="relative min-h-screen overflow-x-hidden"
        style={{ background: "linear-gradient(135deg,#080c18 0%,#0f1428 40%,#130d2e 70%,#080c18 100%)" }}
      >
        {/* Grid texture */}
        <div
          className="pointer-events-none fixed inset-0 opacity-[0.025]"
          style={{
            backgroundImage: "linear-gradient(rgba(99,102,241,1) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,1) 1px,transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Ambient orbs */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute -top-40 left-1/3 h-[600px] w-[600px] rounded-full bg-indigo-700/20 blur-[160px]" />
          <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-violet-700/15 blur-[140px]" />
          <div className="absolute left-0 top-1/2 h-[400px] w-[400px] -translate-y-1/2 rounded-full bg-blue-800/10 blur-[120px]" />
        </div>

        {/* ── Nav ── */}
        <header className="relative z-20 border-b border-white/[0.06]" style={{ backdropFilter:"blur(20px)", background:"rgb(8 12 24 / 0.70)" }}>
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg shadow-lg"
                style={{ background:"linear-gradient(135deg,#4f46e5,#7c3aed)", boxShadow:"0 0 16px rgba(99,102,241,0.4)" }}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </div>
              <span className="text-[11px] font-black tracking-[0.25em] text-white/35 uppercase">SCS Sistema</span>
            </div>
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all"
              style={{ background:"linear-gradient(135deg,#4f46e5,#6d28d9)", boxShadow:"0 0 20px rgba(99,102,241,0.3)" }}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                <polyline points="10 17 15 12 10 7"/>
                <line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
              Entrar
            </Link>
          </div>
        </header>

        <main className="relative z-10">

          {/* ── Hero ── */}
          <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-32">
            <div className="grid items-center gap-16 lg:grid-cols-2">

              {/* Left — copy */}
              <div>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1.5">
                  <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-emerald-400" style={{ boxShadow:"0 0 6px #34d399" }} />
                  <span className="text-[11px] font-semibold tracking-wide text-indigo-300/80">Sistema em produção</span>
                </div>

                <h1 className="text-5xl font-black leading-[1.08] tracking-tight text-white xl:text-6xl">
                  Gestão jurídica<br />
                  <span className="landing-shimmer">sem complicação.</span>
                </h1>

                <p className="mt-6 max-w-lg text-base leading-relaxed text-white/40">
                  Clientes, documentos, pesquisas, metas e equipes — tudo em um único sistema
                  seguro e veloz, pensado para escritórios de volume.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/login"
                    className="group relative flex items-center gap-2 overflow-hidden rounded-xl px-6 py-3.5 text-sm font-bold text-white transition-all duration-200"
                    style={{ background:"linear-gradient(135deg,#4f46e5 0%,#6d28d9 50%,#7c3aed 100%)", boxShadow:"0 0 40px rgba(99,102,241,0.4),0 4px 20px rgba(0,0,0,0.4)" }}
                  >
                    <div className="pointer-events-none absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-[100%]" />
                    Acessar o sistema
                    <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </Link>
                  <a
                    href="#recursos"
                    className="flex items-center gap-2 rounded-xl border border-white/10 px-6 py-3.5 text-sm font-semibold text-white/60 backdrop-blur-sm transition-all hover:border-white/20 hover:text-white/90"
                    style={{ background:"rgba(255,255,255,0.05)" }}
                  >
                    Ver recursos
                  </a>
                </div>

                {/* Stats row */}
                <div className="mt-12 flex flex-wrap gap-6">
                  {STATS.map((s) => (
                    <div key={s.label}>
                      <p className="text-2xl font-black text-white">{s.value}</p>
                      <p className="text-xs text-white/35">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right — floating mock cards */}
              <div className="relative hidden h-[420px] lg:block">
                {/* Card 1 — stats */}
                <div
                  className="float-1 absolute left-0 top-0 w-72 rounded-2xl border border-white/10 p-5"
                  style={{ background:"rgba(255,255,255,0.05)", backdropFilter:"blur(20px)", boxShadow:"0 20px 60px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.08)" }}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-xs font-semibold tracking-wide text-white/40 uppercase">Visão geral</p>
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">Junho 2026</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { n:"247", l:"Clientes",    c:"#818cf8" },
                      { n:"89",  l:"Finalizados", c:"#34d399" },
                      { n:"94%", l:"Taxa média",  c:"#f59e0b" },
                      { n:"12",  l:"Novos hoje",  c:"#c084fc" },
                    ].map((s) => (
                      <div key={s.l} className="rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 py-2.5">
                        <p className="text-lg font-bold" style={{ color:s.c }}>{s.n}</p>
                        <p className="text-[10px] text-white/30">{s.l}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card 2 — kanban */}
                <div
                  className="float-2 absolute right-0 top-16 w-64 rounded-2xl border border-white/10 p-4"
                  style={{ background:"rgba(255,255,255,0.04)", backdropFilter:"blur(20px)", boxShadow:"0 20px 60px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.07)" }}
                >
                  <p className="mb-3 text-xs font-semibold tracking-wide text-white/40 uppercase">Kanban — Equipe</p>
                  <div className="space-y-2.5">
                    {[
                      { label:"Localizado",   count:18, color:"#10b981", w:"72%" },
                      { label:"Em andamento", count:31, color:"#6366f1", w:"85%" },
                      { label:"Aguardando",   count:24, color:"#f59e0b", w:"60%" },
                    ].map((col) => (
                      <div key={col.label}>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-[10px] text-white/40">{col.label}</span>
                          <span className="text-[10px] font-semibold text-white/60">{col.count}</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-white/[0.06]">
                          <div className="h-full rounded-full" style={{ width:col.w, background:col.color, boxShadow:`0 0 8px ${col.color}80` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card 3 — activity */}
                <div
                  className="float-1 absolute bottom-0 left-8 w-64 rounded-2xl border border-white/10 p-4"
                  style={{ background:"rgba(255,255,255,0.04)", backdropFilter:"blur(20px)", boxShadow:"0 20px 60px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.07)", animationDelay:"3s" }}
                >
                  <p className="mb-3 text-xs font-semibold tracking-wide text-white/40 uppercase">Atividade recente</p>
                  <div className="space-y-2.5">
                    {[
                      { name:"Ana Lima",   action:"finalizou cliente",      dot:"#34d399" },
                      { name:"Carlos M.", action:"adicionou pesquisa",      dot:"#818cf8" },
                      { name:"Julia S.",  action:"moveu para Localizado",   dot:"#f59e0b" },
                    ].map((a) => (
                      <div key={a.name} className="flex items-center gap-2.5">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10">
                          <span className="text-[9px] font-bold text-white/60">{a.name[0]}</span>
                        </div>
                        <p className="min-w-0 flex-1 truncate text-[10px] text-white/60">
                          <span className="font-semibold text-white/80">{a.name}</span> {a.action}
                        </p>
                        <div className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background:a.dot }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── Divider ── */}
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>

          {/* ── Features ── */}
          <section id="recursos" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
            <ScrollAnimate className="mb-12 text-center">
              <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-indigo-400 uppercase">Recursos</p>
              <h2 className="text-3xl font-black text-white sm:text-4xl">
                O que o sistema oferece
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-base text-white/40">
                Tudo integrado por equipe, com permissões por papel e foco no dia a dia do escritório.
              </p>
            </ScrollAnimate>

            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f: Feature, i: number) => (
                <ScrollAnimate key={f.title} as="li" delay={i * 60}>
                  <div
                    className="group relative flex h-full flex-col gap-4 rounded-2xl border p-5 transition-all duration-200 hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
                    style={{
                      background: "badge" in f ? `linear-gradient(135deg,rgba(16,185,129,0.08),rgba(255,255,255,0.04))` : "rgba(255,255,255,0.04)",
                      backdropFilter:"blur(16px)",
                      borderColor: "badge" in f ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.08)",
                    }}
                  >
                    {"badge" in f && (
                      <span className="absolute right-3 top-3 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-400 uppercase">
                        {(f as Feature & {badge:string}).badge}
                      </span>
                    )}
                    <span
                      className="flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200 group-hover:scale-110"
                      style={{ background:`${f.color}22`, color:f.color, boxShadow:`0 0 20px ${f.color}30` }}
                    >
                      {f.icon}
                    </span>
                    <div>
                      <h3 className="font-bold text-white">{f.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-white/40">{f.description}</p>
                    </div>
                  </div>
                </ScrollAnimate>
              ))}
            </ul>
          </section>

          {/* ── Ponto Eletrônico destaque ── */}
          <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
            <div
              className="relative overflow-hidden rounded-3xl border border-emerald-500/20 p-8 sm:p-12"
              style={{ background:"linear-gradient(135deg,rgba(16,185,129,0.07) 0%,rgba(255,255,255,0.03) 60%,rgba(6,78,59,0.08) 100%)", backdropFilter:"blur(20px)" }}
            >
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-[80px]" />
              <div className="pointer-events-none absolute -bottom-10 left-1/3 h-40 w-40 rounded-full bg-teal-500/10 blur-[60px]" />

              <div className="relative z-10 grid items-center gap-10 lg:grid-cols-2">
                <div>
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" style={{ boxShadow:"0 0 6px #34d399" }} />
                    <span className="text-[11px] font-semibold tracking-wide text-emerald-400">Diferencial exclusivo</span>
                  </div>
                  <h2 className="text-3xl font-black text-white sm:text-4xl">
                    Ponto eletrônico<br />
                    <span style={{ color:"#34d399" }}>sem hardware.</span>
                  </h2>
                  <p className="mt-4 max-w-md text-base leading-relaxed text-white/40">
                    Colaboradores registram entrada e saída direto pelo celular. O sistema reconhece o rosto automaticamente — sem cartão, sem leitor biométrico, sem custo de equipamento.
                  </p>
                  <ul className="mt-6 space-y-2.5">
                    {[
                      "Funciona em qualquer celular com câmera",
                      "Reconhecimento facial gratuito, sem API externa",
                      "Relatório de ponto por equipe no admin",
                      "Dados nunca saem do seu servidor",
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2.5 text-sm text-white/60">
                        <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-emerald-400" fill="currentColor">
                          <path d="M12.207 4.793a1 1 0 0 1 0 1.414l-5 5a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L6.5 9.086l4.293-4.293a1 1 0 0 1 1.414 0Z"/>
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Mock kiosk card */}
                <div className="flex justify-center">
                  <div
                    className="w-64 rounded-2xl border border-white/10 p-5"
                    style={{ background:"rgba(255,255,255,0.05)", backdropFilter:"blur(20px)", boxShadow:"0 20px 60px rgba(0,0,0,0.4)" }}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-semibold tracking-wide text-white/40 uppercase">Ponto — 08:47</p>
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">Ao vivo</span>
                    </div>
                    <div className="mb-3 flex aspect-square items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                      <svg viewBox="0 0 24 24" className="h-16 w-16 text-emerald-500/40" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                    </div>
                    <div className="space-y-1.5">
                      {[
                        { name:"Ana Lima",   time:"08:02", type:"Entrada" },
                        { name:"Carlos M.", time:"08:31", type:"Entrada" },
                        { name:"Julia S.",  time:"08:45", type:"Entrada" },
                      ].map((r) => (
                        <div key={r.name} className="flex items-center justify-between rounded-lg bg-white/[0.04] px-2.5 py-1.5">
                          <div className="flex items-center gap-2">
                            <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                              <span className="text-[8px] font-bold text-emerald-400">{r.name[0]}</span>
                            </div>
                            <span className="text-[10px] text-white/60">{r.name}</span>
                          </div>
                          <span className="text-[10px] text-white/30">{r.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── CTA ── */}
          <ScrollAnimate>
            <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
              <div
                className="relative overflow-hidden rounded-3xl border border-white/10 p-12 text-center"
                style={{ background:"rgba(255,255,255,0.04)", backdropFilter:"blur(20px)", boxShadow:"0 40px 80px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.08)" }}
              >
                {/* CTA orb */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-64 w-64 rounded-full bg-indigo-600/20 blur-[80px]" />
                </div>

                <div className="relative z-10">
                  <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-indigo-400 uppercase">Acesso restrito</p>
                  <h2 className="text-3xl font-black text-white sm:text-4xl">Pronto para começar?</h2>
                  <p className="mx-auto mt-4 max-w-md text-base text-white/40">
                    Use o login fornecido pelo administrador para acessar o painel da sua equipe.
                  </p>
                  <Link
                    href="/login"
                    className="group relative mt-8 inline-flex items-center gap-2 overflow-hidden rounded-xl px-8 py-4 text-sm font-bold text-white transition-all duration-200"
                    style={{ background:"linear-gradient(135deg,#4f46e5 0%,#6d28d9 50%,#7c3aed 100%)", boxShadow:"0 0 40px rgba(99,102,241,0.4),0 4px 20px rgba(0,0,0,0.4)" }}
                  >
                    <div className="pointer-events-none absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-[100%]" />
                    Entrar no SCS
                    <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </Link>
                </div>
              </div>
            </section>
          </ScrollAnimate>
        </main>

        <footer className="relative z-10 border-t border-white/[0.06] py-6 text-center text-xs text-white/20">
          SCS Sistema de Gestão &copy; 2026
        </footer>
      </div>
    </>
  );
}
