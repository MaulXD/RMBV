"use client";

import { Icon } from "./ui/Icon";

export function ClientMobileQuickActions({
  clientId,
  primaryPhone,
}: {
  clientId: string;
  primaryPhone: string | null;
}) {
  const phoneDigits = primaryPhone?.replace(/\D/g, "") ?? "";

  return (
    <div className="sticky top-14 z-20 -mx-4 border-b border-border bg-surface-elevated/95 px-2 py-1 backdrop-blur-md md:hidden">
      <div className="mx-auto flex max-w-lg justify-around gap-1">
        {phoneDigits && (
          <>
            <a
              href={`tel:${phoneDigits}`}
              className="mobile-touch flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-2 text-[11px] font-medium text-muted transition-colors active:text-foreground"
            >
              <Icon name="phone" className="h-5 w-5 text-primary" />
              Ligar
            </a>
            <a
              href={`https://wa.me/55${phoneDigits}`}
              target="_blank"
              rel="noreferrer"
              className="mobile-touch flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-2 text-[11px] font-medium text-muted transition-colors active:text-foreground"
            >
              <Icon name="messageSquare" className="h-5 w-5 text-emerald-600" />
              WhatsApp
            </a>
          </>
        )}
        <a
          href={`/clients/${clientId}#historico`}
          className="mobile-touch flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-2 text-[11px] font-medium text-muted transition-colors active:text-foreground"
        >
          <Icon name="clock" className="h-5 w-5 text-primary" />
          Histórico
        </a>
        <a
          href="/kanban"
          className="mobile-touch flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-2 text-[11px] font-medium text-muted transition-colors active:text-foreground"
        >
          <Icon name="kanban" className="h-5 w-5 text-primary" />
          Tarefas
        </a>
      </div>
    </div>
  );
}
