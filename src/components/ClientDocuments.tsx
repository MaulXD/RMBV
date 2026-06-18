"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAppConfig } from "./useAppConfig";

type DocumentRow = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  tags: string[];
  createdAt: string;
  downloadUrl: string;
  uploadedBy: { id: string; name: string; email: string };
};

const DOC_TAGS = [
  "RG / CNH",
  "CPF",
  "Contrato",
  "Comprovante de residência",
  "Ficha de Filiação (ANCREF)",
  "Procuração",
  "Certidão de nascimento",
  "Certidão de casamento",
  "Extrato bancário",
  "Declaração de IR",
  "Outros",
];

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileTypeLabel(mimeType: string) {
  if (mimeType === "application/pdf") return { label: "PDF", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: "📄" };
  if (mimeType.startsWith("image/")) return { label: "Imagem", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: "🖼️" };
  if (mimeType.includes("word")) return { label: "Word", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: "📝" };
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return { label: "Excel", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: "📊" };
  return { label: "TXT", color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400", icon: "📃" };
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
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // pending upload state
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  function selectFile(file: File) {
    setPendingFile(file);
    setSelectedTags([]);
    setCustomTag("");
    setError(null);
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function cancelPending() {
    setPendingFile(null);
    setSelectedTags([]);
    setCustomTag("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function confirmUpload() {
    if (!pendingFile) return;

    const tags = customTag.trim()
      ? [...selectedTags, customTag.trim()]
      : selectedTags;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", pendingFile);
    formData.append("tags", JSON.stringify(tags));

    try {
      const res = await fetch(`/api/clients/${clientId}/documents`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha no upload");
      setPendingFile(null);
      setSelectedTags([]);
      setCustomTag("");
      if (inputRef.current) inputRef.current.value = "";
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro no upload");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(docId: string) {
    if (!confirm("Excluir este documento permanentemente?")) return;
    const res = await fetch(`/api/clients/${clientId}/documents/${docId}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Não foi possível excluir"); return; }
    await loadDocuments();
  }

  const canUpload = appConfig.documentUpload;

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (!canUpload || uploading || pendingFile) return;
    const file = e.dataTransfer.files?.[0];
    if (file) selectFile(file);
  }

  return (
    <section className="industrial-panel space-y-4 p-4">
      <h3 className="text-xs font-semibold tracking-widest text-muted uppercase">
        Documentação do cliente
      </h3>

      {!appConfig.documentUpload && appConfig.hints.documentUpload && (
        <p className="rounded-[var(--radius-ui)] border border-amber-600/40 bg-amber-600/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
          {appConfig.hints.documentUpload}
        </p>
      )}

      {/* Drop zone — hidden when file pending */}
      {!pendingFile && (
        <div
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 transition-colors ${
            dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-surface/50"
          } ${!canUpload ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
          onClick={() => canUpload && !uploading && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl">☁️</div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Arraste um arquivo aqui</p>
            <p className="text-xs text-muted">ou clique para selecionar · PDF, imagens, Word, Excel, TXT (máx. 15 MB)</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            disabled={uploading || !canUpload}
            accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.doc,.docx,.xls,.xlsx"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) selectFile(file);
            }}
          />
        </div>
      )}

      {/* Tag form — shown after file selected */}
      {pendingFile && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">{pendingFile.name}</p>
              <p className="text-xs text-muted">{formatSize(pendingFile.size)} · Marque os documentos contidos neste arquivo</p>
            </div>
            <button type="button" onClick={cancelPending} className="text-muted hover:text-foreground text-lg leading-none">✕</button>
          </div>

          <div className="flex flex-wrap gap-2">
            {DOC_TAGS.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  {active ? "✓ " : ""}{tag}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Outro tipo de documento (opcional)..."
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              className="industrial-input flex-1 text-xs"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => void confirmUpload()}
              disabled={uploading}
              className="btn-primary text-sm"
            >
              {uploading ? "Enviando..." : "Confirmar upload"}
            </button>
            <button type="button" onClick={cancelPending} className="btn-ghost text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Document grid */}
      {loading ? (
        <p className="text-sm text-muted">Carregando documentos...</p>
      ) : documents.length === 0 ? (
        <p className="text-center text-xs text-muted py-2">Nenhum documento enviado.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {documents.map((doc) => {
            const { label, color, icon } = fileTypeLabel(doc.mimeType);
            return (
              <div key={doc.id} className="soft-card flex flex-col gap-2 p-3">
                <div className="flex items-start justify-between gap-1">
                  <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${color}`}>
                    {icon} {label}
                  </span>
                </div>

                <p className="flex-1 break-all text-xs font-medium leading-snug text-foreground line-clamp-2" title={doc.originalName}>
                  {doc.originalName}
                </p>

                {doc.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {doc.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-[10px] text-muted leading-tight">
                  {formatSize(doc.size)}<br />
                  {doc.uploadedBy.name}<br />
                  {new Date(doc.createdAt).toLocaleDateString("pt-BR")}
                </p>

                <div className="flex gap-1.5">
                  <a href={doc.downloadUrl} className="flex-1 rounded-md border border-border py-1 text-center text-[11px] font-medium text-muted hover:border-primary hover:text-primary transition-colors">
                    Baixar
                  </a>
                  {isAdmin && (
                    <button
                      type="button"
                      className="rounded-md border border-border px-2 py-1 text-[11px] text-red-500 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      onClick={() => handleDelete(doc.id)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="alert alert-error">{error}</p>}
    </section>
  );
}
