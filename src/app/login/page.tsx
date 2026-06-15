"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
            ? "\n\nDica: em produção configure DATABASE_URL (PostgreSQL) e JWT_SECRET, depois rode o seed."
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
        <div>
          <h1 className="text-lg font-semibold tracking-wide">RMBV System</h1>
          <p className="mt-1 text-sm text-muted">Entre com suas credenciais de acesso</p>
        </div>

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
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
