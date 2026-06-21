"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "./SessionProvider";
import { Icon, type IconName } from "./ui/Icon";

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  match?: (pathname: string) => boolean;
};

export function MobileBottomNav({
  onChatToggle,
  chatUnread,
  chatOpen,
}: {
  onMenuOpen?: () => void;
  onChatToggle: () => void;
  chatUnread: number;
  chatOpen: boolean;
}) {
  const pathname = usePathname();
  const { user } = useSession();
  if (!user) return null;

  const showPonto = user.role !== "ADMIN";
  const showAdmin = user.role === "ADMIN";

  const items: NavItem[] = [
    {
      href: "/dashboard",
      label: "Clientes",
      icon: "users",
      match: (p) => p.startsWith("/dashboard") || p.startsWith("/clients"),
    },
    ...(showPonto
      ? [{ href: "/ponto", label: "Ponto", icon: "scanFace" as const, match: (p: string) => p.startsWith("/ponto") }]
      : []),
    {
      href: "/kanban",
      label: "Kanban",
      icon: "kanban",
      match: (p) => p.startsWith("/kanban"),
    },
    ...(showAdmin
      ? [{ href: "/admin", label: "Admin", icon: "shield" as const, match: (p: string) => p.startsWith("/admin") }]
      : []),
  ];

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-elevated/95 backdrop-blur-md lg:hidden safe-area-bottom">
      <div className="flex items-stretch">
        {items.map((item) => {
          const active = item.match ? item.match(pathname) : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mobile-nav-item ${active ? "mobile-nav-item-active" : "text-muted"}`}
            >
              <Icon
                name={item.icon}
                className={`h-5 w-5 ${active ? "text-primary" : "text-muted"}`}
              />
              {item.label}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onChatToggle}
          className={`mobile-nav-item ${chatOpen ? "mobile-nav-item-active" : "text-muted"}`}
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
      </div>
    </div>
  );
}
