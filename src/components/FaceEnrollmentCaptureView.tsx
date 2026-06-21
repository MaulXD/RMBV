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
import {
  createLivenessTracker,
  resetLivenessTracker,
  tickLiveness,
  type LivenessTracker,
  LIVENESS_POLL_MS,
} from "@/lib/face-liveness";

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
      className={`flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full text-base sm:text-lg font-bold transition-all duration-200 ${
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
  const [livenessPassed, setLivenessPassed] = useState(false);
  const [livenessMsg, setLivenessMsg] = useState("Olhe para a câmera com os olhos abertos");
  const [livenessProgress, setLivenessProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackerRef = useRef<AutoCaptureTracker>(resetAutoCaptureTracker());
  const livenessRef = useRef<LivenessTracker>(createLivenessTracker());
  const detectingRef = useRef(false);
  const pauseUntilRef = useRef(0);

  const isSaving = saving || savingExternal;
  const currentPose = ENROLLMENT_POSE_STEPS[captureIndex];
  const displayMsg = statusOverride ?? statusMsg;

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
    livenessRef.current = resetLivenessTracker();
    setLivenessPassed(false);
    setLivenessMsg("Olhe para a câmera com os olhos abertos");
    setLivenessProgress(0);
    setCaptures([]);
    setCaptureIndex(0);
    setPoseEval(null);
    setStableProgress(0);
    pauseUntilRef.current = 0;
    setStatusMsg(ENROLLMENT_POSE_STEPS[0]!.hint);
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

      if (!livenessPassed) {
        const det = await faceapi.detectSingleFace(video, opts).withFaceLandmarks(true);
        if (!det) {
          setLivenessMsg("Rosto não detectado — centralize no oval");
          setLivenessProgress(0);
          detectingRef.current = false;
          return;
        }
        const live = tickLiveness(livenessRef.current, det.landmarks.positions);
        setLivenessMsg(live.message);
        setLivenessProgress(live.progress);
        if (live.passed) {
          pauseUntilRef.current = Date.now() + 500;
          setLivenessPassed(true);
          setStatusMsg(ENROLLMENT_POSE_STEPS[0]!.hint);
        }
        detectingRef.current = false;
        return;
      }

      const det = await faceapi
        .detectSingleFace(video, opts)
        .withFaceLandmarks(true)
        .withFaceDescriptor();

      if (!det) {
        setPoseEval({ ok: false, kind: "no_face", message: "Rosto não detectado", alignment: 0 });
        setStableProgress(0);
        setStatusMsg(`${currentPose!.hint} — centralize o rosto no oval`);
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
  }, [captures, currentPose, isSaving, livenessPassed, modelsLoaded, onPoseCaptured, scanning]);

  useEffect(() => {
    if (!modelsLoaded || !scanning || isSaving) return;
    const ms = livenessPassed ? 450 : LIVENESS_POLL_MS;
    const id = setInterval(() => void runAutoCapture(), ms);
    return () => clearInterval(id);
  }, [modelsLoaded, scanning, isSaving, livenessPassed, runAutoCapture, captureIndex]);

  const ringColor = !livenessPassed
    ? livenessProgress >= 1
      ? "border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.45)]"
      : "border-violet-400/80 shadow-[0_0_16px_rgba(139,92,246,0.35)]"
    : poseEval?.ok === true && stableProgress > 0
      ? "border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.45)]"
      : poseEval?.kind === "wrong_pose"
        ? "border-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.35)]"
        : "border-white/50";

  const statusTone = !livenessPassed
    ? "border-violet-500/30 bg-violet-500/10 text-violet-800 dark:text-violet-200"
    : poseEval?.ok === true
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : poseEval?.kind === "wrong_pose" || poseEval?.kind === "no_face"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200"
        : "border-border bg-surface text-muted";

  const panelMsg = !livenessPassed ? livenessMsg : displayMsg;

  if (!modelsLoaded) {
    return <p className="text-xs text-muted text-center py-4">Carregando modelos de reconhecimento...</p>;
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <div
        className="relative mx-auto w-full max-w-[min(100%,280px)] overflow-hidden rounded-xl bg-black sm:max-w-xs"
        style={{ aspectRatio: "3 / 4", maxHeight: "min(42dvh, 320px)" }}
      >
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          muted
          autoPlay
          style={{ transform: "scaleX(-1)" }}
        />
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5 sm:gap-2">
          {!livenessPassed ? (
            <span className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-violet-500/80 text-lg font-bold text-white animate-pulse">
              👁
            </span>
          ) : currentPose ? (
            <PoseHint
              direction={currentPose.direction}
              active={poseEval?.kind === "wrong_pose"}
              ok={poseEval?.ok === true && stableProgress > 0}
            />
          ) : null}
          <div
            className={`h-32 w-24 sm:h-40 sm:w-32 rounded-[50%] border-[3px] border-dashed transition-all duration-300 ${ringColor}`}
          />
        </div>

        {isSaving && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <Icon name="rotateCw" className="h-8 w-8 animate-spin text-white/80" />
          </div>
        )}
      </div>

      {(currentPose || !livenessPassed) && (
        <div className="panel-solid w-full min-w-0 space-y-3 rounded-xl p-3 sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {!livenessPassed
                  ? "Prova de vida"
                  : `${captureIndex + 1}/${ENROLLMENT_CAPTURE_COUNT} · ${currentPose!.label}`}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {!livenessPassed
                  ? "Confirme que você está ao vivo — foto ou tela não passam"
                  : currentPose!.hint}
              </p>
            </div>
            {livenessPassed && (
              <div className="flex shrink-0 gap-1 pt-0.5">
                {ENROLLMENT_POSE_STEPS.map((step, i) => (
                  <span
                    key={step.direction}
                    title={step.label}
                    className={`h-2 w-5 sm:w-6 rounded-full transition-colors ${
                      i < captures.length
                        ? "bg-emerald-500"
                        : i === captureIndex
                          ? "bg-primary animate-pulse"
                          : "bg-border"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {panelMsg && (
            <p className={`rounded-lg border px-3 py-2 text-center text-xs font-medium leading-snug ${statusTone}`}>
              {panelMsg}
            </p>
          )}

          {!livenessPassed ? (
            <div>
              <div className="mb-1 flex justify-between text-[10px] font-medium uppercase tracking-wide text-muted">
                <span>Verificação</span>
                <span>{Math.round(livenessProgress * 100)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full bg-violet-500 transition-all duration-200"
                  style={{ width: `${Math.round(livenessProgress * 100)}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
            <div>
              <div className="mb-1 flex justify-between text-[10px] font-medium uppercase tracking-wide text-muted">
                <span>Alinhamento</span>
                <span>{Math.round((poseEval?.alignment ?? 0) * 100)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-border">
                <div
                  className={`h-full transition-all duration-200 ${poseEval?.ok ? "bg-emerald-500" : "bg-amber-500"}`}
                  style={{ width: `${Math.round((poseEval?.alignment ?? 0) * 100)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-[10px] font-medium uppercase tracking-wide text-muted">
                <span>Estabilidade</span>
                <span>{Math.round(stableProgress * 100)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full bg-primary transition-all duration-200"
                  style={{ width: `${Math.round(stableProgress * 100)}%` }}
                />
              </div>
            </div>
          </div>
          )}

          <p className="text-center text-[11px] text-muted">
            {isSaving
              ? "Salvando..."
              : !livenessPassed
                ? "Pisque devagar — feche os olhos por 1 segundo e abra"
                : "Captura automática — ajuste a pose até ficar verde"}
          </p>
        </div>
      )}
    </div>
  );
}
