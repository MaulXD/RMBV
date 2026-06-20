"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "@/components/SessionProvider";
import { Icon } from "@/components/ui/Icon";

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

function SelfFaceEnrollment({ userId }: { userId: string }) {
  const [hasFace, setHasFace] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const checkStatus = useCallback(async () => {
    const r = await fetch(`/api/users/${userId}/face`);
    const d = await r.json() as { hasDescriptor?: boolean };
    setHasFace(d.hasDescriptor ?? false);
  }, [userId]);

  useEffect(() => { void checkStatus(); }, [checkStatus]);

  useEffect(() => {
    async function load() {
      const faceapi = await import("@vladmandic/face-api");
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri("/models"),
        faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
      ]);
      setModelsLoaded(true);
    }
    void load();
  }, []);

  async function openCamera() {
    setStatusMsg("");
    setCameraOpen(true);
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
    streamRef.current = stream;
    if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
  }

  function closeCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
    setStatusMsg("");
  }

  async function capture() {
    if (!videoRef.current || !modelsLoaded) return;
    setCapturing(true);
    setStatusMsg("Detectando rosto...");
    try {
      const faceapi = await import("@vladmandic/face-api");
      const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
      const detection = await faceapi
        .detectSingleFace(videoRef.current, options)
        .withFaceLandmarks(true)
        .withFaceDescriptor();
      if (!detection) { setStatusMsg("Nenhum rosto detectado. Tente novamente."); setCapturing(false); return; }

      setSaving(true);
      const res = await fetch(`/api/users/${userId}/face`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descriptor: Array.from(detection.descriptor) }),
      });
      if (!res.ok) throw new Error("Falha ao salvar");
      setStatusMsg("Rosto cadastrado com sucesso!");
      setHasFace(true);
      setTimeout(closeCamera, 1500);
    } catch {
      setStatusMsg("Erro ao processar. Tente novamente.");
    } finally {
      setCapturing(false);
      setSaving(false);
    }
  }

  async function removeFace() {
    setRemoving(true);
    await fetch(`/api/users/${userId}/face`, { method: "DELETE" });
    setHasFace(false);
    setRemoving(false);
  }

  return (
    <div className="mt-6 border-t border-border pt-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon name="scanFace" className="h-4 w-4 text-emerald-500" />
          <span className="text-sm font-semibold text-foreground">Reconhecimento facial</span>
        </div>
        <span className={`flex items-center gap-1.5 text-xs font-medium ${hasFace ? "text-emerald-600" : "text-muted"}`}>
          <span className={`h-2 w-2 rounded-full ${hasFace ? "bg-emerald-500" : "bg-muted/40"}`} />
          {hasFace ? "Cadastrado" : "Não cadastrado"}
        </span>
      </div>
      <p className="text-xs text-muted mb-3">
        {hasFace
          ? "Seu rosto está cadastrado. Você pode usar o quiosque de ponto eletrônico."
          : "Cadastre seu rosto para usar o ponto eletrônico facial."}
      </p>
      {!modelsLoaded && (
        <p className="text-xs text-muted mb-2">Carregando modelos de reconhecimento...</p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!modelsLoaded}
          onClick={() => void openCamera()}
          className="btn-ghost flex items-center gap-2 text-sm disabled:opacity-50"
        >
          <Icon name="camera" className="h-4 w-4" />
          {hasFace ? "Recadastrar" : "Cadastrar via câmera"}
        </button>
        {hasFace && (
          <button
            type="button"
            disabled={removing}
            onClick={() => void removeFace()}
            className="btn-ghost flex items-center gap-2 text-sm text-red-500 hover:text-red-600 disabled:opacity-50"
          >
            <Icon name="trash" className="h-4 w-4" />
            Remover
          </button>
        )}
      </div>

      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="industrial-panel w-full max-w-sm space-y-4 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Cadastro facial</h3>
              <button type="button" onClick={closeCamera} className="btn-ghost p-1">
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>
            <div className="relative overflow-hidden rounded-xl bg-black" style={{ aspectRatio: "4/3" }}>
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                playsInline muted autoPlay
                style={{ transform: "scaleX(-1)" }}
              />
              <div className="absolute top-2 left-2 h-6 w-6 border-t-2 border-l-2 border-white/60 rounded-tl-md" />
              <div className="absolute top-2 right-2 h-6 w-6 border-t-2 border-r-2 border-white/60 rounded-tr-md" />
              <div className="absolute bottom-2 left-2 h-6 w-6 border-b-2 border-l-2 border-white/60 rounded-bl-md" />
              <div className="absolute bottom-2 right-2 h-6 w-6 border-b-2 border-r-2 border-white/60 rounded-br-md" />
            </div>
            <p className="text-center text-xs text-muted">Centralize o rosto e clique em Capturar</p>
            {statusMsg && (
              <p className={`text-center text-xs ${statusMsg.includes("sucesso") ? "text-emerald-500" : statusMsg.includes("Erro") || statusMsg.includes("Nenhum") ? "text-red-500" : "text-muted"}`}>
                {statusMsg}
              </p>
            )}
            <button
              type="button"
              className="btn-primary w-full"
              disabled={capturing || saving}
              onClick={() => void capture()}
            >
              <Icon name="camera" className="h-4 w-4" />
              {capturing ? "Processando..." : saving ? "Salvando..." : "Capturar rosto"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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

        <SelfFaceEnrollment userId={user.id} />
      </div>
    </div>
  );
}
