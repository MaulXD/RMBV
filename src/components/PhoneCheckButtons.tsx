"use client";

import { useState } from "react";
import type { PhoneCheckResult } from "@prisma/client";
import { IconTooltipButton } from "./IconTooltipButton";

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 12.5l2.5 2.5 5.5-6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InvalidIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M9 9l6 6M15 9l-6 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function NoAnswerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6.5 4.8h11l1.8 4.2-7.3 4.2-7.3-4.2 1.8-4.2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M5 18.5c2.2-1.2 4.5-1.8 7-1.8s4.8.6 7 1.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M4 4l16 16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

const OPTIONS: {
  result: PhoneCheckResult;
  label: string;
  activeClass: string;
  Icon: () => React.JSX.Element;
}[] = [
  {
    result: "VALIDO",
    label: "Número válido",
    activeClass: "border-emerald-600 bg-emerald-600/15 text-emerald-700 dark:text-emerald-400",
    Icon: CheckIcon,
  },
  {
    result: "INVALIDO",
    label: "Número inválido",
    activeClass: "border-red-600 bg-red-600/15 text-red-700 dark:text-red-400",
    Icon: InvalidIcon,
  },
  {
    result: "NAO_ATENDE",
    label: "Ninguém atende",
    activeClass: "border-amber-600 bg-amber-600/15 text-amber-700 dark:text-amber-400",
    Icon: NoAnswerIcon,
  },
];

export function PhoneCheckButtons({
  clientId,
  phoneKey,
  phoneValue,
  currentResult,
  disabled,
  onRecorded,
}: {
  clientId: string;
  phoneKey: string;
  phoneValue: string;
  currentResult?: PhoneCheckResult | null;
  disabled?: boolean;
  onRecorded?: () => void;
}) {
  const [loading, setLoading] = useState<PhoneCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function record(result: PhoneCheckResult) {
    if (!phoneValue.trim() || disabled) return;
    setLoading(result);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/history/phone-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneKey, result }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao registrar");
      onRecorded?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao registrar");
    } finally {
      setLoading(null);
    }
  }

  const noNumber = !phoneValue.trim();

  return (
    <div className="flex shrink-0 flex-col items-end gap-0.5">
      {error && (
        <span className="max-w-[12rem] text-right text-[10px] text-red-600 dark:text-red-400">
          {error}
        </span>
      )}
      <div className="flex gap-0.5">
      {OPTIONS.map(({ result, label, activeClass, Icon }) => (
        <IconTooltipButton
          key={result}
          label={label}
          disabled={disabled || noNumber || loading !== null}
          active={currentResult === result}
          activeClassName={activeClass}
          onClick={() => record(result)}
        >
          {loading === result ? (
            <span className="text-[10px]">…</span>
          ) : (
            <Icon />
          )}
        </IconTooltipButton>
      ))}
      </div>
    </div>
  );
}
