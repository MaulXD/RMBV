"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChamadoStatusPipeline } from "@/components/ChamadoStatusPipeline";
import { CategoryBadge } from "@/components/CategoryBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { ChamadoStatusBadge } from "@/components/ChamadoStatusBadge";
import type { ChamadoListItem } from "@/lib/chamado-fields";
import type { ChamadoHistoryEntry } from "@/lib/chamado-history";
import {
  CHAMADO_STATUS_LABELS,
} from "@/lib/enum-labels";
import type { ChamadoStatus, TaskPriority } from "@prisma/client";
import { Icon } from "@/components/ui/Icon";

type Member = { id: string; name: string };
type Comment = { id: string; body: string; createdAt: string; author: { id: string; name: string } };
type Attachment = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  downloadUrl: string;
  uploadedBy: { id: string; name: string };
};

export default function ChamadoDetailPage() {
  return <ChamadoDetail />;
}

function ChamadoDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [chamado, setChamado] = useState<ChamadoListItem | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [history, setHistory] = useState<ChamadoHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [uploading, setUploading] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [detailRes, commentsRes, attachRes, historyRes] = await Promise.all([
        fetch(`/api/chamados/${id}`),
        fetch(`/api/chamados/${id}/comments`),
        fetch(`/api/chamados/${id}/attachments`),
        fetch(`/api/chamados/${id}/history`),
      ]);
      const detail = await detailRes.json();
      if (!detailRes.ok) {
        setChamado(null);
        return;
      }
      setChamado(detail.chamado);
      const commentsData = await commentsRes.json();
      if (commentsRes.ok) setComments(commentsData.comments ?? []);
      const attachData = await attachRes.json();
      if (attachRes.ok) setAttachments(attachData.attachments ?? []);
      const historyData = await historyRes.json();
      if (historyRes.ok) setHistory(historyData.history ?? []);

      if (detail.chamado?.teamId) {
        const mRes = await fetch(`/api/tasks/assignees?teamId=${detail.chamado.teamId}`);
        const mData = await mRes.json();
        if (mRes.ok) setMembers(mData.members ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function patchChamado(data: Record<string, unknown>) {
    setSaving(true);
    try {
      const res = await fetch(`/api/chamados/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Falha ao salvar");
      setChamado(json.chamado);
      const historyRes = await fetch(`/api/chamados/${id}/history`);
      const historyData = await historyRes.json();
      if (historyRes.ok) setHistory(historyData.history ?? []);
    } finally {
      setSaving(false);
    }
  }

  async function postComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentBody.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/chamados/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: commentBody }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha");
      setComments((prev) => [...prev, data.comment]);
      setCommentBody("");
      const historyRes = await fetch(`/api/chamados/${id}/history`);
      const historyData = await historyRes.json();
      if (historyRes.ok) setHistory(historyData.history ?? []);
    } finally {
      setSaving(false);
    }
  }

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/chamados/${id}/attachments`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha no upload");
      setAttachments((prev) => [data.attachment, ...prev]);
    } finally {
      setUploading(false);
    }
  }

  async function createKanbanTask() {
    setSaving(true);
    try {
      const res = await fetch(`/api/chamados/${id}/create-task`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha");
      await loadAll();
      if (data.task?.id) router.push(`/kanban`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="panel-solid p-8 text-center text-sm text-muted">Carregando...</div>;
  }

  if (!chamado) {
    return (
      <div className="panel-solid p-8 text-center">
        <p className="text-muted">Chamado não encontrado.</p>
        <Link href="/chamados" className="mt-4 inline-block text-primary hover:underline">
          Voltar
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="soft-card p-4">
        <Link href="/chamados" className="inline-flex items-center gap-1 text-xs text-muted hover:text-primary">
          <Icon name="chevronRight" className="h-3 w-3 rotate-180" />
          Chamados
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-bold text-primary">#{chamado.number}</span>
              <CategoryBadge category={chamado.category} />
              <ChamadoStatusBadge status={chamado.status} />
              <PriorityBadge priority={chamado.priority} />
            </div>
            <h1 className="font-display text-xl font-semibold leading-snug">{chamado.title}</h1>
            <p className="mt-1 text-xs text-muted">Solicitante: {chamado.requester.name}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!chamado.linkedTask && (
              <button
                type="button"
                className="btn-ghost"
                disabled={saving}
                onClick={() => void createKanbanTask()}
              >
                <Icon name="kanban" className="h-4 w-4" />
                Criar tarefa
              </button>
            )}
            {chamado.linkedTask && (
              <Link href="/kanban" className="btn-ghost text-xs">
                <Icon name="kanban" className="h-4 w-4" />
                {chamado.linkedTask.title}
              </Link>
            )}
          </div>
        </div>
      </div>

      <section className="soft-card p-4">
        <h2 className="mb-3 text-[10px] font-bold tracking-widest text-muted uppercase">Pipeline</h2>
        <ChamadoStatusPipeline
          status={chamado.status}
          disabled={saving}
          onChange={(status) => void patchChamado({ status })}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="soft-card p-4">
            <h2 className="mb-3 text-sm font-semibold">Descrição</h2>
            <p className="whitespace-pre-wrap text-sm text-muted">
              {chamado.description || "Sem descrição."}
            </p>
          </section>

          <section className="soft-card p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Icon name="messageSquare" className="h-4 w-4 text-primary" />
              Comentários ({comments.length})
            </h2>
            <ul className="mb-4 space-y-3">
              {comments.map((c) => (
                <li key={c.id} className="soft-card p-3">
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted">
                    <span className="font-medium text-foreground">{c.author.name}</span>
                    <time>{new Date(c.createdAt).toLocaleString("pt-BR")}</time>
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{c.body}</p>
                </li>
              ))}
            </ul>
            <form onSubmit={(e) => void postComment(e)} className="space-y-2">
              <textarea
                className="industrial-input min-h-[80px] w-full"
                placeholder="Escreva um comentário..."
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
              />
              <button type="submit" className="btn-primary" disabled={saving || !commentBody.trim()}>
                Comentar
              </button>
            </form>
          </section>

          <section className="soft-card p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Icon name="upload" className="h-4 w-4 text-primary" />
              Anexos ({attachments.length})
            </h2>
            <ul className="mb-3 space-y-2">
              {attachments.map((a) => (
                <li key={a.id}>
                  <a
                    href={a.downloadUrl}
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Icon name="fileText" className="h-4 w-4" />
                    {a.originalName}
                    <span className="text-xs text-muted">
                      ({Math.round(a.size / 1024)} KB)
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            <label className="btn-ghost inline-flex cursor-pointer gap-2">
              <Icon name="upload" className="h-4 w-4" />
              {uploading ? "Enviando..." : "Anexar arquivo"}
              <input
                type="file"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadFile(file);
                  e.target.value = "";
                }}
              />
            </label>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="soft-card p-4">
            <h2 className="mb-3 text-sm font-semibold">Detalhes</h2>
            <div className="space-y-3 text-sm">
              <div>
                <label className="mb-1 block text-xs text-muted">Responsável</label>
                <select
                  className="industrial-input w-full"
                  value={chamado.assigneeId ?? ""}
                  disabled={saving}
                  onChange={(e) =>
                    void patchChamado({ assigneeId: e.target.value || null })
                  }
                >
                  <option value="">Ninguém</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">Prioridade</label>
                <select
                  className="industrial-input w-full"
                  value={chamado.priority}
                  disabled={saving}
                  onChange={(e) =>
                    void patchChamado({ priority: e.target.value as TaskPriority })
                  }
                >
                  <option value="BAIXA">Baixa</option>
                  <option value="MEDIA">Média</option>
                  <option value="ALTA">Alta</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">Status</label>
                <select
                  className="industrial-input w-full"
                  value={chamado.status}
                  disabled={saving}
                  onChange={(e) =>
                    void patchChamado({ status: e.target.value as ChamadoStatus })
                  }
                >
                  {(Object.keys(CHAMADO_STATUS_LABELS) as ChamadoStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {CHAMADO_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              {chamado.client && (
                <div>
                  <span className="text-xs text-muted">Cliente</span>
                  <p>
                    <Link href={`/clients/${chamado.client.id}`} className="text-primary hover:underline">
                      {chamado.client.name}
                    </Link>
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="soft-card p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Icon name="clock" className="h-4 w-4 text-primary" />
              Histórico
            </h2>
            <ul className="max-h-80 space-y-2 overflow-y-auto text-xs">
              {history.map((h) => (
                <li key={h.id} className="border-b border-border/40 pb-2">
                  <p className="font-medium text-foreground">{h.createdBy.name}</p>
                  <p className="text-muted">
                    {h.note ?? (h.fromLabel && h.toLabel ? `${h.fromLabel} → ${h.toLabel}` : "—")}
                  </p>
                  <time className="text-[10px] text-muted/80">
                    {new Date(h.createdAt).toLocaleString("pt-BR")}
                  </time>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
