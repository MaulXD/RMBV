"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  findBestFaceMatch,
  toDescriptorArray,
  FACE_RECOGNITION_DETECT,
  FACE_MATCH_STABLE_FRAMES,
  createMatchFrameTracker,
  resetMatchFrameTracker,
  tickStrongMatchFrame,
  tickNoFaceMatchFrame,
  type MatchFrameTracker,
} from "@/lib/face-match";
import {
  createLivenessTracker,
  resetLivenessTracker,
  tickLiveness,
  type LivenessTracker,
  type LivenessPhase,
  LIVENESS_POLL_MS,
  LIVENESS_FACE_DETECT,
  isVideoReadyForDetection,
  waitForVideoReady,
} from "@/lib/face-liveness";
import { LivenessCornerBanner } from "@/components/LivenessCornerBanner";
import { LivenessEyeGuide } from "@/components/LivenessEyeGuide";
import { useLivenessAudioFeedback } from "@/hooks/useLivenessAudioFeedback";
import { warmupLivenessAudio, getLivenessPassedDelayMs } from "@/lib/face-liveness-audio";

type KnownUser = { id: string; name: string; descriptor: Float32Array };
type PontoType = "ENTRADA" | "SAIDA" | "INTERVALO_INICIO" | "INTERVALO_FIM";
type KioskStatus =
  | "loading-models"
  | "loading-camera"
  | "liveness"
  | "ready"
  | "detecting"
  | "verified"
  | "submitting"
  | "success"
  | "no-match"
  | "error";

type PontoResult = { userName: string; type: PontoType; confidence: number };

import {
  faceVideoStyle,
  FACE_OVAL_BORDER_CLASS,
  FACE_OVAL_INSET,
} from "@/lib/face-framing";

const MODEL_URL = "/models";

const TYPE_LABEL: Record<PontoType, string> = {
  ENTRADA: "Entrada registrada",
  SAIDA: "Saída registrada",
  INTERVALO_INICIO: "Início de intervalo registrado",
  INTERVALO_FIM: "Fim de intervalo registrado",
};

const PUNCH_OPTIONS = [
  { type: "ENTRADA" as const, icon: "logIn" as const, title: "Entrada", subtitle: "Iniciar jornada", accent: "emerald" },
  { type: "SAIDA" as const, icon: "logOut" as const, title: "Saída", subtitle: "Encerrar jornada", accent: "amber" },
  { type: "INTERVALO_INICIO" as const, icon: "clock" as const, title: "Início intervalo", subtitle: "Pausa", accent: "sky" },
  { type: "INTERVALO_FIM" as const, icon: "play" as const, title: "Fim intervalo", subtitle: "Retomar", accent: "violet" },
];

export function PontoKiosk({ teamId }: { teamId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<KioskStatus>("loading-models");
  const [result, setResult] = useState<PontoResult | null>(null);
  const [knownUsers, setKnownUsers] = useState<KnownUser[]>([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [livenessMsg, setLivenessMsg] = useState("Olhe para a câmera com os olhos abertos");
  const [livenessProgress, setLivenessProgress] = useState(0);
  const [livenessPhase, setLivenessPhase] = useState<LivenessPhase | null>(null);
  const [livenessFaceLost, setLivenessFaceLost] = useState(false);
  const detectingRef = useRef(false);
  const matchTrackerRef = useRef<MatchFrameTracker>(createMatchFrameTracker());
  const pendingUserIdRef = useRef<string | null>(null);
  const [matchHint, setMatchHint] = useState("");
  const [matchProgress, setMatchProgress] = useState(0);
  const [verifiedUser, setVerifiedUser] = useState<KnownUser | null>(null);
  const [verifiedConfidence, setVerifiedConfidence] = useState<number | null>(null);
  const [suggestedType, setSuggestedType] = useState<PontoType>("ENTRADA");

  useLivenessAudioFeedback(status === "liveness", livenessPhase, livenessFaceLost);
  const livenessBusyRef = useRef(false);
  const cooldownRef = useRef(false);
  const livenessRef = useRef<LivenessTracker>(createLivenessTracker());

  const resetMatchFlow = useCallback(() => {
    matchTrackerRef.current = resetMatchFrameTracker();
    pendingUserIdRef.current = null;
    setMatchProgress(0);
    setMatchHint("");
    setVerifiedUser(null);
    setVerifiedConfidence(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const faceapi = await import("@vladmandic/face-api");
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        if (cancelled) return;
        setModelsLoaded(true);
        setStatus("loading-camera");
      } catch {
        if (!cancelled) {
          setErrorMsg("Falha ao carregar modelos de reconhecimento.");
          setStatus("error");
        }
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!teamId) return;
    fetch(`/api/ponto/faces?teamId=${teamId}`)
      .then((r) => r.json())
      .then((data) => {
        const users: KnownUser[] = (data.users ?? [])
          .map((u: { id: string; name: string; faceDescriptor: unknown }) => {
            const descriptor = toDescriptorArray(u.faceDescriptor);
            if (!descriptor) return null;
            return { id: u.id, name: u.name, descriptor };
          })
          .filter(Boolean) as KnownUser[];
        setKnownUsers(users);
      });
  }, [teamId]);

  useEffect(() => {
    if (!modelsLoaded) return;
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          void videoRef.current.play().then(async () => {
            await waitForVideoReady(videoRef.current!);
            livenessRef.current = resetLivenessTracker();
            resetMatchFlow();
            setLivenessProgress(0);
            setLivenessPhase(null);
            setLivenessFaceLost(false);
            setLivenessMsg("Olhe para a câmera com os olhos abertos");
            warmupLivenessAudio();
            setStatus("liveness");
          });
        }
      })
      .catch(() => {
        setErrorMsg("Câmera não autorizada. Permita o acesso à câmera.");
        setStatus("error");
      });
    return () => { stream?.getTracks().forEach((t) => t.stop()); };
  }, [modelsLoaded, resetMatchFlow]);

  const runLivenessCheck = useCallback(async () => {
    if (livenessBusyRef.current || !videoRef.current || status !== "liveness") return;
    if (!isVideoReadyForDetection(videoRef.current)) return;
    livenessBusyRef.current = true;
    try {
      const faceapi = await import("@vladmandic/face-api");
      const opts = new faceapi.TinyFaceDetectorOptions(LIVENESS_FACE_DETECT);
      const det = await faceapi.detectSingleFace(videoRef.current, opts).withFaceLandmarks(true);
      if (!det) {
        setLivenessMsg("Centralize o rosto — olhos abertos");
        setLivenessProgress(0);
        setLivenessFaceLost(true);
        livenessBusyRef.current = false;
        return;
      }
      setLivenessFaceLost(false);
      const live = tickLiveness(livenessRef.current, det.landmarks.positions);
      setLivenessProgress(live.progress);
      setLivenessPhase(live.phase);
      setLivenessMsg(live.message);
      if (live.passed) {
        void getLivenessPassedDelayMs().then((delayMs) => {
          window.setTimeout(() => {
            resetMatchFlow();
            setStatus("ready");
          }, delayMs);
        });
      }
    } catch {
      setLivenessMsg("Erro na verificação. Tente novamente.");
    }
    livenessBusyRef.current = false;
  }, [status, resetMatchFlow]);

  const openVerified = useCallback(async (user: KnownUser, confidence: number) => {
    setVerifiedUser(user);
    setVerifiedConfidence(confidence);
    setStatus("verified");
    setMatchHint("");
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const res = await fetch(`/api/ponto/last?userId=${user.id}&date=${todayStr}`);
      const data = await res.json();
      setSuggestedType((data.nextType ?? "ENTRADA") as PontoType);
    } catch {
      setSuggestedType("ENTRADA");
    }
  }, []);

  const submitPunch = useCallback(async (type: PontoType) => {
    if (!verifiedUser || verifiedConfidence === null) return;
    setStatus("submitting");
    try {
      await fetch("/api/ponto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: verifiedUser.id,
          teamId,
          type,
          confidence: verifiedConfidence,
          origin: "KIOSK",
        }),
      });
      setResult({ userName: verifiedUser.name, type, confidence: verifiedConfidence });
      setStatus("success");
      cooldownRef.current = true;
      resetMatchFlow();
      setTimeout(() => {
        setStatus("ready");
        setResult(null);
        cooldownRef.current = false;
      }, 4500);
    } catch {
      setStatus("verified");
    }
  }, [verifiedUser, verifiedConfidence, teamId, resetMatchFlow]);

  const detectAndMatch = useCallback(async () => {
    if (detectingRef.current || cooldownRef.current || !videoRef.current || !modelsLoaded) return;
    if (!isVideoReadyForDetection(videoRef.current)) return;
    if (status !== "ready" && status !== "detecting") return;

    detectingRef.current = true;
    setStatus("detecting");

    try {
      const faceapi = await import("@vladmandic/face-api");
      const options = new faceapi.TinyFaceDetectorOptions(FACE_RECOGNITION_DETECT);
      const detection = await faceapi
        .detectSingleFace(videoRef.current, options)
        .withFaceLandmarks(true)
        .withFaceDescriptor();

      if (knownUsers.length === 0) {
        setStatus("no-match");
        setTimeout(() => setStatus("ready"), 3000);
        detectingRef.current = false;
        return;
      }

      if (!detection) {
        const tick = tickNoFaceMatchFrame(matchTrackerRef.current);
        pendingUserIdRef.current = null;
        setMatchProgress(tick.progress);
        if (tick.status === "reject") {
          setStatus("no-match");
          resetMatchFlow();
          setTimeout(() => setStatus("ready"), 3000);
        } else {
          setMatchHint("Aproxime o rosto no molde");
          setStatus("ready");
        }
        detectingRef.current = false;
        return;
      }

      const match = findBestFaceMatch(detection.descriptor, knownUsers);

      if (!match) {
        resetMatchFlow();
        setStatus("no-match");
        setTimeout(() => setStatus("ready"), 3000);
        detectingRef.current = false;
        return;
      }

      if (pendingUserIdRef.current && pendingUserIdRef.current !== match.item.id) {
        matchTrackerRef.current = resetMatchFrameTracker();
      }
      pendingUserIdRef.current = match.item.id;

      const tick = tickStrongMatchFrame(matchTrackerRef.current, match.distance);
      setMatchProgress(tick.progress);

      if (tick.status === "ready") {
        await openVerified(match.item, tick.averageConfidence);
        detectingRef.current = false;
        return;
      }

      if (tick.status === "reject") {
        setStatus("no-match");
        resetMatchFlow();
        setTimeout(() => setStatus("ready"), 3000);
        detectingRef.current = false;
        return;
      }

      if (tick.status === "building") {
        setMatchHint(
          `${match.item.name.split(" ")[0]} — ${Math.round(tick.averageConfidence * 100)}% (${tick.streak}/${FACE_MATCH_STABLE_FRAMES})`,
        );
      } else {
        setMatchHint(`Confiança baixa (${Math.round(tick.confidence * 100)}%) — aproxime-se`);
        setStatus("ready");
      }
    } catch {
      setStatus("ready");
      setMatchHint("");
    }
    detectingRef.current = false;
  }, [status, modelsLoaded, knownUsers, openVerified, resetMatchFlow]);

  useEffect(() => {
    if (status !== "liveness") return;
    const interval = setInterval(() => { void runLivenessCheck(); }, LIVENESS_POLL_MS);
    return () => clearInterval(interval);
  }, [status, runLivenessCheck]);

  useEffect(() => {
    if (status !== "ready" && status !== "detecting") return;
    const interval = setInterval(() => { void detectAndMatch(); }, 700);
    return () => clearInterval(interval);
  }, [status, detectAndMatch]);

  const borderClass =
    status === "success" || status === "verified" || status === "submitting" ? "border-emerald-500" :
    status === "no-match" ? "border-red-500" :
    status === "liveness" ? "border-violet-500" :
    status === "detecting" ? "border-amber-500" :
    "border-white/10";

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-gray-950 px-4 py-6 text-white">
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4">
        <span className="text-xs font-bold tracking-widest text-white/30 uppercase">Ponto Eletrônico</span>
        <span className="text-xs text-white/30">{new Date().toLocaleTimeString("pt-BR")}</span>
      </div>

      <div className="relative w-full max-w-md">
        <div
          className={`relative mx-auto overflow-hidden rounded-2xl border-4 transition-colors duration-300 ${borderClass}`}
          style={{ width: "min(100%, 420px)", aspectRatio: "3 / 4" }}
        >
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            playsInline
            muted
            autoPlay
            style={faceVideoStyle}
          />

          {(status === "ready" || status === "detecting" || status === "liveness" || status === "verified" || status === "submitting") && (
            <div
              className={`pointer-events-none absolute ${FACE_OVAL_BORDER_CLASS} rounded-[50%] border-white/40`}
              style={FACE_OVAL_INSET}
            />
          )}

          {status === "loading-models" || status === "loading-camera" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-950/80">
              <Icon name="rotateCw" className="h-8 w-8 animate-spin text-white/40" />
              <p className="text-xs text-white/40">
                {status === "loading-models" ? "Carregando modelos..." : "Iniciando câmera..."}
              </p>
            </div>
          ) : status === "liveness" ? (
            <>
              <LivenessCornerBanner message={livenessMsg} progress={livenessProgress} variant="kiosk" />
              <LivenessEyeGuide phase={livenessPhase} />
            </>
          ) : status === "error" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-950/90 p-4 text-center">
              <p className="text-sm text-red-400">{errorMsg}</p>
            </div>
          ) : status === "success" && result ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-emerald-950/80">
              <svg viewBox="0 0 24 24" className="h-12 w-12 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
          ) : status === "verified" || status === "submitting" ? (
            <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/15">
              <svg viewBox="0 0 24 24" className="h-16 w-16 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
          ) : status === "no-match" ? (
            <div className="absolute inset-0 flex items-center justify-center bg-red-950/60">
              <p className="text-sm font-semibold text-red-300">Não reconhecido</p>
            </div>
          ) : null}
        </div>

        <div className="mt-5 text-center">
          {status === "success" && result ? (
            <div className="space-y-1">
              <p className="text-2xl font-black text-emerald-400">{result.userName}</p>
              <p className="text-sm text-white/60">
                {TYPE_LABEL[result.type]} • {new Date().toLocaleTimeString("pt-BR")}
              </p>
            </div>
          ) : status === "verified" || status === "submitting" ? (
            <div className="space-y-4">
              <div>
                <p className="text-xl font-bold text-emerald-400">{verifiedUser?.name}</p>
                <p className="mt-1 text-sm text-white/50">
                  Rosto confirmado ({verifiedConfidence !== null ? Math.round(verifiedConfidence * 100) : 0}%)
                </p>
                <p className="text-sm font-medium text-white/80">Escolha o tipo de registro</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {PUNCH_OPTIONS.map((opt) => {
                  const active = suggestedType === opt.type;
                  const styles = {
                    emerald: active ? "border-emerald-500/60 bg-emerald-500/15 ring-1 ring-emerald-500/40" : "border-white/15 bg-white/5 hover:border-emerald-500/30",
                    amber: active ? "border-amber-500/60 bg-amber-500/15 ring-1 ring-amber-500/40" : "border-white/15 bg-white/5 hover:border-amber-500/30",
                    sky: active ? "border-sky-500/60 bg-sky-500/15 ring-1 ring-sky-500/40" : "border-white/15 bg-white/5 hover:border-sky-500/30",
                    violet: active ? "border-violet-500/60 bg-violet-500/15 ring-1 ring-violet-500/40" : "border-white/15 bg-white/5 hover:border-violet-500/30",
                  }[opt.accent];
                  const iconColor = {
                    emerald: "text-emerald-400",
                    amber: "text-amber-400",
                    sky: "text-sky-400",
                    violet: "text-violet-400",
                  }[opt.accent];

                  return (
                    <button
                      key={opt.type}
                      type="button"
                      disabled={status === "submitting"}
                      onClick={() => void submitPunch(opt.type)}
                      className={`rounded-xl border p-4 text-left transition-all active:scale-[0.98] disabled:opacity-50 ${styles}`}
                    >
                      <Icon name={opt.icon} className={`mb-2 h-6 w-6 ${iconColor}`} />
                      <p className="font-bold leading-tight">{opt.title}</p>
                      <p className="mt-0.5 text-[11px] text-white/50">{opt.subtitle}</p>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                disabled={status === "submitting"}
                onClick={() => {
                  resetMatchFlow();
                  setStatus("ready");
                }}
                className="text-xs text-white/40 underline underline-offset-2 hover:text-white/70"
              >
                Cancelar e tentar de novo
              </button>
            </div>
          ) : status === "liveness" ? (
            <div className="space-y-3 px-2">
              <p className="text-base font-bold leading-snug text-violet-300">{livenessMsg}</p>
              <p className="text-xs text-white/40">Aproxime o rosto no molde — feche os olhos e abra ao ouvir o sinal</p>
            </div>
          ) : status === "ready" ? (
            <p className="text-sm text-white/40">
              {knownUsers.length === 0
                ? "Nenhum rosto cadastrado nesta equipe"
                : "Aproxime o rosto no molde para registrar o ponto"}
            </p>
          ) : status === "detecting" ? (
            <div className="space-y-2 px-2">
              <p className="text-sm text-amber-400">{matchHint || "Reconhecendo..."}</p>
              <div className="mx-auto h-1.5 w-48 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-amber-400 transition-all duration-200"
                  style={{ width: `${Math.round(matchProgress * 100)}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
