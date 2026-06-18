"use client";

import { Icon } from "./ui/Icon";

export function WhatsAppButton({
  value,
  compact = false,
}: {
  value: string;
  compact?: boolean;
}) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;

  const href = `https://wa.me/55${digits}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={
        compact
          ? "btn-icon-bordered hover:border-emerald-500/50 hover:bg-emerald-500/[0.08] hover:text-emerald-600 dark:hover:text-emerald-400"
          : "btn-ghost shrink-0 px-2.5 py-2"
      }
      title="Abrir no WhatsApp"
      aria-label="Abrir no WhatsApp"
    >
      <Icon name="messageSquare" className="h-4 w-4" />
      {!compact && <span className="text-xs">WhatsApp</span>}
    </a>
  );
}
