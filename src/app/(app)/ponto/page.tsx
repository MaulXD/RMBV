"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession, type SessionUser } from "@/components/SessionProvider";
import { Icon } from "@/components/ui/Icon";
import { TeamFaceEnrollmentPanel } from "@/components/TeamFaceEnrollmentPanel";

type PontoType = "ENTRADA" | "SAIDA";
type ClockPhase =
  | "idle"
  | "opening"
  | "ready"
  | "detecting"
  | "success"
  | "no-match"
  | "error";

type EnrollPhase = "idle" | "opening" | "ready" | "capturing" | "saving" | "done";

type PontoRecord = {
  id: string;
  type: PontoType;
  confidence: number | null;
  recordedAt: string;
  user: { id: string; name: string; email: string };
};

const THRESHOLD = 0.5;
const MIN_CONFIDENCE = 0.65;
const MODEL_URL = "/models";

function euclidean(a: Float32Array, b: Float32Array) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i]! - b[i]!) ** 2;
  return Math.sqrt(s);
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// ─── Models loading (shared singleton) ──────────────
let modelsPromise: Promise<void> | null = null;
function loadModels() {
  if (!modelsPromise) {
    modelsPromise = (async () => {
      const faceapi = await import("@vladmandic/face-api");
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
    })();
  }
  return modelsPromise;
}

// ─── Collaborator / Pesquisador view ────────────────
function SelfServicePonto({ user }: { user: SessionUser }) {
  const todayStr = new Date().toISOString().slice(0, 10);

  // Face descriptor state
  const [hasDescriptor, setHasDescriptor] = useState<boolean | null>(null);
  const [descriptor, setDescriptor] = useState<Float32Array | null>(null);

  // Models
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // Clock-in/out camera
  const [selectedType, setSelectedType] = useState<PontoType | null>(null);
  const [clockPhase, setClockPhase] = useState<ClockPhase>("idle");
  const [clockMsg, setClockMsg] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const detectingRef = useRef(false);
  const cooldownRef = useRef(false);

  // Enrollment camera
  const [enrolling, setEnrolling] = useState(false);
  const [enrollPhase, setEnrollPhase] = useState<EnrollPhase>("idle");
  const [enrollMsg, setEnrollMsg] = useState("");
  const enrollVideoRef = useRef<HTMLVideoElement>(null);
  const enrollStreamRef = useRef<MediaStream | null>(null);

  // Today's records
  const [records, setRecords] = useState<PontoRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  // Load models on mount (background)
  useEffect(() => {
    void loadModels().then(() => setModelsLoaded(true)).catch(() => {});
  }, []);

  // Load face descriptor
  const loadDescriptor = useCallback(async () => {
    const res = await fetch(`/api/users/${user.id}/face`);
    if (!res.ok) return;
    const data = await res.json() as { hasDescriptor: boolean; descriptor?: number[] | null };
    setHasDescriptor(data.hasDescriptor);
    if (data.descriptor) setDescriptor(new Float32Array(data.descriptor));
    else setDescriptor(null);
  }, [user.id]);

  useEffect(() => { void loadDescriptor(); }, [loadDescriptor]);

  // Load today's records
  const loadRecords = useCallback(async () => {
    setRecordsLoading(true);
    try {
      const res = await fetch(`/api/ponto?date=${todayStr}&userId=${user.id}`);
      if (res.ok) {
        const d = await res.json() as { records: PontoRecord[] };
        setRecords(d.records);
      }
    } finally { setRecordsLoading(false); }
  }, [user.id, todayStr]);

  useEffect(() => { void loadRecords(); }, [loadRecords]);

  // ── Clock-in/out camera ──────────────────────────
  function stopClockCamera() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    detectingRef.current = false;
    cooldownRef.current = false;
    setClockPhase("idle");
    setSelectedType(null);
    setClockMsg("");
  }

  async function startClockCamera(type: PontoType) {
    if (!modelsLoaded || !descriptor) return;
    setSelectedType(type);
    setClockPhase("opening");
    setClockMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setClockPhase("ready");
    } catch {
      setClockPhase("error");
      setClockMsg("Câmera não autorizada.");
    }
  }

  const detectAndRecord = useCallback(async () => {
    if (detectingRef.current || cooldownRef.current || !videoRef.current || !descriptor || !selectedType) return;
    detectingRef.current = true;
    setClockPhase("detecting");
    try {
      const faceapi = await import("@vladmandic/face-api");
      const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
      const det = await faceapi.detectSingleFace(videoRef.current, opts).withFaceLandmarks(true).withFaceDescriptor();
      if (!det) { setClockPhase("ready"); detectingRef.current = false; return; }

      const dist = euclidean(det.descriptor, descriptor);
      const confidence = Math.max(0, 1 - dist / THRESHOLD);

      if (confidence < MIN_CONFIDENCE) {
        setClockPhase("no-match");
        setClockMsg("Confiança insuficiente. Reposicione-se e aguarde.");
        setTimeout(() => { setClockPhase("ready"); setClockMsg(""); }, 2500);
        detectingRef.current = false;
        return;
      }
      await fetch("/api/ponto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, teamId: user.teamId, type: selectedType, confidence }),
      });

      cooldownRef.current = true;
      setClockPhase("success");
      setClockMsg(`${selectedType === "ENTRADA" ? "Entrada" : "Saída"} registrada às ${fmtTime(new Date().toISOString())}`);
      setTimeout(() => { stopClockCamera(); void loadRecords(); }, 2800);
    } catch {
      setClockPhase("ready");
    }
    detectingRef.current = false;
  }, [descriptor, selectedType, user.id, user.teamId, loadRecords]);

  useEffect(() => {
    if (clockPhase !== "ready") return;
    intervalRef.current = setInterval(() => void detectAndRecord(), 700);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [clockPhase, detectAndRecord]);

  // ── Enrollment camera ────────────────────────────
  function stopEnrollCamera() {
    enrollStreamRef.current?.getTracks().forEach((t) => t.stop());
    enrollStreamRef.current = null;
    setEnrolling(false);
    setEnrollPhase("idle");
    setEnrollMsg("");
  }

  async function startEnrollCamera() {
    setEnrolling(true);
    setEnrollMsg("");
    setEnrollPhase("opening");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      enrollStreamRef.current = stream;
      if (enrollVideoRef.current) { enrollVideoRef.current.srcObject = stream; enrollVideoRef.current.play(); }
      setEnrollPhase("ready");
    } catch {
      setEnrollMsg("Câmera não autorizada.");
      setEnrollPhase("idle");
      setEnrolling(false);
    }
  }

  async function captureEnroll() {
    if (!enrollVideoRef.current || !modelsLoaded) return;
    setEnrollPhase("capturing");
    setEnrollMsg("Detectando rosto...");
    try {
      const faceapi = await import("@vladmandic/face-api");
      const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
      const det = await faceapi.detectSingleFace(enrollVideoRef.current, opts).withFaceLandmarks(true).withFaceDescriptor();
      if (!det) { setEnrollMsg("Rosto não detectado. Centralize-se e tente novamente."); setEnrollPhase("ready"); return; }
      setEnrollPhase("saving");
      setEnrollMsg("Salvando...");
      const res = await fetch(`/api/users/${user.id}/face`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descriptor: Array.from(det.descriptor) }),
      });
      if (!res.ok) throw new Error();
      setDescriptor(new Float32Array(det.descriptor));
      setHasDescriptor(true);
      setEnrollPhase("done");
      setEnrollMsg("Rosto cadastrado com sucesso!");
      setTimeout(stopEnrollCamera, 1600);
    } catch {
      setEnrollMsg("Erro ao salvar. Tente novamente.");
      setEnrollPhase("ready");
    }
  }

  // Cleanup on unmount
  useEffect(() => () => { stopClockCamera(); enrollStreamRef.current?.getTracks().forEach((t) => t.stop()); }, []);

  const dateLabel = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="mx-auto max-w-lg space-y-4">
      {/* Page header */}
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-emerald-500"
          style={{ background: "color-mix(in srgb, #10b981 10%, var(--color-surface-elevated))", borderColor: "color-mix(in srgb, #10b981 25%, transparent)" }}>
          <Icon name="scanFace" className="h-5 w-5" />
        </span>
        <div>
          <h1 className="page-title">Ponto facial</h1>
          <p className="page-subtitle capitalize">{dateLabel}</p>
        </div>
      </div>

      {/* ── ENROLLMENT section ── */}
      {hasDescriptor === null ? (
        /* Loading */
        <div className="industrial-panel p-4">
          <div className="flex items-center gap-3">
            <div className="skeleton h-2.5 w-2.5 rounded-full" />
            <div className="skeleton h-3 w-36 rounded" />
          </div>
        </div>
      ) : !hasDescriptor ? (
        /* No face registered — show enroll CTA */
        <div className="industrial-panel overflow-hidden" style={{ borderColor: "color-mix(in srgb, #f59e0b 30%, var(--color-border))" }}>
          <div className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
                <Icon name="scanFace" className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Rosto não cadastrado</p>
                <p className="text-xs text-muted">Cadastre para usar o ponto.</p>
              </div>
            </div>
            {!enrolling && (
              <button
                type="button"
                disabled={!modelsLoaded}
                onClick={() => void startEnrollCamera()}
                className="btn-primary shrink-0 text-sm disabled:opacity-50"
              >
                <Icon name="camera" className="h-4 w-4" />
                {modelsLoaded ? "Cadastrar rosto" : "Carregando..."}
              </button>
            )}
          </div>

          {/* Enrollment camera (inline) */}
          {enrolling && (
            <div className="border-t border-border p-4 space-y-3">
              <div className="relative mx-auto overflow-hidden rounded-2xl bg-black" style={{ maxWidth: 280, aspectRatio: "1" }}>
                <video ref={enrollVideoRef} className="h-full w-full object-cover" playsInline muted autoPlay style={{ transform: "scaleX(-1)" }} />
                <div className="absolute top-2 left-2 h-6 w-6 border-t-2 border-l-2 border-white/60 rounded-tl-md" />
                <div className="absolute top-2 right-2 h-6 w-6 border-t-2 border-r-2 border-white/60 rounded-tr-md" />
                <div className="absolute bottom-2 left-2 h-6 w-6 border-b-2 border-l-2 border-white/60 rounded-bl-md" />
                <div className="absolute bottom-2 right-2 h-6 w-6 border-b-2 border-r-2 border-white/60 rounded-br-md" />
                {enrollPhase === "opening" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <Icon name="rotateCw" className="h-6 w-6 animate-spin text-white/60" />
                  </div>
                )}
                {enrollPhase === "done" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/20">
                    <svg viewBox="0 0 24 24" className="h-14 w-14 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>
                  </div>
                )}
              </div>
              {enrollMsg && (
                <p className={`text-center text-xs font-medium ${enrollPhase === "done" ? "text-emerald-600 dark:text-emerald-400" : enrollMsg.includes("Erro") || enrollMsg.includes("não") ? "text-red-500" : "text-muted"}`}>
                  {enrollMsg}
                </p>
              )}
              <div className="flex justify-center gap-2">
                {enrollPhase === "ready" && (
                  <button type="button" className="btn-primary text-sm" onClick={() => void captureEnroll()}>
                    <Icon name="camera" className="h-4 w-4" /> Capturar
                  </button>
                )}
                {(enrollPhase === "capturing" || enrollPhase === "saving") && (
                  <button type="button" className="btn-primary text-sm" disabled>
                    <Icon name="rotateCw" className="h-4 w-4 animate-spin" /> Processando...
                  </button>
                )}
                <button type="button" className="btn-ghost text-sm" onClick={stopEnrollCamera}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Face registered — small status pill + optional re-enroll */
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 rounded-full border px-3 py-1.5"
            style={{ background: "color-mix(in srgb, #10b981 8%, var(--color-surface-elevated))", borderColor: "color-mix(in srgb, #10b981 22%, transparent)" }}>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Rosto cadastrado</span>
          </div>
          {!enrolling && (
            <button
              type="button"
              disabled={!modelsLoaded}
              onClick={() => void startEnrollCamera()}
              className="text-xs text-muted hover:text-foreground underline underline-offset-2 disabled:opacity-40"
            >
              Recadastrar
            </button>
          )}
          {/* Re-enroll camera (inline, compact) */}
          {enrolling && (
            <button type="button" className="text-xs text-muted hover:text-foreground underline underline-offset-2" onClick={stopEnrollCamera}>
              Cancelar cadastro
            </button>
          )}
        </div>
      )}

      {/* Re-enroll camera panel (when has descriptor but wants to redo) */}
      {enrolling && hasDescriptor && (
        <div className="industrial-panel overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold">Recadastrar rosto</span>
            <button type="button" className="btn-icon" onClick={stopEnrollCamera}><Icon name="x" className="h-4 w-4" /></button>
          </div>
          <div className="p-4 space-y-3">
            <div className="relative mx-auto overflow-hidden rounded-2xl bg-black" style={{ maxWidth: 280, aspectRatio: "1" }}>
              <video ref={enrollVideoRef} className="h-full w-full object-cover" playsInline muted autoPlay style={{ transform: "scaleX(-1)" }} />
              <div className="absolute top-2 left-2 h-6 w-6 border-t-2 border-l-2 border-white/60 rounded-tl-md" />
              <div className="absolute top-2 right-2 h-6 w-6 border-t-2 border-r-2 border-white/60 rounded-tr-md" />
              <div className="absolute bottom-2 left-2 h-6 w-6 border-b-2 border-l-2 border-white/60 rounded-bl-md" />
              <div className="absolute bottom-2 right-2 h-6 w-6 border-b-2 border-r-2 border-white/60 rounded-br-md" />
              {enrollPhase === "opening" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <Icon name="rotateCw" className="h-6 w-6 animate-spin text-white/60" />
                </div>
              )}
              {enrollPhase === "done" && (
                <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/20">
                  <svg viewBox="0 0 24 24" className="h-14 w-14 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>
                </div>
              )}
            </div>
            {enrollMsg && (
              <p className={`text-center text-xs font-medium ${enrollPhase === "done" ? "text-emerald-600 dark:text-emerald-400" : enrollMsg.includes("Erro") || enrollMsg.includes("não") ? "text-red-500" : "text-muted"}`}>
                {enrollMsg}
              </p>
            )}
            <div className="flex justify-center gap-2">
              {enrollPhase === "ready" && (
                <button type="button" className="btn-primary text-sm" onClick={() => void captureEnroll()}>
                  <Icon name="camera" className="h-4 w-4" /> Capturar
                </button>
              )}
              {(enrollPhase === "capturing" || enrollPhase === "saving") && (
                <button type="button" className="btn-primary text-sm" disabled>
                  <Icon name="rotateCw" className="h-4 w-4 animate-spin" /> Processando...
                </button>
              )}
              <button type="button" className="btn-ghost text-sm" onClick={stopEnrollCamera}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── ENTRADA / SAÍDA buttons ── */}
      {hasDescriptor && !enrolling && (
        <div className="grid grid-cols-2 gap-3">
          {/* ENTRADA */}
          <button
            type="button"
            disabled={!modelsLoaded || (clockPhase !== "idle" && selectedType !== "ENTRADA")}
            onClick={() => {
              if (selectedType === "ENTRADA" && clockPhase !== "idle") stopClockCamera();
              else if (clockPhase === "idle") void startClockCamera("ENTRADA");
            }}
            className={`relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-200 disabled:opacity-50 active:scale-[0.97] ${
              selectedType === "ENTRADA" && clockPhase !== "idle"
                ? "border-emerald-500/50 bg-emerald-500/10 ring-2 ring-emerald-500/20"
                : "border-border bg-surface-elevated hover:border-emerald-500/30 hover:bg-emerald-500/5"
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${selectedType === "ENTRADA" && clockPhase !== "idle" ? "bg-emerald-500/25" : "bg-emerald-500/10"}`}>
                <Icon name="logIn" className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </span>
              <span className="text-base font-bold text-foreground">Entrada</span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              {!modelsLoaded ? "Carregando modelos..." :
                selectedType === "ENTRADA" && clockPhase !== "idle" ? "Câmera aberta — olhe para a tela" :
                "Registrar entrada de trabalho"}
            </p>
          </button>

          {/* SAÍDA */}
          <button
            type="button"
            disabled={!modelsLoaded || (clockPhase !== "idle" && selectedType !== "SAIDA")}
            onClick={() => {
              if (selectedType === "SAIDA" && clockPhase !== "idle") stopClockCamera();
              else if (clockPhase === "idle") void startClockCamera("SAIDA");
            }}
            className={`relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-200 disabled:opacity-50 active:scale-[0.97] ${
              selectedType === "SAIDA" && clockPhase !== "idle"
                ? "border-amber-500/50 bg-amber-500/10 ring-2 ring-amber-500/20"
                : "border-border bg-surface-elevated hover:border-amber-500/30 hover:bg-amber-500/5"
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${selectedType === "SAIDA" && clockPhase !== "idle" ? "bg-amber-500/25" : "bg-amber-500/10"}`}>
                <Icon name="logOut" className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </span>
              <span className="text-base font-bold text-foreground">Saída</span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              {!modelsLoaded ? "Carregando modelos..." :
                selectedType === "SAIDA" && clockPhase !== "idle" ? "Câmera aberta — olhe para a tela" :
                "Registrar saída de trabalho"}
            </p>
          </button>
        </div>
      )}

      {/* ── CLOCK CAMERA PANEL ── */}
      {selectedType && clockPhase !== "idle" && (
        <div className="industrial-panel overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full animate-pulse ${
                clockPhase === "success" ? "bg-emerald-500" :
                clockPhase === "no-match" || clockPhase === "error" ? "bg-red-500" :
                clockPhase === "detecting" ? "bg-amber-500" : "bg-muted/50"
              }`} />
              <span className="text-sm font-semibold text-foreground">
                Registrando {selectedType === "ENTRADA" ? "entrada" : "saída"}
              </span>
            </div>
            <button type="button" className="btn-icon" onClick={stopClockCamera}>
              <Icon name="x" className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-col items-center gap-4 p-5">
            {/* Camera viewport */}
            <div
              className={`relative overflow-hidden rounded-2xl border-4 transition-colors duration-300 ${
                clockPhase === "success" ? "border-emerald-500" :
                clockPhase === "no-match" ? "border-red-400" :
                clockPhase === "detecting" ? "border-amber-400" : "border-border/60"
              }`}
              style={{ width: "min(100%, 260px)", aspectRatio: "1" }}
            >
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                playsInline muted autoPlay
                style={{ transform: "scaleX(-1)" }}
              />
              {/* Corner guides */}
              {clockPhase !== "success" && clockPhase !== "no-match" && (
                <>
                  <div className="absolute top-2 left-2 h-6 w-6 border-t-2 border-l-2 border-white/50 rounded-tl-md" />
                  <div className="absolute top-2 right-2 h-6 w-6 border-t-2 border-r-2 border-white/50 rounded-tr-md" />
                  <div className="absolute bottom-2 left-2 h-6 w-6 border-b-2 border-l-2 border-white/50 rounded-bl-md" />
                  <div className="absolute bottom-2 right-2 h-6 w-6 border-b-2 border-r-2 border-white/50 rounded-br-md" />
                </>
              )}
              {/* Overlays */}
              {clockPhase === "opening" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60">
                  <Icon name="rotateCw" className="h-6 w-6 animate-spin text-white/60" />
                  <p className="text-xs text-white/50">Iniciando câmera...</p>
                </div>
              )}
              {clockPhase === "success" && (
                <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/25">
                  <svg viewBox="0 0 24 24" className="h-16 w-16 text-emerald-400 drop-shadow-lg" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>
                </div>
              )}
              {clockPhase === "no-match" && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-500/20">
                  <Icon name="x" className="h-10 w-10 text-red-400" />
                </div>
              )}
              {clockPhase === "error" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-3 text-center">
                  <p className="text-xs text-red-400">{clockMsg}</p>
                </div>
              )}
            </div>

            {/* Status text */}
            <p className={`text-sm font-medium text-center ${
              clockPhase === "success" ? "text-emerald-600 dark:text-emerald-400" :
              clockPhase === "no-match" || clockPhase === "error" ? "text-red-500" :
              clockPhase === "detecting" ? "text-amber-600 dark:text-amber-400" : "text-muted"
            }`}>
              {clockPhase === "success" ? clockMsg :
               clockPhase === "no-match" ? clockMsg :
               clockPhase === "detecting" ? "Reconhecendo..." :
               clockPhase === "opening" ? "Iniciando..." :
               "Olhe para a câmera"}
            </p>
          </div>
        </div>
      )}

      {/* ── TODAY'S RECORDS ── */}
      <div className="industrial-panel overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold text-foreground">Registros de hoje</span>
          <button type="button" onClick={() => void loadRecords()} className="btn-icon" title="Atualizar">
            <Icon name="rotateCw" className={`h-3.5 w-3.5 ${recordsLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
        {recordsLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2].map((i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 px-4 py-7 text-center">
            <Icon name="clock" className="h-7 w-7 text-muted/30" />
            <p className="text-sm text-muted">Nenhum registro hoje.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {records.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${r.type === "ENTRADA" ? "bg-emerald-500/15" : "bg-amber-500/15"}`}>
                  <Icon name={r.type === "ENTRADA" ? "logIn" : "logOut"} className={`h-4 w-4 ${r.type === "ENTRADA" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`} />
                </span>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${r.type === "ENTRADA" ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
                    {r.type === "ENTRADA" ? "Entrada" : "Saída"}
                  </p>
                </div>
                <span className="text-sm font-medium text-foreground tabular-nums">{fmtTime(r.recordedAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Admin / Gerente view ────────────────────────────
function AdminPontoView({ user }: { user: SessionUser }) {
  const [records, setRecords] = useState<PontoRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [teamId, setTeamId] = useState("");

  const isAdminRole = user.role === "ADMIN";

  useEffect(() => {
    if (!isAdminRole) return;
    fetch("/api/teams")
      .then((r) => r.json())
      .then((d) => {
        const list = (d.teams ?? []) as { id: string; name: string }[];
        setTeams(list);
        if (list[0]) setTeamId(list[0].id);
      });
  }, [isAdminRole]);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ date });
    if (isAdminRole && teamId) params.set("teamId", teamId);
    const res = await fetch(`/api/ponto?${params}`);
    const data = await res.json() as { records: PontoRecord[] };
    setRecords(data.records ?? []);
    setLoading(false);
  }, [date, teamId, isAdminRole]);

  useEffect(() => { void loadRecords(); }, [loadRecords]);

  const kioskUrl = typeof window !== "undefined"
    ? `${window.location.origin}/kiosk?teamId=${isAdminRole ? teamId : user.teamId ?? ""}`
    : "";

  return (
    <>
      <div className="page-header">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-emerald-500"
            style={{ background: "color-mix(in srgb, #10b981 10%, var(--color-surface-elevated))", borderColor: "color-mix(in srgb, #10b981 25%, transparent)" }}>
            <Icon name="scanFace" className="h-5 w-5" />
          </span>
          <div>
            <h1 className="page-title">Ponto facial</h1>
            <p className="page-subtitle">Registros de entrada e saída por reconhecimento facial</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {isAdminRole && teams.length > 0 && (
          <div>
            <label className="form-label">Equipe</label>
            <select className="industrial-input" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="form-label">Data</label>
          <input type="date" className="industrial-input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <button type="button" className="btn-ghost" onClick={() => void loadRecords()}>
          <Icon name="rotateCw" className="h-4 w-4" />
          Atualizar
        </button>
      </div>

      {(isAdminRole ? teamId : user.teamId) && (
        <div className="industrial-panel flex items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted">Link do quiosque</p>
            <code className="block truncate text-xs text-foreground">{kioskUrl}</code>
          </div>
          <a href={kioskUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost shrink-0 text-xs">
            <Icon name="play" className="h-3.5 w-3.5" />
            Abrir quiosque
          </a>
        </div>
      )}

      {(isAdminRole ? teamId : user.teamId) && (
        <TeamFaceEnrollmentPanel
          teamId={(isAdminRole ? teamId : user.teamId)!}
          showSettings={user.role === "ADV"}
        />
      )}

      <div className="industrial-panel overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-muted">Carregando...</p>
        ) : records.length === 0 ? (
          <p className="p-6 text-sm text-muted">Nenhum registro para esta data.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left text-xs font-medium text-muted">Colaborador</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted">Tipo</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted">Horário</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted">Confiança</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-surface-elevated/40 transition-colors">
                  <td className="px-4 py-2.5 font-medium">{r.user.name}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${r.type === "ENTRADA" ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600"}`}>
                      {r.type === "ENTRADA" ? "Entrada" : "Saída"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted">
                    {new Date(r.recordedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </td>
                  <td className="px-4 py-2.5 text-muted">
                    {r.confidence !== null ? `${(r.confidence * 100).toFixed(0)}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

// ─── Page router ─────────────────────────────────────
export default function PontoPage() {
  const { user } = useSession();
  if (!user) return null;

  const isSelfService = user.role === "COLABORADOR" || user.role === "PESQUISADOR";
  return isSelfService ? <SelfServicePonto user={user} /> : <AdminPontoView user={user} />;
}
