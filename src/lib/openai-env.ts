const PLACEHOLDER_KEYS = new Set(["sk-...", "sk-your-key", ""]);

export function isOpenAiConfigured(): boolean {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return false;
  if (PLACEHOLDER_KEYS.has(key)) return false;
  if (key.startsWith("sk-") && key.length < 20) return false;
  return true;
}

export function openAiConfigHint(): string {
  if (process.env.VERCEL) {
    return "Configure OPENAI_API_KEY em Vercel → projeto rmbv → Settings → Environment Variables (Production). Depois redeploy.";
  }
  return "Copie .env.example para .env e defina OPENAI_API_KEY com sua chave da OpenAI.";
}

export function openAiMissingError(): string {
  return `Extração com IA indisponível: OPENAI_API_KEY não configurada. ${openAiConfigHint()}`;
}
