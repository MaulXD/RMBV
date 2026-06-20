"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "./SessionProvider";
import { Icon } from "./ui/Icon";

export function MobileBottomNav({
  onMenuOpen,
  onChatToggle,
  chatUnread,
  chatOpen,
}: {
  onMenuOpen: () => void;
  onChatToggle: () => void;
  chatUnread: number;
  chatOpen: boolean;
}) {
  const pathname = usePathname();
  const { user } = useSession();
  if (!user) return null;

  const navActive = (href: string) => pathname.startsWith(href);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-elevated/95 backdrop-blur-md lg:hidden safe-area-bottom">
      <div className="flex h-14 items-stretch">
        {/* Clientes */}
        <Link
          href="/dashboard"
          className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
            navActive("/dashboard") ? "text-primary" : "text-muted"
          }`}
        >
          <Icon
            name="users"
            className={`h-5 w-5 ${navActive("/dashboard") ? "text-primary" : "text-muted"}`}
          />
          Clientes
        </Link>

        {/* Kanban */}
        <Link
          href="/kanban"
          className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
            navActive("/kanban") ? "text-primary" : "text-muted"
          }`}
        >
          <Icon
            name="kanban"
            className={`h-5 w-5 ${navActive("/kanban") ? "text-primary" : "text-muted"}`}
          />
          Kanban
        </Link>

        {/* Chat */}
        <button
          type="button"
          onClick={onChatToggle}
          className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
            chatOpen ? "text-primary" : "text-muted"
          }`}
        >
          <span className="relative">
            <Icon
              name="messageCircle"
              className={`h-5 w-5 ${chatOpen ? "text-primary" : "text-muted"}`}
            />
            {!chatOpen && chatUnread > 0 && (
              <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white leading-none">
                {chatUnread > 99 ? "99+" : chatUnread}
              </span>
            )}
          </span>
          Chat
        </button>

        {/* Menu */}
        <button
          type="button"
          onClick={onMenuOpen}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-muted transition-colors"
        >
          <Icon name="menu" className="h-5 w-5 text-muted" />
          Menu
        </button>
      </div>
    </div>
  );
}
