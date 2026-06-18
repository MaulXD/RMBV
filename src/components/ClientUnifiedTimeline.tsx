"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "./ui/Icon";

type TimelineItem = {
  id: string;
  at: string;
  kind: string;
  title: string;
  body?: string;
  href?: string;
};

const KIND_ICON = {
  history: "clock",
  document: "fileText",
  task: "kanban",
  chamado: "ticket",
} as const;

export function ClientUnifiedTimeline({ clientId }: { clientId: string }) {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/clients/${clientId}/unified-timeline`)
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .finally(() => setLoading(false));
  }, [clientId]);

  if (loading) return <p className="text-sm text-muted">Carregando timeline…</p>;

  if (items.length === 0) {
    return <p className="text-sm text-muted">Nenhum evento registrado ainda.</p>;
  }

  return (
    <ol className="space-y-3">
      {items.map((item) => {
        const icon = KIND_ICON[item.kind as keyof typeof KIND_ICON] ?? "circleDot";
        const content = (
          <div className="flex gap-3 rounded-xl border border-border/70 bg-surface-elevated p-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon name={icon} className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">{item.title}</p>
                <time className="text-[10px] text-muted">
                  {new Date(item.at).toLocaleString("pt-BR")}
                </time>
              </div>
              {item.body && <p className="mt-0.5 text-xs text-muted">{item.body}</p>}
            </div>
          </div>
        );
        return (
          <li key={item.id}>
            {item.href ? (
              <Link href={item.href} className="block transition-opacity hover:opacity-90">
                {content}
              </Link>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ol>
  );
}
