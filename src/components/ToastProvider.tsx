"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type ToastType = "success" | "error" | "warning" | "info";

type Toast = {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
};

type ToastContextValue = {
  toast: (message: string, type?: ToastType, duration?: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastType, React.ReactNode> = {
  success: (
    <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6.5" /><path d="m5.5 8 1.75 1.75L10.5 6" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6.5" /><path d="M8 5v3.5M8 11h.01" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2 1.5 13.5h13L8 2z" /><path d="M8 7v3M8 12h.01" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6.5" /><path d="M8 7.5V11M8 5h.01" />
    </svg>
  ),
};

const STYLES: Record<ToastType, string> = {
  success: "bg-emerald-950/95 text-emerald-100 ring-emerald-500/30 [&_svg]:text-emerald-400",
  error:   "bg-red-950/95 text-red-100 ring-red-500/30 [&_svg]:text-red-400",
  warning: "bg-amber-950/95 text-amber-100 ring-amber-500/30 [&_svg]:text-amber-400",
  info:    "bg-slate-900/95 text-slate-100 ring-slate-500/30 [&_svg]:text-blue-400",
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = setTimeout(() => setVisible(true), 10);
    const hide = setTimeout(() => { setVisible(false); setTimeout(() => onDismiss(toast.id), 300); }, toast.duration ?? 4000);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-xl ring-1 backdrop-blur-sm transition-all duration-300 ${STYLES[toast.type]} ${visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
      style={{ minWidth: 260, maxWidth: 380 }}
    >
      {ICONS[toast.type]}
      <span className="flex-1 leading-snug">{toast.message}</span>
      <button
        type="button"
        className="ml-1 shrink-0 opacity-50 hover:opacity-100 transition-opacity"
        onClick={() => { setVisible(false); setTimeout(() => onDismiss(toast.id), 300); }}
        aria-label="Fechar"
      >
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = "info", duration?: number) => {
    const id = `toast-${++counter.current}`;
    setToasts((prev) => [...prev.slice(-4), { id, type, message, duration }]);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[10000] flex flex-col items-end gap-2" aria-live="polite">
        {toasts.map((t) => <ToastItem key={t.id} toast={t} onDismiss={dismiss} />)}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast deve ser usado dentro de ToastProvider");
  return ctx.toast;
}
