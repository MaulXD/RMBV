"use client";

import { useState } from "react";

export function CopyButton({ value, label = "Copiar" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!value.trim()) return;
    try {
      await navigator.clipboard.writeText(value.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!value.trim()}
      className="btn-ghost shrink-0 px-2 py-2 text-xs disabled:opacity-40"
      title={label}
    >
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}
