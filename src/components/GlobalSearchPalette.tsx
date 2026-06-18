"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./ui/Icon";

type SearchResult = { id: string; label: string; sub?: string; href: string };

type SearchResponse = {
  clients: SearchResult[];
  tasks: SearchResult[];
  chamados: SearchResult[];
  documents: SearchResult[];
};

export function useGlobalSearchShortcut(onOpen: () => void) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpen();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpen]);
}

export function GlobalSearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setData(null);
      return;
    }
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => setData(d))
        .catch(() => setData(null))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [query, open]);

  const sections = useMemo(() => {
    if (!data) return [];
    return [
      { key: "clients", label: "Clientes", items: data.clients, icon: "users" as const },
      { key: "tasks", label: "Tarefas", items: data.tasks, icon: "kanban" as const },
      { key: "chamados", label: "Chamados", items: data.chamados, icon: "ticket" as const },
      { key: "documents", label: "Documentos", items: data.documents, icon: "fileText" as const },
    ].filter((s) => s.items.length > 0);
  }, [data]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/50 p-4 pt-[12vh] backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div className="soft-card w-full max-w-xl overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Icon name="search" className="h-4 w-4 text-muted" />
          <input
            autoFocus
            className="flex-1 bg-transparent text-sm outline-none"
            placeholder="Buscar clientes, tarefas, chamados, documentos..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && onClose()}
          />
          <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] text-muted sm:inline">
            Ctrl+K
          </kbd>
        </div>
        <div className="max-h-80 overflow-y-auto py-2">
          {query.trim().length < 2 && (
            <p className="px-4 py-6 text-center text-xs text-muted">Digite pelo menos 2 caracteres</p>
          )}
          {loading && <p className="px-4 py-3 text-xs text-muted">Buscando…</p>}
          {!loading &&
            sections.map((section) => (
              <div key={section.key} className="px-2 py-1">
                <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted">
                  {section.label}
                </p>
                {section.items.map((item) => (
                  <button
                    key={`${section.key}-${item.id}`}
                    type="button"
                    className="flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-surface"
                    onClick={() => {
                      router.push(item.href);
                      onClose();
                    }}
                  >
                    <Icon name={section.icon} className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{item.label}</span>
                      {item.sub && <span className="block truncate text-xs text-muted">{item.sub}</span>}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          {!loading && query.trim().length >= 2 && sections.length === 0 && (
            <p className="px-4 py-6 text-center text-xs text-muted">Nenhum resultado</p>
          )}
        </div>
      </div>
    </div>
  );
}
