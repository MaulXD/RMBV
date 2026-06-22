export type PontoType = "ENTRADA" | "SAIDA" | "INTERVALO_INICIO" | "INTERVALO_FIM";

export type ClockPhase =
  | "idle"
  | "opening"
  | "liveness"
  | "ready"
  | "detecting"
  | "verified"
  | "submitting"
  | "success"
  | "no-match"
  | "error";

export type PontoRecord = {
  id: string;
  type: PontoType;
  confidence: number | null;
  recordedAt: string;
  user: { id: string; name: string; email: string };
};

export function fmtPontoTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
