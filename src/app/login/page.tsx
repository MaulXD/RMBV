"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { primeSessionCache, type SessionUser } from "@/components/SessionProvider";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [setupHint, setSetupHint] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) return;
        const db = data.checks?.DATABASE_URL;
        const jwt = data.checks?.JWT_SECRET;
        if (db && db !== "ok") setSetupHint("Banco não configurado. Configure DATABASE_URL e reinicie.");
        else if (jwt === "missing") setSetupHint("JWT_SECRET ausente. Gere uma chave e reinicie.");
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha no login");
      primeSessionCache(data.user as SessionUser);
      const u = data.user as SessionUser;
      const needsSetup =
        u.role !== "ADMIN" &&
        (u.mustChangePassword || !u.hasFace || !u.hasFaceConsent);
      router.push(
        needsSetup ? "/primeiro-acesso" : (searchParams.get("from") ?? "/dashboard"),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro no login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes floatA {
          0%,100% { transform: translateY(0px) rotate(-1deg); }
          50%      { transform: translateY(-14px) rotate(1deg); }
        }
        @keyframes floatB {
          0%,100% { transform: translateY(0px) rotate(1deg); }
          50%      { transform: translateY(-10px) rotate(-0.5deg); }
        }
        @keyframes floatC {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-18px); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .card-a { animation: floatA 7s ease-in-out infinite; }
        .card-b { animation: floatB 9s ease-in-out infinite 1s; }
        .card-c { animation: floatC 6s ease-in-out infinite 2.5s; }
        .shimmer-text {
          background: linear-gradient(90deg, #818cf8 0%, #c084fc 30%, #f0abfc 50%, #c084fc 70%, #818cf8 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }
      `}</style>

      <div
        className="relative flex min-h-screen overflow-hidden"
        style={{ background: "linear-gradient(135deg, #080c18 0%, #0f1428 40%, #130d2e 70%, #080c18 100%)" }}
      >
        {/* ── Global background elements ── */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(rgba(99,102,241,1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div className="pointer-events-none absolute -top-40 left-1/3 h-[600px] w-[600px] rounded-full bg-indigo-700/20 blur-[160px]" />
        <div className="pointer-events-none absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-violet-700/15 blur-[140px]" />
        <div className="pointer-events-none absolute left-0 top-1/2 h-[400px] w-[400px] -translate-y-1/2 rounded-full bg-blue-800/10 blur-[120px]" />

        {/* ══════════════════════════════════════════════
            LEFT — Branding + floating product preview
        ══════════════════════════════════════════════ */}
        <div className="relative hidden flex-col lg:flex lg:w-[58%]">
          <div className="relative z-10 flex flex-1 flex-col px-16 py-14">

            {/* Logo */}
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl shadow-lg"
                style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", boxShadow: "0 0 20px rgba(99,102,241,0.4)" }}
              >
                <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 text-white" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <span className="text-[11px] font-black tracking-[0.25em] text-white/35 uppercase">RMBV Sistema</span>
            </div>

            {/* Headline */}
            <div className="mt-16 max-w-lg">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px #34d399" }} />
                <span className="text-[11px] font-semibold tracking-wide text-indigo-300/80">Sistema em produção</span>
              </div>

              <h1 className="text-5xl font-black leading-[1.1] tracking-tight text-white xl:text-6xl">
                Gestão jurídica
                <br />
                <span className="shimmer-text">sem complicação.</span>
              </h1>
              <p className="mt-5 text-base leading-relaxed text-white/35">
                Clientes, documentos, pesquisas, metas e equipes —<br />
                tudo em um único sistema seguro e veloz.
              </p>
            </div>

            {/* ── Floating mock UI cards ── */}
            <div className="relative mt-14 flex-1">

              {/* Card 1 — Stats overview */}
              <div
                className="card-a absolute left-0 top-0 w-72 rounded-2xl border border-white/10 p-5"
                style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", boxShadow: "0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)" }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-xs font-semibold tracking-wide text-white/40 uppercase">Visão geral</p>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">Junho 2026</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { n: "247", l: "Clientes", c: "#818cf8" },
                    { n: "89",  l: "Finalizados", c: "#34d399" },
                    { n: "94%", l: "Taxa média", c: "#f59e0b" },
                    { n: "12",  l: "Novos hoje", c: "#c084fc" },
                  ].map((s) => (
                    <div key={s.l} className="rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 py-2.5">
                      <p className="text-lg font-bold" style={{ color: s.c }}>{s.n}</p>
                      <p className="text-[10px] text-white/30">{s.l}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 2 — Kanban preview */}
              <div
                className="card-b absolute right-8 top-12 w-64 rounded-2xl border border-white/10 p-4"
                style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", boxShadow: "0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.07)" }}
              >
                <p className="mb-3 text-xs font-semibold tracking-wide text-white/40 uppercase">Kanban — Equipe</p>
                <div className="space-y-2">
                  {[
                    { label: "Localizado", count: 18, color: "#10b981", w: "72%" },
                    { label: "Em andamento", count: 31, color: "#6366f1", w: "85%" },
                    { label: "Aguardando", count: 24, color: "#f59e0b", w: "60%" },
                  ].map((col) => (
                    <div key={col.label}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[10px] text-white/40">{col.label}</span>
                        <span className="text-[10px] font-semibold text-white/60">{col.count}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full"
                          style={{ width: col.w, background: col.color, boxShadow: `0 0 8px ${col.color}80` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 3 — Activity feed */}
              <div
                className="card-c absolute bottom-4 left-10 w-64 rounded-2xl border border-white/10 p-4"
                style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", boxShadow: "0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.07)" }}
              >
                <p className="mb-3 text-xs font-semibold tracking-wide text-white/40 uppercase">Atividade recente</p>
                <div className="space-y-2.5">
                  {[
                    { name: "Ana Lima", action: "finalizou cliente", time: "agora", dot: "#34d399" },
                    { name: "Carlos M.", action: "adicionou pesquisa", time: "4m", dot: "#818cf8" },
                    { name: "Julia S.", action: "moveu para Localizado", time: "12m", dot: "#f59e0b" },
                  ].map((a) => (
                    <div key={a.name} className="flex items-center gap-2.5">
                      <div className="h-6 w-6 shrink-0 rounded-full border border-white/10 bg-white/10 flex items-center justify-center">
                        <span className="text-[9px] font-bold text-white/60">{a.name[0]}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[10px] text-white/60">
                          <span className="font-semibold text-white/80">{a.name}</span> {a.action}
                        </p>
                      </div>
                      <div className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: a.dot }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Features list */}
            <div className="mt-auto grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-8 pb-2">
              {[
                { label: "Gestão de clientes" },
                { label: "Kanban inteligente" },
                { label: "Relatórios e PDF" },
                { label: "Controle de acesso" },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-2">
                  <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-500/20">
                    <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 text-indigo-400" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="2 5 4.5 7.5 8.5 2.5" />
                    </svg>
                  </div>
                  <span className="text-xs text-white/40">{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right-edge vignette for panel separation */}
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-32"
            style={{ background: "linear-gradient(to right, transparent, rgba(8,12,24,0.6))" }}
          />
        </div>

        {/* ══════════════════════════════════════════════
            RIGHT — Login form
        ══════════════════════════════════════════════ */}
        <div className="relative flex min-h-dvh flex-1 flex-col items-center justify-start overflow-y-auto px-6 py-8 safe-area-top sm:justify-center sm:py-16 lg:px-14">

          {/* Thin left border for large screens */}
          <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-px lg:block"
            style={{ background: "linear-gradient(to bottom, transparent 0%, rgba(99,102,241,0.3) 40%, rgba(99,102,241,0.3) 60%, transparent 100%)" }}
          />

          {/* Mobile logo */}
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <span className="text-sm font-bold text-white">RMBV Sistema</span>
          </div>

          {/* Glass form card */}
          <div
            className="w-full max-w-[360px] rounded-3xl border border-white/10 p-8"
            style={{
              background: "rgba(255,255,255,0.04)",
              backdropFilter: "blur(24px)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06) inset, 0 1px 0 rgba(255,255,255,0.1) inset",
            }}
          >
            {/* Card header */}
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-white">Entrar</h2>
              <p className="mt-1 text-sm text-white/35">Acesso ao painel de gestão</p>
            </div>

            {setupHint && (
              <div className="mb-5 rounded-xl border border-amber-400/20 bg-amber-400/[0.08] px-4 py-3 text-sm text-amber-300">
                {setupHint}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Login */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold tracking-wide text-white/40 uppercase">
                  Login
                </label>
                <div className="relative">
                  <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <input
                    type="text"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    placeholder="Login ou e-mail"
                    required
                    autoComplete="username"
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] py-3 pl-10 pr-4 text-sm text-white placeholder:text-white/20 outline-none transition-all duration-200 focus:border-indigo-500/50 focus:bg-white/[0.08] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold tracking-wide text-white/40 uppercase">
                  Senha
                </label>
                <div className="relative">
                  <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] py-3 pl-10 pr-11 text-sm text-white placeholder:text-white/20 outline-none transition-all duration-200 focus:border-indigo-500/50 focus:bg-white/[0.08] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/20 transition-colors hover:text-white/50"
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-4 py-3">
                  <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-red-400" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                  </svg>
                  <span className="text-sm leading-snug text-red-300">{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="group relative mt-1 w-full overflow-hidden rounded-xl py-3.5 text-sm font-bold text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-60"
                style={{
                  background: "linear-gradient(135deg, #4f46e5 0%, #6d28d9 50%, #7c3aed 100%)",
                  boxShadow: loading ? "none" : "0 0 40px rgba(99,102,241,0.4), 0 4px 20px rgba(0,0,0,0.4)",
                }}
              >
                {/* Hover shimmer overlay */}
                <div className="pointer-events-none absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-[100%]" />
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
                    </svg>
                    Entrando...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Entrar no sistema
                    <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </span>
                )}
              </button>
            </form>

            {/* Card footer */}
            <div className="mt-6 flex items-center justify-center gap-2">
              <div className="h-px flex-1 bg-white/[0.06]" />
              <p className="text-[10px] font-medium text-white/20">Acesso restrito</p>
              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>
          </div>

          <p className="mt-6 text-[11px] text-white/15">
            RMBV Sistema de Gestão &copy; 2026
          </p>
        </div>
      </div>
    </>
  );
}
