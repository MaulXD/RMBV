"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./ui/Icon";

export function MobileBottomNav({
  onMenuOpen,
  onChatToggle,
  chatUnread = 0,
  chatOpen = false,
}: {
  onMenuOpen: () => void;
  onChatToggle: () => void;
  chatUnread?: number;
  chatOpen?: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav className="safe-area-bottom fixed bottom-0 inset-x-0 z-40 flex h-14 items-center justify-around border-t border-border bg-surface-elevated/95 backdrop-blur-md lg:hidden">
      <Link
        href="/dashboard"
        className={`flex flex-col items-center gap-0.5 px-4 py-1 text-[10px] font-medium transition-colors ${
          pathname === "/dashboard" || pathname.startsWith("/clients")
            ? "text-primary"
            : "text-muted hover:text-foreground"
        }`}
      >
        <Icon name="users" className="h-5 w-5" />
        <span>Clientes</span>
      </Link>

      <Link
        href="/kanban"
        className={`flex flex-col items-center gap-0.5 px-4 py-1 text-[10px] font-medium transition-colors ${
          pathname.startsWith("/kanban")
            ? "text-primary"
            : "text-muted hover:text-foreground"
        }`}
      >
        <Icon name="kanban" className="h-5 w-5" />
        <span>Kanban</span>
      </Link>

      <button
        type="button"
        onClick={onChatToggle}
        className={`relative flex flex-col items-center gap-0.5 px-4 py-1 text-[10px] font-medium transition-colors ${
          chatOpen ? "text-primary" : "text-muted hover:text-foreground"
        }`}
      >
        <span className="relative">
          <Icon name="messageCircle" className="h-5 w-5" />
          {chatUnread > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
              {chatUnread > 9 ? "9+" : chatUnread}
            </span>
          )}
        </span>
        <span>Chat</span>
      </button>

      <button
        type="button"
        onClick={onMenuOpen}
        className="flex flex-col items-center gap-0.5 px-4 py-1 text-[10px] font-medium text-muted transition-colors hover:text-foreground"
      >
        <Icon name="menu" className="h-5 w-5" />
        <span>Menu</span>
      </button>
    </nav>
  );
}
