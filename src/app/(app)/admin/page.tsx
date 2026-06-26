"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/components/SessionProvider";
import { CSV_HEADERS } from "@/lib/client-fields";
import { TeamAdminPanel } from "@/components/TeamAdminPanel";
import { AdminUsersPanel } from "@/components/AdminUsersPanel";
import { AuditLogPanel } from "@/components/AuditLogPanel";
import { TeseManager } from "@/components/TeseManager";
import { AdminClientsPanel } from "@/components/AdminClientsPanel";
import { BackupPanel } from "@/components/BackupPanel";
import { TeamFaceEnrollmentPanel } from "@/components/TeamFaceEnrollmentPanel";
import { FaceAuditStatsPanel } from "@/components/FaceAuditStatsPanel";
import { Icon } from "@/components/ui/Icon";
import { SelectField } from "@/components/ui/SelectField";

type Tab = "equipes" | "usuarios" | "teses" | "clientes" | "importar" | "auditoria" | "backup" | "ponto";

export default function AdminPage() {
  const router = useRouter();
  const { user } = useSession();
  const [tab, setTab] = useState<Tab>("equipes");
  const [teamId, setTeamId] = useState("");
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [importTeses, setImportTeses] = useState<{ id: string; name: string }[]>([]);
  const [importTeseId, setImportTeseId] = useState("");
  const [importTeseName, setImportTeseName] = useState("");
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [importCategoryId, setImportCategoryId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kioskUrl, setKioskUrl] = useState("");

  useEffect(() => {
    if (loading) return;
    if (user === null || (user && user.role !== "ADMIN")) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => {
        const list = (d.categories ?? []) as { id: string; name: string }[];
        setCategories(list);
        if (list[0]) setImportCategoryId(list[0].id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!teamId) return;
    setImportTeses([]);
    setImportTeseId("");
    setImportTeseName("");
    fetch(`/api/teses?teamId=${teamId}`)
      .then((r) => r.json())
      .then((d) => {
        const teses = d.teses ?? [];
        setImportTeses(teses);
        if (teses.length > 0) setImportTeseId(teses[0].id);
      });
  }, [teamId]);

  useEffect(() => {
    if (!teamId) {
      setKioskUrl("");
      return;
    }
    fetch(`/api/ponto/kiosk-link?teamId=${encodeURIComponent(teamId)}`)
      .then((r) => r.json())
      .then((d: { url?: string }) => setKioskUrl(d.url ?? ""))
      .catch(() => setKioskUrl(""));
  }, [teamId]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !teamId) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("teamId", teamId);
    if (importCategoryId) formData.append("categoryId", importCategoryId);
    if (importTeseId) formData.append("teseId", importTeseId);
    else if (importTeseName.trim()) formData.append("teseName", importTeseName.trim());

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

  if (!user || user.role !== "ADMIN") {
    return <p className="text-sm text-muted">Verificando permissões...</p>;
  }

  const tabs: { id: Tab; label: string; icon: "building" | "users" | "layers" | "dashboard" | "upload" | "clipboardList" | "fileDown" | "scanFace" }[] = [
    { id: "equipes", label: "Equipes", icon: "building" },
    { id: "usuarios", label: "Usuários", icon: "users" },
    { id: "teses", label: "Teses", icon: "layers" },
    { id: "clientes", label: "Clientes", icon: "dashboard" },
    { id: "importar", label: "Importar CSV", icon: "upload" },
    { id: "backup", label: "Backup", icon: "fileDown" },
    { id: "auditoria", label: "Auditoria", icon: "clipboardList" },
    { id: "ponto", label: "Ponto facial", icon: "scanFace" },
  ];

  return (
    <>
      <div className="page-header">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-rose-500"
            style={{
              background: "color-mix(in srgb, #f43f5e 10%, var(--color-surface-elevated))",
              borderColor: "color-mix(in srgb, #f43f5e 25%, transparent)",
            }}
          >
            <Icon name="shield" className="h-5 w-5" />
          </span>
          <div>
            <h1 className="page-title">Painel administrativo</h1>
            <p className="page-subtitle">Equipes, usuários e importação — visão global do sistema</p>
          </div>
        </div>
        <Link href="/clients/new" className="btn-primary">
          <Icon name="userPlus" className="h-4 w-4" />
          Novo cliente
        </Link>
      </div>

      <div className="app-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`app-tab ${tab === t.id ? "app-tab-active" : ""}`}
          >
            <Icon name={t.icon} className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "equipes" && <TeamAdminPanel onTeamsChange={setTeams} />}

      {tab === "usuarios" && <AdminUsersPanel teams={teams} />}

      {tab === "teses" && (
        <div>
          <p className="mb-4 text-sm text-muted">
            Gerencie as teses de cada equipe. Selecione uma equipe na aba{" "}
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => setTab("equipes")}
            >
              Equipes
            </button>{" "}
            para depois acessar as teses da equipe correspondente, ou use o componente abaixo para
            gerenciar as teses da sua sessão ativa.
          </p>
          <TeseManager teams={teams} />
        </div>
      )}

      {tab === "clientes" && teams.length > 0 && (
        <AdminClientsPanel teams={teams} />
      )}

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
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </SelectField>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted">
                  Tese <span className="text-muted/60">(obrigatório)</span>
                </label>
                {importTeses.length === 0 ? (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-3 text-xs">
                    <p className="text-amber-600 dark:text-amber-400 font-medium mb-1">Esta equipe não tem teses cadastradas.</p>
                    <p className="text-muted mb-2">Crie ao menos uma tese antes de importar clientes.</p>
                    <button
                      type="button"
                      onClick={() => setTab("teses")}
                      className="text-primary underline underline-offset-2"
                    >
                      Ir para aba Teses
                    </button>
                  </div>
                ) : (
                  <>
                    <select
                      className="industrial-input"
                      value={importTeseId}
                      onChange={(e) => { setImportTeseId(e.target.value); setImportTeseName(""); }}
                    >
                      {importTeses.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                      <option value="">+ Nova tese (digitar nome abaixo)</option>
                    </select>
                    {!importTeseId && (
                      <input
                        className="industrial-input mt-2"
                        placeholder="Nome da nova tese (será criada se não existir)"
                        value={importTeseName}
                        onChange={(e) => setImportTeseName(e.target.value)}
                        required
                      />
                    )}
                  </>
                )}
                <p className="mt-1 text-xs text-muted">
                  Todos os clientes deste CSV serão vinculados a esta tese. Substitui a coluna TESE do arquivo.
                </p>
              </div>

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
              <button type="submit" className="btn-primary" disabled={loading || !file || importTeses.length === 0 || (!importTeseId && !importTeseName.trim())}>
                <Icon name="upload" className="h-4 w-4" />
                {loading ? "Importando..." : "Subir CSV"}
              </button>
            </form>
          )}
          {result && <p className="alert alert-success">{result}</p>}
          {error && <p className="alert alert-error">{error}</p>}

        </section>
      )}

      {tab === "backup" && <BackupPanel teams={teams} />}

      {tab === "auditoria" && <AuditLogPanel />}

      {tab === "ponto" && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-emerald-500"
              style={{
                background: "color-mix(in srgb, #10b981 10%, var(--color-surface-elevated))",
                borderColor: "color-mix(in srgb, #10b981 25%, transparent)",
              }}
            >
              <Icon name="scanFace" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Ponto eletrônico facial</h2>
              <p className="text-xs text-muted">Cadastre o rosto de cada colaborador para o reconhecimento automático</p>
            </div>
          </div>

          {teams.length === 0 ? (
            <p className="alert alert-warn">Crie uma equipe antes de cadastrar rostos.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Equipe</label>
                <select
                  className="industrial-input max-w-xs"
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              {teamId && (
                <div className="space-y-6">
                  <TeamFaceEnrollmentPanel teamId={teamId} />
                  <div className="industrial-panel max-w-2xl p-4">
                    <p className="text-xs font-medium text-muted mb-1">Link do quiosque de ponto</p>
                    <code className="block rounded bg-surface px-3 py-2 text-xs break-all">
                      {kioskUrl || "Configure KIOSK_API_KEY no servidor para gerar o link."}
                    </code>
                    <p className="mt-2 text-xs text-muted">
                      Abra este link no tablet da equipe (inclui chave de segurança). Não compartilhe publicamente.
                    </p>
                  </div>
                  <div>
                    <h3 className="mb-3 text-sm font-semibold">Auditoria de reconhecimento facial</h3>
                    <FaceAuditStatsPanel teamId={teamId} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
