"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./ui/Icon";
import { LivenessCornerBanner } from "./LivenessCornerBanner";
import { LivenessEyeGuide } from "./LivenessEyeGuide";
import { PoseDirectionGuide } from "./PoseDirectionGuide";
import { useLivenessAudioFeedback } from "@/hooks/useLivenessAudioFeedback";
import { warmupLivenessAudio, LIVENESS_COMPLETE_DELAY_MS } from "@/lib/face-liveness-audio";
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
import { FACE_RECOGNITION_DETECT } from "@/lib/face-match";
import {
  createLivenessTracker,
  resetLivenessTracker,
  tickLiveness,
  type LivenessTracker,
  type LivenessPhase,
  LIVENESS_POLL_MS,
  LIVENESS_FACE_DETECT,
  isVideoReadyForDetection,
} from "@/lib/face-liveness";

const MODEL_URL = "/models";

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
  const [livenessPhase, setLivenessPhase] = useState<LivenessPhase | null>(null);
  const [livenessFaceLost, setLivenessFaceLost] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackerRef = useRef<AutoCaptureTracker>(resetAutoCaptureTracker());
  const livenessRef = useRef<LivenessTracker>(createLivenessTracker());
  const detectingRef = useRef(false);
  const pauseUntilRef = useRef(0);

  const isSaving = saving || savingExternal;

  useLivenessAudioFeedback(scanning && !livenessPassed && !isSaving, livenessPhase, livenessFaceLost);
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
    setLivenessPhase(null);
    setLivenessFaceLost(false);
    warmupLivenessAudio();
    setCaptures([]);
    setCaptureIndex(0);
    setPoseEval(null);
    setStableProgress(0);
    pauseUntilRef.current = 0;
    setStatusMsg(ENROLLMENT_POSE_STEPS[0]!.hint);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
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
      if (!isVideoReadyForDetection(video)) {
        detectingRef.current = false;
        return;
      }
      const opts = new faceapi.TinyFaceDetectorOptions(
        livenessPassed ? FACE_RECOGNITION_DETECT : LIVENESS_FACE_DETECT,
      );

      if (!livenessPassed) {
        const det = await faceapi.detectSingleFace(video, opts).withFaceLandmarks(true);
        if (!det) {
          setLivenessMsg("Rosto não detectado — centralize no oval");
          setLivenessProgress(0);
          setLivenessFaceLost(true);
          detectingRef.current = false;
          return;
        }
        setLivenessFaceLost(false);
        const live = tickLiveness(livenessRef.current, det.landmarks.positions);
        setLivenessMsg(live.message);
        setLivenessProgress(live.progress);
        setLivenessPhase(live.phase);
        if (live.passed) {
          pauseUntilRef.current = Date.now() + LIVENESS_COMPLETE_DELAY_MS + 200;
          window.setTimeout(() => {
            setLivenessPassed(true);
            setStatusMsg(ENROLLMENT_POSE_STEPS[0]!.hint);
          }, LIVENESS_COMPLETE_DELAY_MS);
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
      const quality = frameQuality(
        det.detection.score,
        box,
        video.videoWidth,
        video.videoHeight,
        currentPose.direction,
      );
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
        currentPose.direction,
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
          style={{ transform: "scaleX(-1) scale(1.42)", transformOrigin: "center 42%" }}
        />
        <div className="pointer-events-none absolute inset-0">
          {!livenessPassed && (
            <>
              <LivenessCornerBanner message={livenessMsg} progress={livenessProgress} />
              <LivenessEyeGuide phase={livenessPhase} />
            </>
          )}
          {livenessPassed && currentPose && (
            <PoseDirectionGuide
              direction={currentPose.direction}
              active={poseEval?.kind === "wrong_pose"}
              ok={poseEval?.ok === true && stableProgress > 0}
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className={`h-32 w-24 sm:h-40 sm:w-32 rounded-[50%] border-[3px] border-dashed transition-all duration-300 ${ringColor}`}
            />
          </div>
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
            <p
              className={`rounded-lg border px-3 py-2.5 text-center leading-snug ${statusTone} ${
                !livenessPassed ? "text-sm font-bold sm:text-base" : "text-xs font-medium"
              }`}
            >
              {panelMsg}
            </p>
          )}

          {livenessPassed && (
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
                ? "Feche os olhos por um momento, depois abra quando ouvir Pronto"
                : "Captura automática — siga a seta na lateral da câmera"}
          </p>
        </div>
      )}
    </div>
  );
}
