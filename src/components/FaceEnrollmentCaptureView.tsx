"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./ui/Icon";
import {
  ENROLLMENT_CAPTURE_COUNT,
  ENROLLMENT_POSE_STEPS,
  computePoseMetrics,
  evaluatePose,
  frameQuality,
  getStableProgress,
  resetAutoCaptureTracker,
  tickAutoCapture,
  type AutoCaptureTracker,
  type PoseEvaluation,
} from "@/lib/face-enrollment-capture";

const MODEL_URL = "/models";

function PoseHint({
  direction,
  active,
  ok,
}: {
  direction: (typeof ENROLLMENT_POSE_STEPS)[number]["direction"];
  active: boolean;
  ok: boolean;
}) {
  const arrows: Record<string, string> = {
    center: "◎",
    up: "↑",
    down: "↓",
    left: "←",
    right: "→",
  };
  return (
    <span
      className={`flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold transition-all duration-200 ${
        ok
          ? "bg-emerald-500/90 text-white scale-110"
          : active
            ? "bg-amber-500/80 text-white animate-pulse"
            : "bg-white/15 text-white"
      }`}
    >
      {arrows[direction]}
    </span>
  );
}

export function FaceEnrollmentCaptureView({
  onComplete,
  saving: savingExternal = false,
  statusOverride,
}: {
  onComplete: (descriptors: number[][]) => void | Promise<void>;
  saving?: boolean;
  statusOverride?: string;
}) {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [captures, setCaptures] = useState<number[][]>([]);
  const [captureIndex, setCaptureIndex] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [poseEval, setPoseEval] = useState<PoseEvaluation | null>(null);
  const [stableProgress, setStableProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackerRef = useRef<AutoCaptureTracker>(resetAutoCaptureTracker());
  const detectingRef = useRef(false);
  const pauseUntilRef = useRef(0);

  const isSaving = saving || savingExternal;
  const currentPose = ENROLLMENT_POSE_STEPS[captureIndex];

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
        setStatusMsg("Não foi possível carregar os modelos de reconhecimento facial.");
      }
    })();
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    trackerRef.current = resetAutoCaptureTracker();
    setCaptures([]);
    setCaptureIndex(0);
    setPoseEval(null);
    setStableProgress(0);
    pauseUntilRef.current = 0;
    setStatusMsg(`${ENROLLMENT_POSE_STEPS[0]!.hint}`);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      setScanning(true);
    } catch {
      setStatusMsg("Câmera não autorizada. Permita o acesso nas configurações do navegador.");
    }
  }, [stopCamera]);

  useEffect(() => {
    if (!modelsLoaded) return;
    void startCamera();
    return () => stopCamera();
  }, [modelsLoaded, startCamera, stopCamera]);

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream || !scanning) return;
    video.srcObject = stream;
    void video.play().catch(() => {
      setStatusMsg("Não foi possível iniciar a câmera.");
    });
  }, [scanning, captureIndex]);

  const onPoseCaptured = useCallback(async (descriptor: number[], nextCaptures: number[][]) => {
    pauseUntilRef.current = Date.now() + 900;
    trackerRef.current = resetAutoCaptureTracker();
    setStableProgress(0);
    setPoseEval(null);

    if (nextCaptures.length >= ENROLLMENT_CAPTURE_COUNT) {
      setCaptures(nextCaptures);
      setSaving(true);
      setScanning(false);
      setStatusMsg("Salvando cadastro...");
      try {
        await onComplete(nextCaptures);
      } catch {
        setSaving(false);
        setScanning(true);
        setStatusMsg("Falha ao salvar. Tente novamente.");
      }
      return;
    }

    setCaptures(nextCaptures);
    setCaptureIndex(nextCaptures.length);
    setStatusMsg(ENROLLMENT_POSE_STEPS[nextCaptures.length]!.hint);
  }, [onComplete]);

  const runAutoCapture = useCallback(async () => {
    if (
      detectingRef.current ||
      isSaving ||
      !scanning ||
      !videoRef.current ||
      !modelsLoaded ||
      Date.now() < pauseUntilRef.current ||
      !currentPose
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
        setPoseEval({ ok: false, kind: "no_face", message: "Rosto não detectado", alignment: 0 });
        setStableProgress(0);
        setStatusMsg(`${currentPose.hint} — centralize o rosto no oval`);
        trackerRef.current = resetAutoCaptureTracker();
        detectingRef.current = false;
        return;
      }

      const box = det.detection.box;
      const quality = frameQuality(det.detection.score, box, video.videoWidth, video.videoHeight);
      const metrics = computePoseMetrics(det.landmarks.positions);
      const evaluation = evaluatePose(currentPose.direction, metrics);
      setPoseEval(evaluation);

      if (quality <= 0) {
        setStableProgress(0);
        setStatusMsg("Aproxime-se e centralize o rosto");
        trackerRef.current = resetAutoCaptureTracker();
        detectingRef.current = false;
        return;
      }

      if (!evaluation.ok) {
        setStableProgress(0);
        setStatusMsg(evaluation.message);
        trackerRef.current = resetAutoCaptureTracker();
        detectingRef.current = false;
        return;
      }

      const tick = tickAutoCapture(
        trackerRef.current,
        det.descriptor,
        quality,
        box,
        true,
      );
      setStableProgress(getStableProgress(trackerRef.current));

      if (tick.ready && tick.descriptor) {
        const next = [...captures, tick.descriptor];
        setPoseEval({ ok: true, kind: "ok", message: `Captura ${next.length}/${ENROLLMENT_CAPTURE_COUNT} concluída!`, alignment: 1 });
        setStatusMsg(`Captura ${next.length}/${ENROLLMENT_CAPTURE_COUNT} ok!`);
        await onPoseCaptured(tick.descriptor, next);
      } else {
        setStatusMsg(`${evaluation.message} — estabilizando (${Math.min(trackerRef.current.stableCount + 1, 3)}/3)`);
      }
    } catch {
      setStatusMsg("Erro na detecção. Ajuste a posição.");
    }
    detectingRef.current = false;
  }, [captures, currentPose, isSaving, modelsLoaded, onPoseCaptured, scanning]);

  useEffect(() => {
    if (!modelsLoaded || !scanning || isSaving) return;
    const id = setInterval(() => void runAutoCapture(), 450);
    return () => clearInterval(id);
  }, [modelsLoaded, scanning, isSaving, runAutoCapture, captureIndex]);

  const ringColor =
    poseEval?.ok === true && stableProgress > 0
      ? "border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.45)]"
      : poseEval?.kind === "wrong_pose"
        ? "border-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.35)]"
        : "border-white/50";

  const feedbackColor =
    poseEval?.ok === true
      ? "bg-emerald-500/90 text-white"
      : poseEval?.kind === "wrong_pose"
        ? "bg-amber-500/90 text-white"
        : "bg-black/60 text-white/90";

  if (!modelsLoaded) {
    return <p className="text-xs text-muted text-center py-4">Carregando modelos de reconhecimento...</p>;
  }

  return (
    <div className="space-y-3">
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
          {currentPose && (
            <PoseHint
              direction={currentPose.direction}
              active={poseEval?.kind === "wrong_pose"}
              ok={poseEval?.ok === true && stableProgress > 0}
            />
          )}
          <div
            className={`h-48 w-36 rounded-[50%] border-[3px] border-dashed transition-all duration-300 ${ringColor}`}
          />
        </div>

        {poseEval && (
          <div className={`absolute top-3 inset-x-3 rounded-lg px-3 py-2 text-center text-xs font-medium backdrop-blur-sm ${feedbackColor}`}>
            {statusOverride ?? statusMsg}
          </div>
        )}

        {isSaving && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Icon name="rotateCw" className="h-8 w-8 animate-spin text-white/80" />
          </div>
        )}
      </div>

      {currentPose && (
        <>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">
              {captureIndex + 1}/{ENROLLMENT_CAPTURE_COUNT} · {currentPose.label}
            </p>
            {!poseEval && <p className="mt-1 text-xs text-muted">{currentPose.hint}</p>}
          </div>

          <div className="space-y-1.5 px-1">
            <div className="flex justify-between text-[10px] text-muted uppercase tracking-wide">
              <span>Alinhamento da pose</span>
              <span>{Math.round((poseEval?.alignment ?? 0) * 100)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-border">
              <div
                className={`h-full transition-all duration-200 ${poseEval?.ok ? "bg-emerald-500" : "bg-amber-500"}`}
                style={{ width: `${Math.round((poseEval?.alignment ?? 0) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted uppercase tracking-wide">
              <span>Estabilidade</span>
              <span>{Math.round(stableProgress * 100)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-border">
              <div
                className="h-full bg-primary transition-all duration-200"
                style={{ width: `${Math.round(stableProgress * 100)}%` }}
              />
            </div>
          </div>

          <div className="flex gap-1 justify-center">
            {ENROLLMENT_POSE_STEPS.map((step, i) => (
              <span
                key={step.direction}
                title={step.label}
                className={`h-2 w-8 rounded-full transition-colors ${
                  i < captures.length
                    ? "bg-emerald-500"
                    : i === captureIndex
                      ? "bg-primary/50 animate-pulse"
                      : "bg-border"
                }`}
              />
            ))}
          </div>

          <p className="text-center text-[11px] text-muted">
            {isSaving ? "Salvando..." : "Captura automática — ajuste a pose até ficar verde"}
          </p>
        </>
      )}
    </div>
  );
}
