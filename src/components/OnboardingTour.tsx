"use client";

import { useEffect, useState } from "react";
import { Icon } from "./ui/Icon";

export function OnboardingTour() {
  const [nextStep, setNextStep] = useState<{ title: string; body: string } | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    fetch("/api/onboarding")
      .then((r) => r.json())
      .then((d) => {
        setDismissed(d.dismissed ?? false);
        setNextStep(d.nextStep ?? null);
      })
      .catch(() => {});
  }, []);

  if (dismissed || !nextStep) return null;

  async function completeStep(dismiss?: boolean) {
    await fetch("/api/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: nextStep!.title, dismissed: dismiss ?? false }),
    });
    if (dismiss) {
      setDismissed(true);
      setNextStep(null);
      return;
    }
    const res = await fetch("/api/onboarding");
    const d = await res.json();
    setNextStep(d.nextStep ?? null);
    if (!d.nextStep) setDismissed(true);
  }

  return (
    <div className="mb-4 rounded-xl border border-primary/30 bg-primary/8 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Icon name="lightbulb" className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Dica rápida</p>
          <p className="mt-0.5 font-semibold">{nextStep.title}</p>
          <p className="mt-1 text-sm text-muted">{nextStep.body}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-primary px-3 py-1.5 text-xs" onClick={() => void completeStep()}>
              Entendi
            </button>
            <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => void completeStep(true)}>
              Não mostrar mais
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
