"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ClientDuplicateMatch } from "@/lib/client-duplicates";

export function ClientDuplicateBanner({
  clientId,
  cpf,
  teseId,
}: {
  clientId?: string;
  cpf?: string | null;
  teseId?: string | null;
}) {
  const [sameAction, setSameAction] = useState<ClientDuplicateMatch[]>([]);
  const [otherActions, setOtherActions] = useState<ClientDuplicateMatch[]>([]);

  useEffect(() => {
    if (clientId) {
      fetch(`/api/clients/${clientId}/duplicates`)
        .then((r) => r.json())
        .then((data) => {
          if (data.sameAction) setSameAction(data.sameAction);
          if (data.otherActions) setOtherActions(data.otherActions);
        })
        .catch(() => {});
      return;
    }

    if (!cpf?.trim()) {
      setSameAction([]);
      setOtherActions([]);
      return;
    }

    const timer = setTimeout(() => {
      fetch("/api/clients/check-duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf, teseId: teseId || null }),
      })
        .then((r) => r.json())
        .then((data) => {
          setSameAction(data.sameAction ?? []);
          setOtherActions(data.otherActions ?? []);
        })
        .catch(() => {});
    }, 400);

    return () => clearTimeout(timer);
  }, [clientId, cpf, teseId]);

  if (sameAction.length === 0 && otherActions.length === 0) return null;

  return (
    <div className="space-y-2">
      {sameAction.length > 0 && (
        <div className="rounded-[var(--radius-ui)] border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm">
          <p className="font-semibold text-red-700 dark:text-red-300">
            Duplicata nesta ação (mesmo CPF)
          </p>
          <ul className="mt-2 space-y-1">
            {sameAction.map((item) => (
              <li key={item.id}>
                <Link href={`/clients/${item.id}`} className="text-primary hover:underline">
                  {item.name}
                  {item.cod ? ` (${item.cod})` : ""}
                </Link>
                {item.teseName ? <span className="text-muted"> — {item.teseName}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {otherActions.length > 0 && (
        <div className="rounded-[var(--radius-ui)] border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm">
          <p className="font-semibold text-amber-900 dark:text-amber-200">
            Este cliente também participa de outra ação
          </p>
          <p className="mt-1 text-xs text-muted">Apenas informativo — não bloqueia o cadastro.</p>
          <ul className="mt-2 space-y-1">
            {otherActions.map((item) => (
              <li key={item.id}>
                <Link href={`/clients/${item.id}`} className="text-primary hover:underline">
                  {item.name}
                  {item.cod ? ` (${item.cod})` : ""}
                </Link>
                <span className="text-muted">
                  {" "}
                  — {item.teseName ?? "Sem tese"}
                  {item.teamName ? ` · ${item.teamName}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
