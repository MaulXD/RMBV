"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Clock, User, Ticket, X, Trash2 } from "lucide-react";
import { useRecentItems, type RecentItem } from "@/hooks/useRecentItems";

const ICONS: Record<RecentItem["type"], React.ReactNode> = {
  client: <User size={13} />,
  chamado: <Ticket size={13} />,
  "ti-chamado": <Ticket size={13} />,
};

const TYPE_LABELS: Record<RecentItem["type"], string> = {
  client: "Cliente",
  chamado: "Chamado",
  "ti-chamado": "TI",
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function RecentItemsDropdown({ collapsed }: { collapsed?: boolean }) {
  const { items, remove, clear } = useRecentItems();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (items.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Recentes"
        className={`flex items-center gap-2 w-full rounded-md px-2 py-2 text-sm transition-colors
          text-[var(--sidebar-fg-muted)] hover:bg-[var(--sidebar-item-hover)] hover:text-[var(--sidebar-fg)]
          ${open ? "bg-[var(--sidebar-item-hover)] text-[var(--sidebar-fg)]" : ""}`}
      >
        <Clock size={16} className="shrink-0" />
        {!collapsed && <span className="truncate">Recentes</span>}
        {!collapsed && (
          <span className="ml-auto text-[10px] font-semibold bg-[var(--sidebar-badge-bg)] text-[var(--sidebar-badge-fg)] rounded px-1.5 py-0.5">
            {items.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-full top-0 ml-2 z-50 w-72 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
            <span className="text-xs font-semibold text-[var(--muted-fg)] uppercase tracking-wide">Visitados recentemente</span>
            <button
              onClick={clear}
              title="Limpar"
              className="text-[var(--muted-fg)] hover:text-[var(--destructive)] transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </div>
          <ul className="py-1 max-h-80 overflow-y-auto">
            {items.map((item) => (
              <li key={`${item.type}-${item.id}`} className="group flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--muted)] transition-colors">
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 flex-1 min-w-0"
                >
                  <span className="shrink-0 text-[var(--muted-fg)]">{ICONS[item.type]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--fg)] truncate">{item.name}</p>
                    {item.subtitle && (
                      <p className="text-[11px] text-[var(--muted-fg)] truncate">{item.subtitle}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-semibold text-[var(--muted-fg)] bg-[var(--muted)] rounded px-1 py-0.5">
                      {TYPE_LABELS[item.type]}
                    </span>
                    <span className="text-[10px] text-[var(--muted-fg)]">{timeAgo(item.visitedAt)}</span>
                  </div>
                </Link>
                <button
                  onClick={() => remove(item.id, item.type)}
                  className="opacity-0 group-hover:opacity-100 text-[var(--muted-fg)] hover:text-[var(--destructive)] transition-all shrink-0"
                >
                  <X size={12} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
