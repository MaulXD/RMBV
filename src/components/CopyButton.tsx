"use client";

import { useState } from "react";
import { Icon } from "./ui/Icon";

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
      className={
        compact
          ? "btn-icon disabled:cursor-not-allowed"
          : "btn-ghost shrink-0 disabled:opacity-40 px-2.5 py-2"
      }
      title={label}
      aria-label={label}
    >
      {copied ? (
        <Icon name="check" className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <Icon name="copy" className="h-4 w-4" />
      )}
      {!compact && <span className="text-xs">{copied ? "Copiado" : "Copiar"}</span>}
    </button>
  );
}
