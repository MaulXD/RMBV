"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./ui/Icon";
import { LGPD_FACE_CONSENT_TEXT } from "@/lib/lgpd-face-consent";
import {
  ENROLLMENT_CAPTURE_COUNT,
  ENROLLMENT_POSE_STEPS,
  frameQuality,
  resetAutoCaptureTracker,
  tickAutoCapture,
  type AutoCaptureTracker,
} from "@/lib/face-enrollment-capture";

const MODEL_URL = "/models";

type Phase = "instructions" | "consent" | "camera" | "upload" | "done";

function PoseHint({ direction }: { direction: (typeof ENROLLMENT_POSE_STEPS)[number]["direction"] }) {
  const arrows: Record<string, string> = {
    center: "◎",
    up: "↑",
    down: "↓",
    left: "←",
    right: "→",
  };
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-lg font-bold text-white">
      {arrows[direction]}
    </span>
  );
}

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
  const [phase, setPhase] = useState<Phase>("instructions");
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelsError, setModelsError] = useState(false);
  const [captures, setCaptures] = useState<number[][]>([]);
  const [captureIndex, setCaptureIndex] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [consent, setConsent] = useState(false);
  const [mode, setMode] = useState<"camera" | "upload">("camera");
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const trackerRef = useRef<AutoCaptureTracker>(resetAutoCaptureTracker());
  const detectingRef = useRef(false);
  const pauseUntilRef = useRef(0);

  useEffect(() => {
    void (async () => {
      try {
        const faceapi = await import("@vladmandic/face-api");
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
      } catch {
        setModelsError(true);
        setStatusMsg("Não foi possível carregar os modelos de reconhecimento facial.");
      }
    })();
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  useEffect(() => {
    if (phase !== "camera") return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    void video.play().catch(() => {
      setStatusMsg("Não foi possível iniciar a câmera. Verifique as permissões.");
    });
  }, [phase, captureIndex]);

  const currentPose = ENROLLMENT_POSE_STEPS[captureIndex];

  async function startCamera() {
    stopCamera();
    trackerRef.current = resetAutoCaptureTracker();
    setCaptures([]);
    setCaptureIndex(0);
    pauseUntilRef.current = 0;
    setStatusMsg(`${ENROLLMENT_POSE_STEPS[0]!.hint} — captura automática`);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      setPhase("camera");
      setScanning(true);
    } catch {
      setStatusMsg("Câmera não autorizada. Permita o acesso à câmera nas configurações do navegador.");
      setPhase(requireConsent ? "consent" : "instructions");
    }
  }

  const saveDescriptors = useCallback(async (descriptors: number[][]) => {
    setSaving(true);
    setScanning(false);
    const res = await fetch(`/api/users/${userId}/face`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        descriptors,
        acceptConsent: true,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatusMsg(data.error ?? "Falha ao salvar");
      setSaving(false);
      setScanning(true);
      return;
    }
    stopCamera();
    setPhase("done");
    setStatusMsg("Cadastro facial concluído!");
    setTimeout(onComplete, 1200);
  }, [userId, onComplete, stopCamera]);

  const onPoseCaptured = useCallback(async (descriptor: number[], nextCaptures: number[][]) => {
    pauseUntilRef.current = Date.now() + 900;
    trackerRef.current = resetAutoCaptureTracker();

    if (nextCaptures.length >= ENROLLMENT_CAPTURE_COUNT) {
      setCaptures(nextCaptures);
      setStatusMsg("Salvando cadastro...");
      await saveDescriptors(nextCaptures);
      return;
    }

    setCaptures(nextCaptures);
    setCaptureIndex(nextCaptures.length);
    const next = ENROLLMENT_POSE_STEPS[nextCaptures.length]!;
    setStatusMsg(`${next.hint} — captura automática`);
  }, [saveDescriptors]);

  const runAutoCapture = useCallback(async () => {
    if (
      detectingRef.current ||
      saving ||
      !scanning ||
      !videoRef.current ||
      !modelsLoaded ||
      Date.now() < pauseUntilRef.current
    ) {
      return;
    }

    detectingRef.current = true;
    try {
      const faceapi = await import("@vladmandic/face-api");
      const video = videoRef.current;
      const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 });
      const det = await faceapi
        .detectSingleFace(video, opts)
        .withFaceLandmarks(true)
        .withFaceDescriptor();

      if (!det) {
        setStatusMsg(`${currentPose?.hint ?? "Centralize o rosto"} — rosto não detectado`);
        trackerRef.current = resetAutoCaptureTracker();
        detectingRef.current = false;
        return;
      }

      const box = det.detection.box;
      const quality = frameQuality(det.detection.score, box, video.videoWidth, video.videoHeight);
      const tick = tickAutoCapture(trackerRef.current, det.descriptor, quality, box);

      if (tick.ready && tick.descriptor) {
        const next = [...captures, tick.descriptor];
        setStatusMsg(`Captura ${next.length}/${ENROLLMENT_CAPTURE_COUNT} ok!`);
        await onPoseCaptured(tick.descriptor, next);
      } else if (quality > 0) {
        setStatusMsg(`${currentPose?.hint ?? ""} — mantenha a pose (${Math.min(trackerRef.current.stableCount + 1, 3)}/3)`);
      } else {
        setStatusMsg(`${currentPose?.hint ?? ""} — aproxime-se e centralize o rosto`);
      }
    } catch {
      setStatusMsg("Erro na detecção. Ajuste a posição.");
    }
    detectingRef.current = false;
  }, [captures, currentPose, modelsLoaded, onPoseCaptured, saving, scanning]);

  useEffect(() => {
    if (phase !== "camera" || !modelsLoaded || !scanning) return;
    const id = setInterval(() => void runAutoCapture(), 450);
    return () => clearInterval(id);
  }, [phase, modelsLoaded, scanning, runAutoCapture, captureIndex]);

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
      setSaving(false);
    }
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
            <li>Serão <strong className="text-foreground">{ENROLLMENT_CAPTURE_COUNT} poses</strong>: frente, cima, baixo, esquerda e direita.</li>
            <li>A câmera <strong className="text-foreground">captura sozinha</strong> o melhor frame — não precisa apertar botão.</li>
            <li>Siga as setas na tela e mantenha a pose até a barra completar.</li>
          </ol>
        </div>
        {modelsError && <p className="text-xs text-red-500">{statusMsg}</p>}
        <button
          type="button"
          className="btn-primary w-full"
          disabled={!modelsLoaded || modelsError}
          onClick={() => {
            if (requireConsent) setPhase("consent");
            else void startCamera();
          }}
        >
          {modelsError ? "Modelos indisponíveis" : modelsLoaded ? "Continuar" : "Carregando modelos..."}
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
            Câmera ({ENROLLMENT_CAPTURE_COUNT} poses)
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

      {(phase === "camera" || mode === "camera") && currentPose && (
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
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2">
              <PoseHint direction={currentPose.direction} />
              <div className="h-48 w-36 rounded-[50%] border-2 border-dashed border-white/50" />
            </div>
            {saving && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Icon name="rotateCw" className="h-8 w-8 animate-spin text-white/80" />
              </div>
            )}
          </div>

          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">
              {captureIndex + 1}/{ENROLLMENT_CAPTURE_COUNT} · {currentPose.label}
            </p>
            <p className="mt-1 text-xs text-muted">{statusMsg}</p>
          </div>

          <div className="flex gap-1 justify-center">
            {ENROLLMENT_POSE_STEPS.map((step, i) => (
              <span
                key={step.direction}
                title={step.label}
                className={`h-2 w-8 rounded-full transition-colors ${
                  i < captures.length
                    ? "bg-primary"
                    : i === captureIndex
                      ? "bg-primary/40 animate-pulse"
                      : "bg-border"
                }`}
              />
            ))}
          </div>

          <p className="text-center text-[11px] text-muted">
            {saving ? "Salvando..." : "Captura automática — mantenha a pose até completar"}
          </p>
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
