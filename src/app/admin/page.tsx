"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CSV_HEADERS } from "@/lib/client-fields";
import { TeamAdminPanel } from "@/components/TeamAdminPanel";
import { AdminUsersPanel } from "@/components/AdminUsersPanel";
import { Icon } from "@/components/ui/Icon";
import { SelectField } from "@/components/ui/SelectField";

type Category = { id: string; name: string };
type Tab = "equipes" | "usuarios" | "importar";

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [tab, setTab] = useState<Tab>("equipes");
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
        const list = (d.teams ?? []).map((t: { id: string; name: string }) => ({
          id: t.id,
          name: t.name,
        }));
        setTeams(list);
        if (list[0]) setTeamId(list[0].id);
      })
      .catch(() => {});
  }, [router]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !categoryId || !teamId) return;

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

  const tabs: { id: Tab; label: string; icon: "building" | "users" | "upload" }[] = [
    { id: "equipes", label: "Equipes", icon: "building" },
    { id: "usuarios", label: "Usuários", icon: "users" },
    { id: "importar", label: "Importar CSV", icon: "upload" },
  ];

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Icon name="shield" className="h-6 w-6 text-primary" />
            <h1 className="font-display text-xl font-semibold tracking-wide">
              Painel administrativo
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted">
            Equipes, usuários e importação — visão global do sistema
          </p>
        </div>
        <Link href="/clients/new" className="btn-primary">
          <Icon name="userPlus" className="h-4 w-4" />
          Novo cliente
        </Link>
      </div>

      <div className="-mb-px scrollbar-none mb-6 flex flex-wrap gap-0 overflow-x-auto border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:border-border hover:text-foreground"
            }`}
          >
            <Icon name={t.icon} className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "equipes" && <TeamAdminPanel onTeamsChange={setTeams} />}

      {tab === "usuarios" && <AdminUsersPanel teams={teams} />}

      {tab === "importar" && (
        <section className="industrial-panel max-w-2xl space-y-4 p-6">
          <div className="flex items-center gap-2">
            <Icon name="upload" className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-semibold">Importação CSV</h2>
          </div>
          <p className="font-mono text-xs text-muted break-all">{CSV_HEADERS.join(";")}</p>

          {teams.length === 0 ? (
            <p className="alert alert-warn">Crie uma equipe na aba Equipes antes de importar.</p>
          ) : (
            <form onSubmit={handleUpload} className="space-y-4">
              <SelectField label="Equipe" value={teamId} onChange={setTeamId} required>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </SelectField>
              <SelectField label="Categoria" value={categoryId} onChange={setCategoryId} required>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </SelectField>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Arquivo CSV</label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="industrial-input file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1 file:text-sm file:text-primary-foreground"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  required
                />
              </div>
              <button type="submit" className="btn-primary" disabled={loading || !file}>
                <Icon name="upload" className="h-4 w-4" />
                {loading ? "Importando..." : "Subir CSV"}
              </button>
            </form>
          )}
          {result && <p className="alert alert-success">{result}</p>}
          {error && <p className="alert alert-error">{error}</p>}
        </section>
      )}
    </AppShell>
  );
}
