"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { primeSessionCache, type SessionUser } from "@/components/SessionProvider";

/* ─── Feature bullets shown on the left panel ─── */
const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: "Gestão de clientes",
    desc: "Organize, filtre e acompanhe cada cliente com status, teses e histórico completo.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
    title: "Kanban inteligente",
    desc: "Fluxo visual de tarefas por equipe com arrastar, prioridades e alertas de prazo.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    title: "Relatórios e metas",
    desc: "Dashboards de produtividade, exportação PDF e metas mensais por colaborador.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    title: "Controle de acesso",
    desc: "Horários por colaborador, auditoria de sessões e permissões por função.",
  },
];

/* ─── Animated stat counters ─── */
const STATS = [
  { value: "100%", label: "Web-based" },
  { value: "8h", label: "Sessão segura" },
  { value: "PDF", label: "Exportação" },
];

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [setupHint, setSetupHint] = useState<string | null>(null);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) return;
        const db = data.checks?.DATABASE_URL;
        const jwt = data.checks?.JWT_SECRET;
        if (db && db !== "ok") {
          setSetupHint("Banco não configurado. Configure DATABASE_URL e reinicie.");
        } else if (jwt === "missing") {
          setSetupHint("JWT_SECRET ausente. Gere uma chave e reinicie.");
        }
      })
      .catch(() => {});
  }, []);

  /* Cycle through features */
  useEffect(() => {
    const t = setInterval(() => setActiveFeature((p) => (p + 1) % FEATURES.length), 3500);
    return () => clearInterval(t);
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
      if (!res.ok) {
        throw new Error(data.error ?? "Falha no login");
      }
      primeSessionCache(data.user as SessionUser);
      const from = searchParams.get("from") ?? "/dashboard";
      router.push(from);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro no login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#0a0f1e]">

      {/* ── LEFT — branding panel ── */}
      <div className="relative hidden overflow-hidden lg:flex lg:w-[55%] xl:w-[60%] flex-col">

        {/* Background gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg, #0d1117 0%, #161b34 35%, #1a1040 65%, #0d1117 100%)",
          }}
        />

        {/* Grid texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: "linear-gradient(#6366f1 1px, transparent 1px), linear-gradient(90deg, #6366f1 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />

        {/* Glow orbs */}
        <div className="pointer-events-none absolute -left-32 top-1/4 h-[500px] w-[500px] rounded-full bg-indigo-600/20 blur-[140px]" />
        <div className="pointer-events-none absolute -right-20 bottom-1/3 h-[400px] w-[400px] rounded-full bg-violet-600/15 blur-[120px]" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-[200px] w-[300px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[100px]" />

        {/* Content */}
        <div className="relative z-10 flex flex-1 flex-col px-14 py-12">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-indigo-400/30"
              style={{ background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)" }}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-bold tracking-[0.2em] text-white/30 uppercase">RMBV</p>
              <p className="text-sm font-semibold text-white/80 leading-tight">Sistema de Gestão</p>
            </div>
          </div>

          {/* Main headline */}
          <div className="mt-auto mb-12">
            <h1
              className="text-4xl font-bold leading-[1.15] text-white xl:text-5xl"
              style={{ textShadow: "0 0 80px rgba(99,102,241,0.3)" }}
            >
              Gestão jurídica
              <br />
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(90deg, #818cf8 0%, #a78bfa 50%, #c084fc 100%)" }}
              >
                que funciona.
              </span>
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-white/40">
              Centralize clientes, documentos, pesquisas e tarefas da sua equipe em um único sistema seguro.
            </p>
          </div>

          {/* Feature carousel */}
          <div className="mb-10">
            <div className="mb-4 flex gap-2">
              {FEATURES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveFeature(i)}
                  className="h-0.5 flex-1 rounded-full transition-all duration-500"
                  style={{
                    background: i === activeFeature
                      ? "linear-gradient(90deg, #6366f1, #a78bfa)"
                      : "rgba(255,255,255,0.1)",
                  }}
                />
              ))}
            </div>

            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="transition-all duration-500"
                style={{
                  opacity: i === activeFeature ? 1 : 0,
                  transform: i === activeFeature ? "translateY(0)" : "translateY(8px)",
                  position: i === activeFeature ? "relative" : "absolute",
                  pointerEvents: i === activeFeature ? "auto" : "none",
                }}
              >
                {i === activeFeature && (
                  <div className="flex items-start gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.04] p-5 backdrop-blur-sm">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-400/20">
                      {f.icon}
                    </div>
                    <div>
                      <p className="font-semibold text-white/90">{f.title}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-white/40">{f.desc}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Stats row */}
          <div className="flex gap-6 border-t border-white/[0.07] pt-8">
            {STATS.map((s) => (
              <div key={s.label}>
                <p className="text-xl font-bold text-white/90">{s.value}</p>
                <p className="text-xs text-white/30">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT — login form ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-12">
        {/* Mobile logo */}
        <div className="mb-10 flex items-center gap-3 lg:hidden">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)" }}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <span className="text-base font-bold text-white">RMBV Sistema</span>
        </div>

        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white">Bem-vindo de volta</h2>
            <p className="mt-1 text-sm text-white/40">Entre com suas credenciais para continuar</p>
          </div>

          {setupHint && (
            <div className="mb-5 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-300">
              {setupHint}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Login field */}
            <div>
              <label className="mb-2 block text-xs font-medium text-white/50">
                Login
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-white/25" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="Seu login ou e-mail"
                  required
                  autoComplete="username"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.06] py-3 pl-10 pr-4 text-sm text-white placeholder:text-white/20 outline-none transition-all focus:border-indigo-500/60 focus:bg-white/[0.08] focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label className="mb-2 block text-xs font-medium text-white/50">
                Senha
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-white/25" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.06] py-3 pl-10 pr-11 text-sm text-white placeholder:text-white/20 outline-none transition-all focus:border-indigo-500/60 focus:bg-white/[0.08] focus:ring-2 focus:ring-indigo-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute inset-y-0 right-3 flex items-center px-1 text-white/25 hover:text-white/60 transition-colors"
                  tabIndex={-1}
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
              <div className="flex items-start gap-2.5 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                </svg>
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="relative mt-2 w-full overflow-hidden rounded-xl py-3 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-60"
              style={{
                background: loading
                  ? "rgba(99,102,241,0.5)"
                  : "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                boxShadow: loading ? "none" : "0 0 30px rgba(99,102,241,0.35), 0 4px 15px rgba(0,0,0,0.3)",
              }}
            >
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
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </span>
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-white/20">
            RMBV Sistema de Gestão &middot; Acesso restrito
          </p>
        </div>
      </div>
    </div>
  );
}
