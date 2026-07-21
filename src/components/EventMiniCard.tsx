"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

type CalendarEvent = {
  id: string;
  title: string;
  startsAt: string;
  color?: string | null;
  client?: { name: string } | null;
};

function getColorDot(color?: string | null): string {
  switch (color) {
    case "green":
      return "bg-green-500";
    case "red":
      return "bg-red-500";
    case "amber":
      return "bg-amber-500";
    case "violet":
      return "bg-violet-500";
    default:
      return "bg-blue-500";
  }
}

function formatEventDate(iso: string): string {
  const d = new Date(iso);
  const weekday = d.toLocaleDateString("pt-BR", { weekday: "short" });
  const day = d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${weekday}, ${day} — ${time}`;
}

export function EventMiniCard() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const now = new Date();
    const end = new Date(now);
    end.setDate(now.getDate() + 7);

    fetch(`/api/agenda?from=${now.toISOString()}&to=${end.toISOString()}`)
      .then((r) => r.json())
      .then((d) => {
        setEvents(((d as { events?: CalendarEvent[] }).events ?? []).slice(0, 3));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded || events.length === 0) return null;

  return (
    <div className="panel-solid p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
          <Icon name="calendar" className="h-3.5 w-3.5 shrink-0" />
          Próximos eventos
        </div>
        <Link href="/agenda" className="text-[11px] text-primary hover:underline">
          Ver todos
        </Link>
      </div>
      <div className="flex flex-col gap-2">
        {events.map((evt) => (
          <div key={evt.id} className="flex items-start gap-2">
            <span
              className={[
                "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                getColorDot(evt.color),
              ].join(" ")}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground">
                {evt.title}
              </p>
              <p className="text-[10px] text-muted">{formatEventDate(evt.startsAt)}</p>
              {evt.client && (
                <p className="text-[10px] text-muted">{evt.client.name}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
