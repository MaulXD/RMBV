"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./ui/Icon";

type Member = { id: string; name: string; role: string; isActive: boolean; hasFace: boolean };
type EnrollMode = "camera" | "upload";

const MODEL_URL = "/models";

export function FaceEnrollment({ teamId, canUpload = true }: { teamId: string; canUpload?: boolean }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState<Member | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [enrollMode, setEnrollMode] = useState<EnrollMode>("camera");
  const [capturing, setCapturing] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
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

  async function openModal(member: Member, mode: EnrollMode = "camera") {
    setSelected(member);
    setStatusMsg("");
    setEnrollMode(mode);
    setUploadPreview(null);
    setCameraOpen(true);
    if (mode === "camera") {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
    }
  }

  function closeModal() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
    setSelected(null);
    setStatusMsg("");
    setUploadPreview(null);
  }

  async function saveDescriptor(descriptor: number[]) {
    if (!selected) return;
    setSaving(true);
    const res = await fetch(`/api/users/${selected.id}/face`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ descriptor }),
    });
    if (!res.ok) throw new Error("Falha ao salvar");
    setStatusMsg("Rosto cadastrado com sucesso!");
    await loadMembers();
    setTimeout(closeModal, 1500);
  }

  async function capture() {
    if (!videoRef.current || !modelsLoaded || !selected) return;
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
      await saveDescriptor(Array.from(detection.descriptor));
    } catch {
      setStatusMsg("Erro ao processar. Tente novamente.");
    } finally {
      setCapturing(false);
      setSaving(false);
    }
  }

  async function captureFromImage() {
    if (!imgRef.current || !modelsLoaded || !selected) return;
    setCapturing(true);
    setStatusMsg("Detectando rosto na imagem...");
    try {
      const faceapi = await import("@vladmandic/face-api");
      const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 });
      const detection = await faceapi
        .detectSingleFace(imgRef.current, options)
        .withFaceLandmarks(true)
        .withFaceDescriptor();

      if (!detection) { setStatusMsg("Nenhum rosto detectado na imagem. Use uma foto com o rosto bem visível."); setCapturing(false); return; }
      await saveDescriptor(Array.from(detection.descriptor));
    } catch {
      setStatusMsg("Erro ao processar imagem. Tente novamente.");
    } finally {
      setCapturing(false);
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
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Cadastro facial — equipe</h2>
        <span className="text-xs text-muted">{members.filter((m) => m.hasFace).length}/{members.length} cadastrados</span>
      </div>

      {!modelsLoaded && (
        <p className="text-xs text-muted">Carregando modelos de reconhecimento...</p>
      )}

      <ul className="space-y-2">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between rounded-[var(--radius-ui)] border border-border px-3 py-2">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${m.hasFace ? "bg-emerald-500" : "bg-muted/40"}`} />
              <span className="text-sm">{m.name}</span>
              <span className="text-xs text-muted">{m.hasFace ? "Cadastrado" : "Sem rosto"}</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-ghost text-xs"
                disabled={!modelsLoaded}
                onClick={() => void openModal(m, "camera")}
              >
                <Icon name="camera" className="h-3.5 w-3.5" />
                {m.hasFace ? "Câmera" : "Cadastrar"}
              </button>
              {canUpload && (
                <button
                  type="button"
                  className="btn-ghost text-xs"
                  disabled={!modelsLoaded}
                  onClick={() => void openModal(m, "upload")}
                >
                  <Icon name="upload" className="h-3.5 w-3.5" />
                  Foto
                </button>
              )}
              {m.hasFace && (
                <button
                  type="button"
                  className="btn-ghost text-xs text-red-500"
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

      {/* Enrollment modal */}
      {cameraOpen && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="industrial-panel w-full max-w-sm space-y-4 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                {enrollMode === "camera" ? "Câmera ao vivo" : "Upload de foto"} — {selected.name}
              </h3>
              <button type="button" onClick={closeModal} className="btn-ghost p-1">
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>

            {enrollMode === "camera" ? (
              <>
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
                <p className="text-center text-xs text-muted">Centralize o rosto na câmera e clique em Capturar</p>
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
              </>
            ) : (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">
                    Selecione uma foto com o rosto visível
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    className="industrial-input file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1 file:text-sm file:text-primary-foreground"
                    onChange={handleFileChange}
                  />
                </div>

                {uploadPreview && (
                  <div className="relative overflow-hidden rounded-xl bg-black" style={{ aspectRatio: "4/3" }}>
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
                  <p className={`text-center text-xs ${statusMsg.includes("sucesso") ? "text-emerald-500" : statusMsg.includes("Erro") || statusMsg.includes("Nenhum") ? "text-red-500" : "text-muted"}`}>
                    {statusMsg}
                  </p>
                )}

                <button
                  type="button"
                  className="btn-primary w-full"
                  disabled={capturing || saving || !uploadPreview}
                  onClick={() => void captureFromImage()}
                >
                  <Icon name="scanFace" className="h-4 w-4" />
                  {capturing ? "Processando..." : saving ? "Salvando..." : "Cadastrar rosto da foto"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
