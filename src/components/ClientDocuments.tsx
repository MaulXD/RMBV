"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppConfig } from "./useAppConfig";

type DocumentRow = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  downloadUrl: string;
  uploadedBy: { id: string; name: string; email: string };
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ClientDocuments({
  clientId,
  isAdmin,
}: {
  clientId: string;
  isAdmin: boolean;
}) {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { config: appConfig } = useAppConfig();

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/documents`);
      const data = await res.json();
      if (res.ok) setDocuments(data.documents ?? []);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/clients/${clientId}/documents`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha no upload");
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro no upload");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDelete(docId: string) {
    if (!confirm("Excluir este documento permanentemente?")) return;

    const res = await fetch(`/api/clients/${clientId}/documents/${docId}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Não foi possível excluir");
      return;
    }
    await loadDocuments();
  }

  return (
    <section className="industrial-panel space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold tracking-widest text-muted uppercase">
            Documentação do cliente
          </h3>
          <p className="mt-1 text-xs text-muted">
            {appConfig.blobStorage
              ? "Vercel Blob · PDF, imagens, Word, Excel, TXT (máx. 15 MB)"
              : "Armazenamento local (dev) · em produção configure Vercel Blob"}
          </p>
        </div>
        <label className={`btn-primary cursor-pointer ${!appConfig.documentUpload ? "pointer-events-none opacity-50" : ""}`}>
          {uploading ? "Enviando..." : "Subir documento"}
          <input
            type="file"
            className="hidden"
            disabled={uploading || !appConfig.documentUpload}
            accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.doc,.docx,.xls,.xlsx"
            onChange={handleUpload}
          />
        </label>
      </div>

      {!appConfig.documentUpload && appConfig.hints.documentUpload && (
        <p className="rounded-[var(--radius-ui)] border border-amber-600/40 bg-amber-600/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
          {appConfig.hints.documentUpload}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted">Carregando documentos...</p>
      ) : documents.length === 0 ? (
        <p className="text-sm text-muted">Nenhum documento enviado.</p>
      ) : (
        <ul className="divide-y divide-border">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{doc.originalName}</p>
                <p className="text-xs text-muted">
                  {formatSize(doc.size)} · {doc.uploadedBy.name} ·{" "}
                  {new Date(doc.createdAt).toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <a href={doc.downloadUrl} className="btn-ghost text-xs">
                  Baixar
                </a>
                {isAdmin && (
                  <button
                    type="button"
                    className="btn-ghost text-xs text-red-600 dark:text-red-400"
                    onClick={() => handleDelete(doc.id)}
                  >
                    Excluir
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </section>
  );
}
