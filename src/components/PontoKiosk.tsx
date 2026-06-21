"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type KnownUser = { id: string; name: string; descriptor: Float32Array };
type PontoType = "ENTRADA" | "SAIDA" | "INTERVALO_INICIO" | "INTERVALO_FIM";
type PontoResult = { userName: string; type: PontoType; confidence: number };

const TYPE_LABEL: Record<PontoType, string> = {
  ENTRADA: "Entrada registrada",
  SAIDA: "Saída registrada",
  INTERVALO_INICIO: "Início de intervalo registrado",
  INTERVALO_FIM: "Fim de intervalo registrado",
};

function euclideanDistance(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i]! - b[i]!) ** 2;
  return Math.sqrt(sum);
}

const THRESHOLD = 0.5;
const MIN_CONFIDENCE = 0.65;
const MODEL_URL = "/models";

export function PontoKiosk({ teamId }: { teamId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"loading-models" | "loading-camera" | "ready" | "detecting" | "success" | "no-match" | "error">("loading-models");
  const [result, setResult] = useState<PontoResult | null>(null);
  const [knownUsers, setKnownUsers] = useState<KnownUser[]>([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const detectingRef = useRef(false);
  const cooldownRef = useRef(false);

  // Load face-api models
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
      } catch (e) {
        if (!cancelled) {
          setErrorMsg("Falha ao carregar modelos de reconhecimento.");
          setStatus("error");
        }
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  // Load known users
  useEffect(() => {
    if (!teamId) return;
    fetch(`/api/ponto/faces?teamId=${teamId}`)
      .then((r) => r.json())
      .then((data) => {
        const users: KnownUser[] = (data.users ?? []).map((u: { id: string; name: string; faceDescriptor: number[] }) => ({
          id: u.id,
          name: u.name,
          descriptor: new Float32Array(u.faceDescriptor as number[]),
        }));
        setKnownUsers(users);
      });
  }, [teamId]);

  // Start camera
  useEffect(() => {
    if (!modelsLoaded) return;
    let stream: MediaStream | null = null;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 } })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play();
          setStatus("ready");
        }
      })
      .catch(() => {
        setErrorMsg("Câmera não autorizada. Permita o acesso à câmera.");
        setStatus("error");
      });
    return () => { stream?.getTracks().forEach((t) => t.stop()); };
  }, [modelsLoaded]);

  const detectAndMatch = useCallback(async () => {
    if (detectingRef.current || cooldownRef.current || !videoRef.current || !modelsLoaded) return;
    if (status !== "ready") return;

    detectingRef.current = true;
    setStatus("detecting");

    try {
      const faceapi = await import("@vladmandic/face-api");
      const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
      const detection = await faceapi
        .detectSingleFace(videoRef.current, options)
        .withFaceLandmarks(true)
        .withFaceDescriptor();

      if (!detection) {
        setStatus("ready");
        detectingRef.current = false;
        return;
      }

      if (knownUsers.length === 0) {
        setStatus("no-match");
        setTimeout(() => setStatus("ready"), 3000);
        detectingRef.current = false;
        return;
      }

      const descriptor = detection.descriptor;
      let bestMatch: KnownUser | null = null;
      let bestDist = Infinity;
      for (const u of knownUsers) {
        const dist = euclideanDistance(descriptor, u.descriptor);
        if (dist < bestDist) { bestDist = dist; bestMatch = u; }
      }

      const confidence = Math.max(0, 1 - bestDist / THRESHOLD);

      if (!bestMatch || confidence < MIN_CONFIDENCE) {
        setStatus("no-match");
        setTimeout(() => setStatus("ready"), 3000);
        detectingRef.current = false;
        return;
      }

      // Determine type: toggle based on last record
      const todayStr = new Date().toISOString().slice(0, 10);
      const res = await fetch(`/api/ponto/last?userId=${bestMatch.id}&date=${todayStr}`);
      const data = await res.json();
      const type = (data.nextType ?? "ENTRADA") as
        | "ENTRADA"
        | "SAIDA"
        | "INTERVALO_INICIO"
        | "INTERVALO_FIM";

      await fetch("/api/ponto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: bestMatch.id, teamId, type, confidence, origin: "KIOSK" }),
      });

      setResult({ userName: bestMatch.name, type, confidence });
      setStatus("success");
      cooldownRef.current = true;
      setTimeout(() => {
        setStatus("ready");
        setResult(null);
        cooldownRef.current = false;
      }, 4000);
    } catch {
      setStatus("ready");
    }
    detectingRef.current = false;
  }, [status, modelsLoaded, knownUsers, teamId]);

  // Auto-detect loop
  useEffect(() => {
    if (status !== "ready") return;
    const interval = setInterval(() => { void detectAndMatch(); }, 800);
    return () => clearInterval(interval);
  }, [status, detectAndMatch]);

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-gray-950 text-white">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4">
        <span className="text-xs font-bold tracking-widest text-white/30 uppercase">Ponto Eletrônico</span>
        <span className="text-xs text-white/30">{new Date().toLocaleTimeString("pt-BR")}</span>
      </div>

      {/* Camera viewport */}
      <div className="relative">
        <div className={`relative overflow-hidden rounded-2xl border-4 transition-colors duration-300 ${
          status === "success" ? "border-emerald-500" :
          status === "no-match" ? "border-red-500" :
          status === "detecting" ? "border-amber-500" :
          "border-white/10"
        }`} style={{ width: 320, height: 320 }}>
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            playsInline
            muted
            autoPlay
            style={{ transform: "scaleX(-1)" }}
          />
          <canvas ref={canvasRef} className="absolute inset-0 hidden" />

          {/* Corner guides */}
          {(status === "ready" || status === "detecting") && (
            <>
              <div className="absolute top-3 left-3 h-8 w-8 border-t-2 border-l-2 border-white/60 rounded-tl-lg" />
              <div className="absolute top-3 right-3 h-8 w-8 border-t-2 border-r-2 border-white/60 rounded-tr-lg" />
              <div className="absolute bottom-3 left-3 h-8 w-8 border-b-2 border-l-2 border-white/60 rounded-bl-lg" />
              <div className="absolute bottom-3 right-3 h-8 w-8 border-b-2 border-r-2 border-white/60 rounded-br-lg" />
            </>
          )}

          {/* Overlay states */}
          {status === "loading-models" || status === "loading-camera" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-950/80">
              <svg className="h-8 w-8 animate-spin text-white/40" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <p className="text-xs text-white/40">
                {status === "loading-models" ? "Carregando modelos..." : "Iniciando câmera..."}
              </p>
            </div>
          ) : status === "error" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-950/90 p-4 text-center">
              <p className="text-sm text-red-400">{errorMsg}</p>
            </div>
          ) : status === "success" && result ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-emerald-950/80">
              <svg viewBox="0 0 24 24" className="h-12 w-12 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6 9 17l-5-5"/>
              </svg>
            </div>
          ) : status === "no-match" ? (
            <div className="absolute inset-0 flex items-center justify-center bg-red-950/60">
              <p className="text-sm font-semibold text-red-300">Não reconhecido</p>
            </div>
          ) : null}
        </div>

        {/* Status label */}
        <div className="mt-6 text-center">
          {status === "success" && result ? (
            <div className="space-y-1">
              <p className="text-2xl font-black text-emerald-400">{result.userName}</p>
              <p className="text-sm text-white/60">
                {TYPE_LABEL[result.type]} •{" "}
                {new Date().toLocaleTimeString("pt-BR")}
              </p>
            </div>
          ) : status === "ready" ? (
            <p className="text-sm text-white/40">
              {knownUsers.length === 0
                ? "Nenhum rosto cadastrado nesta equipe"
                : "Olhe para a câmera para registrar o ponto"}
            </p>
          ) : status === "detecting" ? (
            <p className="text-sm text-amber-400">Reconhecendo...</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
