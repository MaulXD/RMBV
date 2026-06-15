"use client";

import { useEffect, useState } from "react";
import type { ClientProfileData } from "@/lib/client-fields";
import type { ExtractionResult } from "@/lib/extract-types";
import { ClientExtractionSection } from "./ClientExtractionSection";

export function ClientRawExtractPanel({
  clientId,
  initialText,
  onUpdated,
  disabled = false,
  aiAvailable = true,
  aiHint,
}: {
  clientId: string;
  initialText: string | null;
  onUpdated: (client: ClientProfileData) => void;
  disabled?: boolean;
  aiAvailable?: boolean;
  aiHint?: string | null;
}) {
  const [rawText, setRawText] = useState(initialText ?? "");
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRawText(initialText ?? "");
  }, [initialText, clientId]);

  async function saveTextOnly() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawExtractText: rawText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao salvar texto");
      onUpdated(data.client);
      setMessage("Texto salvo.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function handleExtract() {
    if (!rawText.trim()) return;
    setExtracting(true);
    setError(null);
    setMessage(null);
    try {
      const extractRes = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText }),
      });
      const extracted = await extractRes.json();
      if (!extractRes.ok) throw new Error(extracted.error ?? "Falha na extração");

      const data = extracted as ExtractionResult;
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          name: data.name || undefined,
          rawExtractText: rawText,
        }),
      });
      const patchData = await res.json();
      if (!res.ok) throw new Error(patchData.error ?? "Falha ao aplicar dados");
      onUpdated(patchData.client);
      setMessage("Dados extraídos e aplicados ao cadastro.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro na extração");
    } finally {
      setExtracting(false);
    }
  }

  return (
    <div className="space-y-3">
      <ClientExtractionSection
        rawText={rawText}
        onRawTextChange={setRawText}
        onExtract={handleExtract}
        extracting={extracting}
        aiAvailable={aiAvailable && !disabled}
        aiHint={aiHint}
      />
      {!disabled && (
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="btn-ghost"
            onClick={saveTextOnly}
            disabled={saving || extracting}
          >
            {saving ? "Salvando..." : "Salvar texto"}
          </button>
        </div>
      )}
      {error && <p className="alert alert-error">{error}</p>}
      {message && <p className="alert alert-success">{message}</p>}
    </div>
  );
}
