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
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface-elevated/95 p-2 backdrop-blur-md md:hidden">
      <div className="mx-auto flex max-w-lg justify-around gap-1">
        {phoneDigits && (
          <>
            <a href={`tel:${phoneDigits}`} className="flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 text-[10px]">
              <Icon name="messageSquare" className="h-5 w-5 text-primary" />
              Ligar
            </a>
            <a
              href={`https://wa.me/55${phoneDigits}`}
              target="_blank"
              rel="noreferrer"
              className="flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 text-[10px]"
            >
              <Icon name="messageSquare" className="h-5 w-5 text-emerald-600" />
              WhatsApp
            </a>
          </>
        )}
        <a
          href={`/clients/${clientId}#historico`}
          className="flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 text-[10px]"
        >
          <Icon name="clock" className="h-5 w-5 text-primary" />
          Histórico
        </a>
        <a href="/kanban" className="flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 text-[10px]">
          <Icon name="kanban" className="h-5 w-5 text-primary" />
          Tarefas
        </a>
      </div>
    </div>
  );
}
