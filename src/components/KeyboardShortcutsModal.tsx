"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./ui/Icon";

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[1.5rem] items-center justify-center rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[11px] text-foreground shadow-sm">
      {children}
    </kbd>
  );
}

function useGroups() {
  return useMemo(() => {
    const mod = typeof navigator !== "undefined" && /mac/i.test(navigator.platform) ? "⌘" : "Ctrl";
    return [
      {
        label: "Navegação",
        shortcuts: [
          { keys: [mod, "K"], desc: "Busca global" },
          { keys: ["?"], desc: "Atalhos de teclado" },
          { keys: ["Esc"], desc: "Fechar modal / paleta" },
        ],
      },
      {
        label: "Ir para",
        shortcuts: [
          { keys: ["G", "D"], desc: "Dashboard" },
          { keys: ["G", "A"], desc: "Admin" },
          { keys: ["G", "K"], desc: "Kanban" },
          { keys: ["G", "P"], desc: "Ponto" },
        ],
      },
      {
        label: "Geral",
        shortcuts: [
          { keys: ["Enter"], desc: "Confirmar / selecionar" },
          { keys: ["Tab"], desc: "Próximo campo" },
          { keys: [mod, "Enter"], desc: "Salvar formulário" },
        ],
      },
    ];
  }, []);
}

export function useKeyboardShortcutsShortcut(onOpen: () => void) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "?") {
        e.preventDefault();
        onOpen();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpen]);
}

export function useGotoShortcuts() {
  const router = useRouter();

  useEffect(() => {
    let pending: string | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function clear() {
      pending = null;
      if (timer) clearTimeout(timer);
      timer = null;
    }

    const routes: Record<string, string> = {
      d: "/dashboard",
      a: "/admin",
      k: "/kanban",
      p: "/ponto",
    };

    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();

      if (pending === "g") {
        clear();
        const dest = routes[key];
        if (dest) router.push(dest);
        return;
      }

      if (key === "g") {
        pending = "g";
        timer = setTimeout(clear, 800);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); clear(); };
  }, [router]);
}

export function KeyboardShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const groups = useGroups();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface-elevated shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Icon name="keyboard" className="h-4 w-4 text-muted" />
            <h2 className="text-sm font-semibold">Atalhos de teclado</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-surface hover:text-foreground"
            aria-label="Fechar"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>

        <div className="divide-y divide-border px-5 py-3">
          {groups.map((g) => (
            <div key={g.label} className="py-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted/60">{g.label}</p>
              <ul className="space-y-1.5">
                {g.shortcuts.map((s) => (
                  <li key={s.desc} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted">{s.desc}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {s.keys.map((k, i) => (
                        <Kbd key={i}>{k}</Kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-border px-5 py-3">
          <p className="text-xs text-muted/60">Pressione <Kbd>?</Kbd> em qualquer tela para abrir este modal.</p>
        </div>
      </div>
    </div>
  );
}
