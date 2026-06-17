"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
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
        if (db && db !== "ok") {
          setSetupHint(
            "Banco local não configurado. Cole DATABASE_URL do Neon/Vercel em `.env.local`, defina JWT_SECRET e reinicie `npm run dev`."
          );
        } else if (jwt === "missing") {
          setSetupHint(
            "JWT_SECRET ausente no `.env.local`. Gere uma string longa (32+ caracteres) e reinicie `npm run dev`."
          );
        }
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
      if (!res.ok) {
        const hint =
          res.status === 503
            ? process.env.NODE_ENV === "development"
              ? "\n\nDica local: `npx vercel env pull .env.local` e reinicie `npm run dev`."
              : "\n\nDica: configure DATABASE_URL (PostgreSQL) e JWT_SECRET na Vercel e rode o seed."
            : "";
        throw new Error((data.error ?? "Falha no login") + hint);
      }
      const from = searchParams.get("from") ?? "/dashboard";
      router.push(from);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro no login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <form
        onSubmit={handleSubmit}
        className="industrial-panel w-full max-w-md space-y-4 p-8"
      >
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-muted hover:text-foreground">
            <Icon name="fileText" className="h-5 w-5 text-primary" />
          </Link>
          <div>
            <h1 className="font-display text-lg font-semibold tracking-wide">RMBV System</h1>
            <p className="text-sm text-muted">Entre com suas credenciais de acesso</p>
          </div>
        </div>

        {setupHint && <p className="alert alert-warn">{setupHint}</p>}

        <div>
          <label className="mb-1 block text-xs text-muted">Login</label>
          <input
            type="text"
            className="industrial-input"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="Admin"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted">Senha</label>
          <input
            type="password"
            className="industrial-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p className="alert alert-error">{error}</p>}

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          <Icon name="logIn" className="h-4 w-4" />
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
