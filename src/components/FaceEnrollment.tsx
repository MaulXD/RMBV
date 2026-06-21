"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./ui/Icon";
import { FaceEnrollmentCaptureView } from "./FaceEnrollmentCaptureView";
import { ENROLLMENT_CAPTURE_COUNT } from "@/lib/face-enrollment-capture";

type Member = { id: string; name: string; role: string; isActive: boolean; hasFace: boolean };
type EnrollMode = "camera" | "upload";

const MODEL_URL = "/models";

function EnrollmentModal({
  open,
  selected,
  enrollMode,
  saving,
  statusMsg,
  uploadPreview,
  modelsLoaded,
  imgRef,
  onClose,
  onComplete,
  onFileChange,
  onCaptureFromImage,
}: {
  open: boolean;
  selected: Member;
  enrollMode: EnrollMode;
  saving: boolean;
  statusMsg: string;
  uploadPreview: string | null;
  modelsLoaded: boolean;
  imgRef: React.RefObject<HTMLImageElement | null>;
  onClose: () => void;
  onComplete: (descriptors: number[][]) => Promise<void>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCaptureFromImage: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-black/85 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="face-enroll-title"
      onClick={saving ? undefined : onClose}
    >
      <div
        className="relative z-10 flex h-[100dvh] w-full min-w-0 flex-col bg-surface-elevated shadow-2xl sm:h-auto sm:max-h-[min(92dvh,720px)] sm:max-w-md sm:rounded-2xl sm:border sm:border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="safe-area-top flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1">
            <h3 id="face-enroll-title" className="text-sm font-semibold text-foreground truncate">
              {enrollMode === "camera" ? "Cadastro facial" : "Upload de foto"} — {selected.name}
            </h3>
            {enrollMode === "camera" && (
              <p className="mt-0.5 text-xs text-muted leading-snug">
                {ENROLLMENT_CAPTURE_COUNT} poses · captura automática com validação de direção
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost shrink-0 p-1.5"
            disabled={saving}
            aria-label="Fechar cadastro"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 safe-area-bottom">
          {enrollMode === "camera" ? (
            <div className="space-y-3">
              <FaceEnrollmentCaptureView saving={saving} onComplete={onComplete} />
              {statusMsg && (
                <p
                  className={`text-center text-xs ${
                    statusMsg.includes("sucesso") ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {statusMsg}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">
                  Selecione uma foto com o rosto visível (menos preciso que câmera ao vivo)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  className="industrial-input w-full file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1 file:text-sm file:text-primary-foreground"
                  onChange={onFileChange}
                />
              </div>

              {uploadPreview && (
                <div
                  className="relative mx-auto w-full max-w-xs overflow-hidden rounded-xl bg-black"
                  style={{ aspectRatio: "4/3" }}
                >
                  <img
                    ref={imgRef}
                    src={uploadPreview}
                    alt="Preview"
                    className="h-full w-full object-contain"
                    crossOrigin="anonymous"
                  />
                </div>
              )}

              {statusMsg && (
                <p
                  className={`text-center text-xs ${
                    statusMsg.includes("sucesso")
                      ? "text-emerald-500"
                      : statusMsg.includes("Erro") || statusMsg.includes("Nenhum")
                        ? "text-red-500"
                        : "text-muted"
                  }`}
                >
                  {statusMsg}
                </p>
              )}

              <button
                type="button"
                className="btn-primary w-full"
                disabled={saving || !uploadPreview || !modelsLoaded}
                onClick={onCaptureFromImage}
              >
                <Icon name="scanFace" className="h-4 w-4" />
                {saving ? "Salvando..." : "Cadastrar rosto da foto"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function FaceEnrollment({ teamId, canUpload = true }: { teamId: string; canUpload?: boolean }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState<Member | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [enrollMode, setEnrollMode] = useState<EnrollMode>("camera");
  const [statusMsg, setStatusMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const loadMembers = useCallback(async () => {
    const res = await fetch(`/api/teams/${teamId}/members`);
    const data = await res.json();
    const memberList: Omit<Member, "hasFace">[] = (data.members ?? []).filter((m: { isActive: boolean }) => m.isActive);
    const withFace = await Promise.all(
      memberList.map(async (m) => {
        const r = await fetch(`/api/users/${m.id}/face`);
        const d = await r.json();
        return { ...m, hasFace: d.hasDescriptor ?? false };
      })
    );
    setMembers(withFace);
  }, [teamId]);

  useEffect(() => { void loadMembers(); }, [loadMembers]);

  useEffect(() => {
    async function load() {
      const faceapi = await import("@vladmandic/face-api");
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      setModelsLoaded(true);
    }
    void load();
  }, []);

  function openModal(member: Member, mode: EnrollMode = "camera") {
    setSelected(member);
    setStatusMsg("");
    setEnrollMode(mode);
    setUploadPreview(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setSelected(null);
    setStatusMsg("");
    setUploadPreview(null);
    setSaving(false);
  }

  async function saveDescriptors(descriptors: number[][]) {
    if (!selected) return;
    setSaving(true);
    const res = await fetch(`/api/users/${selected.id}/face`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ descriptors, enrolledByManager: true }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatusMsg(data.error ?? "Falha ao salvar");
      setSaving(false);
      throw new Error(data.error ?? "Falha ao salvar");
    }
    setStatusMsg("Rosto cadastrado com sucesso!");
    await loadMembers();
    setTimeout(closeModal, 1500);
  }

  async function captureFromImage() {
    if (!imgRef.current || !modelsLoaded || !selected) return;
    setSaving(true);
    setStatusMsg("Detectando rosto na imagem...");
    try {
      const faceapi = await import("@vladmandic/face-api");
      const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 });
      const detection = await faceapi
        .detectSingleFace(imgRef.current, options)
        .withFaceLandmarks(true)
        .withFaceDescriptor();

      if (!detection) {
        setStatusMsg("Nenhum rosto detectado na imagem. Use uma foto com o rosto bem visível.");
        setSaving(false);
        return;
      }
      await saveDescriptors([Array.from(detection.descriptor)]);
    } catch {
      setStatusMsg("Erro ao processar imagem. Tente novamente.");
      setSaving(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setUploadPreview(url);
    setStatusMsg("");
  }

  async function removeFace(id: string) {
    await fetch(`/api/users/${id}/face`, { method: "DELETE" });
    await loadMembers();
  }

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Cadastro facial — equipe</h2>
        <span className="text-xs text-muted">
          {members.filter((m) => m.hasFace).length}/{members.length} cadastrados
        </span>
      </div>

      {!modelsLoaded && (
        <p className="text-xs text-muted">Carregando modelos de reconhecimento...</p>
      )}

      <ul className="space-y-2">
        {members.map((m) => (
          <li
            key={m.id}
            className="panel-solid flex flex-col gap-3 rounded-[var(--radius-ui)] p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-center gap-2">
              <div className={`h-2 w-2 shrink-0 rounded-full ${m.hasFace ? "bg-emerald-500" : "bg-muted/40"}`} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{m.name}</p>
                <p className="text-xs text-muted">{m.hasFace ? "Cadastrado" : "Sem rosto"}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:shrink-0">
              <button
                type="button"
                className="btn-ghost flex-1 text-xs sm:flex-none"
                disabled={!modelsLoaded}
                onClick={() => openModal(m, "camera")}
              >
                <Icon name="camera" className="h-3.5 w-3.5" />
                {m.hasFace ? "Recadastrar" : "Cadastrar"}
              </button>
              {canUpload && (
                <button
                  type="button"
                  className="btn-ghost flex-1 text-xs sm:flex-none"
                  disabled={!modelsLoaded}
                  onClick={() => openModal(m, "upload")}
                >
                  <Icon name="upload" className="h-3.5 w-3.5" />
                  Foto
                </button>
              )}
              {m.hasFace && (
                <button
                  type="button"
                  className="btn-ghost flex-1 text-xs text-red-500 sm:flex-none"
                  onClick={() => void removeFace(m.id)}
                >
                  Remover
                </button>
              )}
            </div>
          </li>
        ))}
        {members.length === 0 && (
          <p className="text-sm text-muted">Nenhum membro nesta equipe.</p>
        )}
      </ul>

      {selected && (
        <EnrollmentModal
          open={modalOpen}
          selected={selected}
          enrollMode={enrollMode}
          saving={saving}
          statusMsg={statusMsg}
          uploadPreview={uploadPreview}
          modelsLoaded={modelsLoaded}
          imgRef={imgRef}
          onClose={closeModal}
          onComplete={saveDescriptors}
          onFileChange={handleFileChange}
          onCaptureFromImage={() => void captureFromImage()}
        />
      )}
    </div>
  );
}
