"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./ui/Icon";
import { LGPD_FACE_CONSENT_TEXT } from "@/lib/lgpd-face-consent";

const MODEL_URL = "/models";
const CAPTURES_NEEDED = 3;

type Phase = "instructions" | "consent" | "camera" | "upload" | "done";

export function MultiCaptureFaceWizard({
  userId,
  requireConsent,
  allowUpload = false,
  onComplete,
}: {
  userId: string;
  requireConsent: boolean;
  allowUpload?: boolean;
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState<Phase>(requireConsent ? "instructions" : "instructions");
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [captures, setCaptures] = useState<number[][]>([]);
  const [captureIndex, setCaptureIndex] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [consent, setConsent] = useState(false);
  const [mode, setMode] = useState<"camera" | "upload">("camera");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const faceapi = await import("@vladmandic/face-api");
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      setModelsLoaded(true);
    })();
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  async function startCamera() {
    stopCamera();
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
    setPhase("camera");
    setStatusMsg(`Captura ${captureIndex + 1} de ${CAPTURES_NEEDED}: centralize o rosto na oval`);
  }

  async function captureFromVideo() {
    if (!videoRef.current || !modelsLoaded) return;
    setSaving(true);
    setStatusMsg("Detectando rosto...");
    try {
      const faceapi = await import("@vladmandic/face-api");
      const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
      const det = await faceapi
        .detectSingleFace(videoRef.current, opts)
        .withFaceLandmarks(true)
        .withFaceDescriptor();
      if (!det) {
        setStatusMsg("Nenhum rosto detectado. Melhore a luz e tente de novo.");
        setSaving(false);
        return;
      }
      const next = [...captures, Array.from(det.descriptor)];
      setCaptures(next);
      const idx = next.length;
      if (idx >= CAPTURES_NEEDED) {
        await saveDescriptors(next);
      } else {
        setCaptureIndex(idx);
        setStatusMsg(`Ótimo! Captura ${idx}/${CAPTURES_NEEDED} ok. Ajuste levemente e capture de novo.`);
      }
    } catch {
      setStatusMsg("Erro ao processar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function captureFromUpload() {
    if (!imgRef.current || !modelsLoaded) return;
    setSaving(true);
    setStatusMsg("Processando foto...");
    try {
      const faceapi = await import("@vladmandic/face-api");
      const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 });
      const det = await faceapi
        .detectSingleFace(imgRef.current, opts)
        .withFaceLandmarks(true)
        .withFaceDescriptor();
      if (!det) {
        setStatusMsg("Rosto não detectado na foto. Use imagem nítida, rosto frontal e bem iluminado.");
        setSaving(false);
        return;
      }
      await saveDescriptors([Array.from(det.descriptor)]);
    } catch {
      setStatusMsg("Erro ao processar imagem.");
    } finally {
      setSaving(false);
    }
  }

  async function saveDescriptors(descriptors: number[][]) {
    setSaving(true);
    const res = await fetch(`/api/users/${userId}/face`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        descriptors,
        acceptConsent: requireConsent ? consent : undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatusMsg(data.error ?? "Falha ao salvar");
      setSaving(false);
      return;
    }
    stopCamera();
    setPhase("done");
    setStatusMsg("Cadastro facial concluído!");
    setTimeout(onComplete, 1200);
  }

  useEffect(() => () => stopCamera(), [stopCamera]);

  if (phase === "instructions") {
    return (
      <div className="space-y-4 max-w-lg">
        <div className="panel-solid p-4 space-y-3 text-sm">
          <h3 className="font-semibold flex items-center gap-2">
            <Icon name="scanFace" className="h-4 w-4 text-primary" />
            Instruções para o cadastro facial
          </h3>
          <ol className="list-decimal space-y-2 pl-5 text-muted">
            <li>Escolha um local <strong className="text-foreground">bem iluminado</strong> (evite luz atrás de você).</li>
            <li>Remova boné, óculos escuros e máscara.</li>
            <li>Centralize o rosto na câmera — olhos na altura da linha do meio.</li>
            <li>Serão <strong className="text-foreground">{CAPTURES_NEEDED} capturas</strong>; mova levemente a cabeça entre elas.</li>
            <li>Depois do cadastro, teste em <strong className="text-foreground">Ponto facial</strong> para validar.</li>
          </ol>
        </div>
        <button
          type="button"
          className="btn-primary w-full"
          disabled={!modelsLoaded}
          onClick={() => {
            if (requireConsent) setPhase("consent");
            else void startCamera();
          }}
        >
          {modelsLoaded ? "Continuar" : "Carregando modelos..."}
        </button>
      </div>
    );
  }

  if (phase === "consent") {
    return (
      <div className="space-y-4 max-w-lg">
        <div className="panel-solid max-h-48 overflow-y-auto p-4 text-xs text-muted whitespace-pre-wrap">
          {LGPD_FACE_CONSENT_TEXT}
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
          <span>Li e aceito o tratamento dos dados biométricos para controle de ponto.</span>
        </label>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost flex-1" onClick={() => setPhase("instructions")}>
            Voltar
          </button>
          <button
            type="button"
            className="btn-primary flex-1"
            disabled={!consent}
            onClick={() => void startCamera()}
          >
            Aceitar e cadastrar
          </button>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{statusMsg}</p>
    );
  }

  return (
    <div className="space-y-4 max-w-lg">
      {allowUpload && (
        <div className="flex gap-2">
          <button
            type="button"
            className={`btn-ghost flex-1 text-xs ${mode === "camera" ? "border-primary text-primary" : ""}`}
            onClick={() => { setMode("camera"); void startCamera(); }}
          >
            Câmera ({CAPTURES_NEEDED} capturas)
          </button>
          <button
            type="button"
            className={`btn-ghost flex-1 text-xs ${mode === "upload" ? "border-primary text-primary" : ""}`}
            onClick={() => { stopCamera(); setMode("upload"); setPhase("upload"); }}
          >
            Upload (1 foto)
          </button>
        </div>
      )}

      {(phase === "camera" || mode === "camera") && (
        <>
          <div className="relative overflow-hidden rounded-xl bg-black" style={{ aspectRatio: "4/3" }}>
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              playsInline
              muted
              autoPlay
              style={{ transform: "scaleX(-1)" }}
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-48 w-36 rounded-[50%] border-2 border-dashed border-white/50" />
            </div>
          </div>
          <p className="text-center text-xs text-muted">{statusMsg}</p>
          <div className="flex gap-1 justify-center">
            {Array.from({ length: CAPTURES_NEEDED }).map((_, i) => (
              <span
                key={i}
                className={`h-2 w-8 rounded-full ${i < captures.length ? "bg-primary" : "bg-border"}`}
              />
            ))}
          </div>
          <button
            type="button"
            className="btn-primary w-full"
            disabled={saving}
            onClick={() => void captureFromVideo()}
          >
            {saving ? "Processando..." : `Capturar (${captureIndex + 1}/${CAPTURES_NEEDED})`}
          </button>
        </>
      )}

      {phase === "upload" && mode === "upload" && (
        <>
          <input
            type="file"
            accept="image/*"
            className="industrial-input w-full"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setUploadUrl(URL.createObjectURL(f));
            }}
          />
          {uploadUrl && (
            <div className="overflow-hidden rounded-xl bg-black" style={{ aspectRatio: "4/3" }}>
              <img ref={imgRef} src={uploadUrl} alt="Preview" className="h-full w-full object-contain" />
            </div>
          )}
          <p className="text-xs text-muted">{statusMsg || "Foto única — prefira câmera ao vivo para maior precisão."}</p>
          <button
            type="button"
            className="btn-primary w-full"
            disabled={saving || !uploadUrl}
            onClick={() => void captureFromUpload()}
          >
            {saving ? "Salvando..." : "Cadastrar rosto da foto"}
          </button>
        </>
      )}
    </div>
  );
}
