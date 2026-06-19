"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
};

type ConfirmContextValue = {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const resolveRef = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setState({ ...opts, resolve });
    });
  }, []);

  function close(result: boolean) {
    state?.resolve(result);
    setState(null);
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => close(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-border bg-surface-elevated p-6 shadow-2xl">
            {state.title && (
              <h3 className="mb-2 text-base font-semibold text-foreground">{state.title}</h3>
            )}
            <p className="text-sm text-muted leading-relaxed">{state.message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => close(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={state.danger ? "btn-danger" : "btn-primary"}
                onClick={() => close(true)}
              >
                {state.confirmLabel ?? (state.danger ? "Excluir" : "Confirmar")}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm deve ser usado dentro de ConfirmDialogProvider");
  return ctx.confirm;
}
