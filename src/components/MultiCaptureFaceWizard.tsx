"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./ui/Icon";
import { LGPD_FACE_CONSENT_TEXT } from "@/lib/lgpd-face-consent";
import { ENROLLMENT_CAPTURE_COUNT } from "@/lib/face-enrollment-capture";
import { FaceEnrollmentCaptureView } from "./FaceEnrollmentCaptureView";

const MODEL_URL = "/models";

type Phase = "instructions" | "consent" | "camera" | "upload" | "done";
type WizardStart = "instructions" | "consent" | "camera";

export function MultiCaptureFaceWizard({
  userId,
  requireConsent,
  allowUpload = false,
  startAt = "instructions",
  onComplete,
}: {
  userId: string;
  requireConsent: boolean;
  allowUpload?: boolean;
  /** Pula instruções/consentimento — útil no recadastro. */
  startAt?: WizardStart;
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState<Phase>(startAt);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelsError, setModelsError] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [consent, setConsent] = useState(false);
  const [mode, setMode] = useState<"camera" | "upload">("camera");
  const imgRef = useRef<HTMLImageElement>(null);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);

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

  const saveDescriptors = useCallback(async (descriptors: number[][]) => {
    setSaving(true);
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
      return;
    }
    setPhase("done");
    setStatusMsg("Cadastro facial concluído!");
    setTimeout(onComplete, 1200);
  }, [userId, onComplete]);

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
            <li>Primeiro faça a <strong className="text-foreground">prova de vida</strong>: feche os olhos por um momento e abra ao ouvir o sinal.</li>
            <li>Siga a <strong className="text-foreground">seta na câmera</strong> em cada pose (frente, cima e baixo).</li>
            <li>Serão <strong className="text-foreground">{ENROLLMENT_CAPTURE_COUNT} poses</strong>: frente, cima e baixo.</li>
            <li>A câmera <strong className="text-foreground">captura sozinha</strong> quando a pose estiver correta.</li>
            <li>Siga o feedback na tela até completar as {ENROLLMENT_CAPTURE_COUNT} capturas.</li>
          </ol>
        </div>
        {modelsError && <p className="text-xs text-red-500">{statusMsg}</p>}
        <button
          type="button"
          className="btn-primary w-full"
          disabled={!modelsLoaded || modelsError}
          onClick={() => {
            if (requireConsent) setPhase("consent");
            else setPhase("camera");
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
            onClick={() => setPhase("camera")}
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
            onClick={() => { setMode("camera"); setPhase("camera"); }}
          >
            Câmera ({ENROLLMENT_CAPTURE_COUNT} poses)
          </button>
          <button
            type="button"
            className={`btn-ghost flex-1 text-xs ${mode === "upload" ? "border-primary text-primary" : ""}`}
            onClick={() => { setMode("upload"); setPhase("upload"); }}
          >
            Upload (1 foto)
          </button>
        </div>
      )}

      {phase === "camera" && mode === "camera" && (
        <FaceEnrollmentCaptureView
          saving={saving}
          onComplete={saveDescriptors}
        />
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
