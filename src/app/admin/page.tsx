"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CSV_HEADERS } from "@/lib/client-fields";
import { TeseManager } from "@/components/TeseManager";
import { TeamAdminPanel } from "@/components/TeamAdminPanel";

type Category = { id: string; name: string };

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user?.role !== "ADMIN") {
          router.replace("/dashboard");
          return;
        }
        setUser(d.user);
      });
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => {
        const cats = d.categories ?? [];
        setCategories(cats);
        if (cats[0]) setCategoryId(cats[0].id);
      });
    fetch("/api/teams")
      .then((r) => r.json())
      .then((d) => {
        const list = d.teams ?? [];
        setTeams(list);
        if (list[0]) setTeamId(list[0].id);
      });
  }, [router]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !categoryId) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("categoryId", categoryId);
    formData.append("teamId", teamId);

    try {
      const res = await fetch("/api/admin/import-csv", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha na importação");
      setResult(
        `${data.imported} cliente(s) importado(s).` +
          (data.warnings?.length ? ` Avisos: ${data.warnings.length}` : "")
      );
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro na importação");
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <AppShell>
        <p className="text-sm text-muted">Verificando permissões...</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-wide">Administração</h1>
        <p className="mt-1 text-sm text-muted">
          Importação em lote via CSV (modelo MODEL.csv)
        </p>
      </div>

      <section className="industrial-panel max-w-xl space-y-4 p-6">
        <div>
          <h2 className="text-sm font-medium">Formato esperado</h2>
          <p className="mt-1 font-mono text-xs text-muted break-all">
            {CSV_HEADERS.join(";")}
          </p>
          <p className="mt-2 text-xs text-muted">
            Separador: ponto e vírgula (;). Status inicial: Aguardando.
          </p>
        </div>

        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-muted">Equipe dos importados</label>
            <select
              className="industrial-input"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              required
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Categoria dos importados</label>
            <select
              className="industrial-input"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Arquivo CSV</label>
            <input
              type="file"
              accept=".csv,text/csv"
              className="industrial-input"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading || !file}>
            {loading ? "Importando..." : "Subir CSV"}
          </button>
        </form>

        {result && <p className="text-sm text-muted">{result}</p>}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </section>

      <div className="mt-8 space-y-8">
        <TeamAdminPanel />
      </div>
    </AppShell>
  );
}
