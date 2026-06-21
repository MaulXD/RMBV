"use client";

import { useRef, useState } from "react";
import { useSession } from "@/components/SessionProvider";
import { Icon } from "@/components/ui/Icon";
import { SelfFaceEnrollmentPanel } from "@/components/SelfFaceEnrollmentPanel";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  ADV: "Advogado",
  GERENTE: "Gerente",
  COLABORADOR: "Colaborador",
  PESQUISADOR: "Pesquisador",
};

export default function PerfilPage() {
  const { user, refresh } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  if (!user) return null;

  async function handleFile(file: File) {
    setError(null);
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/users/me/avatar", { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        throw new Error(d.error ?? "Falha no upload");
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar foto");
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    setError(null);
    setRemoving(true);
    try {
      await fetch("/api/users/me/avatar", { method: "DELETE" });
      setPreview(null);
      await refresh();
    } catch {
      setError("Erro ao remover foto");
    } finally {
      setRemoving(false);
    }
  }

  const currentAvatar = preview ?? user.avatarUrl;

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Meu Perfil</h1>

      <div className="rounded-2xl border border-border bg-surface-elevated p-6 shadow-sm">
        {/* Avatar section */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            {currentAvatar ? (
              <img
                src={currentAvatar}
                alt={user.name}
                className="h-24 w-24 rounded-full object-cover border-2 border-border shadow"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/15 text-3xl font-bold text-primary border-2 border-border shadow">
                {initials(user.name)}
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                <Icon name="rotateCw" className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
          </div>

          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">{user.name}</p>
            <p className="text-sm text-muted">{ROLE_LABELS[user.role] ?? user.role}</p>
            {user.teamName && <p className="text-xs text-muted mt-0.5">{user.teamName}</p>}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="btn-primary flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-60"
            >
              <Icon name="upload" className="h-4 w-4" />
              {currentAvatar ? "Trocar foto" : "Adicionar foto"}
            </button>
            {currentAvatar && (
              <button
                type="button"
                onClick={() => void handleRemove()}
                disabled={removing}
                className="btn-ghost flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:text-red-600 disabled:opacity-60"
              >
                <Icon name="trash" className="h-4 w-4" />
                Remover
              </button>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = "";
            }}
          />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <p className="text-[11px] text-muted text-center">
            JPEG, PNG ou WebP · máx. 5 MB · convertido automaticamente para WebP
          </p>
        </div>

        <div className="mt-6 border-t border-border pt-5 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted">E-mail</span>
            <span className="text-foreground font-medium">{user.email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted">Função</span>
            <span className="text-foreground font-medium">{ROLE_LABELS[user.role] ?? user.role}</span>
          </div>
          {user.teamName && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">Equipe</span>
              <span className="text-foreground font-medium">{user.teamName}</span>
            </div>
          )}
        </div>

        <SelfFaceEnrollmentPanel userId={user.id} />
      </div>
    </div>
  );
}
