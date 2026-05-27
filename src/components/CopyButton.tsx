"use client";

import { useState } from "react";

export function CopyButton({
  value,
  label = "Copiar",
  compact = false,
}: {
  value: string;
  label?: string;
  compact?: boolean;
}) {
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
      className={`btn-ghost shrink-0 disabled:opacity-40 ${
        compact ? "h-8 min-w-8 px-2 py-1 text-[11px]" : "px-2 py-2 text-xs"
      }`}
      title={label}
    >
      {copied ? "✓" : compact ? "⧉" : "Copiar"}
    </button>
  );
}
