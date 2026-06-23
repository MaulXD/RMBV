"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import { Icon, type IconName } from "./ui/Icon";
import { useSession, primeSessionCache } from "./SessionProvider";
import { useTheme } from "./ThemeProvider";
import { NotificationBell } from "./NotificationBell";

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  color: string;
  comingSoon?: boolean;
};
type NavGroup = { label: string; items: NavItem[] };

function userInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

function UserAvatar({ user, size = 32 }: { user: { name: string; avatarUrl: string | null }; size?: number }) {
  if (user.avatarUrl) {
    return (
      <Image
        src={user.avatarUrl}
        alt={user.name}
        width={size}
        height={size}
        className="rounded-full object-cover shrink-0"
        unoptimized={user.avatarUrl.startsWith("/")}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0 font-bold"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {userInitials(user.name)}
    </div>
  );
}

function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sidebar-collapsed") === "true";
  });
  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  }, []);
  return [collapsed, toggle] as const;
}

export function Sidebar({
  onMobileClose,
  onSearch,
  onChatToggle,
  kanbanOverdueCount,
  chatUnread = 0,
  chatOpen = false,
  forceExpanded = false,
}: {
  onMobileClose: () => void;
  onSearch: () => void;
  onChatToggle?: () => void;
  kanbanOverdueCount: number;
  chatUnread?: number;
  chatOpen?: boolean;
  forceExpanded?: boolean;
}) {
  const pathname = usePathname();
  const { user } = useSession();
  const { theme, toggleTheme } = useTheme();
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();

  const isPesquisador = user?.role === "PESQUISADOR";

  const pontoItem: NavItem = {
    href: "/ponto",
    label: "Ponto facial",
    icon: "scanFace",
    color: "text-emerald-500",
  };

  const navGroups: NavGroup[] = [
    {
      label: "Trabalho",
      items: [
        { href: "/dashboard", label: "Clientes", icon: "users", color: "text-blue-500" },
        { href: "/kanban", label: "Kanban", icon: "kanban", color: "text-violet-500" },
        { href: "/chamados", label: "Chamados", icon: "messageSquare", color: "text-amber-500" },
        ...(onChatToggle
          ? [{ href: "#chat", label: "Chat", icon: "messageCircle" as const, color: "text-indigo-500" }]
          : []),
        ...(user ? [pontoItem] : []),
        ...(!isPesquisador
          ? [
              { href: "/reports", label: "Relatórios", icon: "reports" as const, color: "text-emerald-500" },
              { href: "/ferramentas", label: "Ferramentas", icon: "wrench" as const, color: "text-orange-500" },
            ]
          : []),
        ...(user && (user.role === "ADMIN" || user.role === "ADV" || user.role === "GERENTE")
          ? [
              { href: "/acoes", label: "Ações", icon: "scale" as const, color: "text-violet-500" },
              { href: "/cartas", label: "Cartas", icon: "mail" as const, color: "text-pink-500" },
            ]
          : []),
        { href: "/apa", label: "APA", icon: "clipboardList" as const, color: "text-teal-500", comingSoon: true },
      ],
    },
    ...(user && user.role !== "COLABORADOR" && !isPesquisador
      ? [
          {
            label: "Sistema",
            items: [
              { href: "/acesso", label: "Acesso", icon: "clock" as const, color: "text-sky-500" },
              ...(user.role === "ADV"
                ? [{ href: "/equipe", label: "Configurações", icon: "briefcase" as const, color: "text-cyan-500" }]
                : []),
              ...(user.role === "ADMIN"
                ? [{ href: "/admin", label: "Administração", icon: "shield" as const, color: "text-rose-500" }]
                : []),
            ],
          },
        ]
      : []),
  ];

  const perfilActive = pathname.startsWith("/perfil");
  const isCollapsed = forceExpanded ? false : collapsed;

  return (
    <aside
      className="sidebar-glass flex h-full flex-col overflow-hidden transition-[width] duration-200"
      style={{ width: isCollapsed ? 56 : 240 }}
    >
      {/* Brand */}
      <div className={`flex h-16 shrink-0 items-center border-b border-border ${isCollapsed ? "justify-center px-2" : "px-4"}`}>
        <Link
          href="/dashboard"
          className="flex min-w-0 items-center gap-2.5"
          onClick={onMobileClose}
          title={isCollapsed ? "RMBV" : undefined}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Icon name="fileText" className="h-4 w-4" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-widest text-muted uppercase">RMBV</p>
              <p className="max-w-[130px] truncate text-sm font-semibold leading-tight text-foreground">
                {user?.teamName ?? user?.name ?? "Sistema"}
              </p>
            </div>
          )}
        </Link>
      </div>

      {/* Search */}
      {user && (
        <div className={`${isCollapsed ? "flex justify-center px-2" : "px-3"} pt-3`}>
          <button
            type="button"
            className={`flex items-center gap-2 rounded-lg border border-border bg-surface text-sm text-muted transition-colors hover:border-primary/40 hover:text-foreground ${
              isCollapsed ? "h-9 w-9 justify-center" : "w-full px-3 py-2"
            }`}
            onClick={() => { onSearch(); onMobileClose(); }}
            title={isCollapsed ? "Buscar (⌘K)" : undefined}
          >
            <Icon name="search" className="h-3.5 w-3.5 shrink-0" />
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left">Buscar...</span>
                <kbd className="text-[10px] opacity-40">⌘K</kbd>
              </>
            )}
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-1" aria-label="Navegação principal">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-1">
            {!isCollapsed ? (
              <p className="px-3 pb-1 pt-3 text-[10px] font-bold tracking-[0.1em] text-muted/70 uppercase">
                {group.label}
              </p>
            ) : (
              <div className="h-4 border-t border-border/40 mx-2 mt-3 mb-1" />
            )}

            {group.items.map((item) => {
              const isChat = item.href === "#chat";
              const active = isChat ? chatOpen : pathname.startsWith(item.href);
              const showBadge =
                (item.href === "/kanban" && kanbanOverdueCount > 0) ||
                (isChat && !chatOpen && chatUnread > 0);

              if (item.comingSoon) {
                return (
                  <span
                    key={item.href}
                    className={`sidebar-nav-link cursor-default opacity-40 ${isCollapsed ? "justify-center" : ""}`}
                    title={isCollapsed ? `${item.label} — Em breve` : undefined}
                  >
                    <Icon name={item.icon} className={`h-4 w-4 shrink-0 ${item.color}`} />
                    {!isCollapsed && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        <span
                          className="rounded px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-muted uppercase"
                          style={{ background: "color-mix(in srgb, var(--color-border) 50%, transparent)" }}
                        >
                          Em breve
                        </span>
                      </>
                    )}
                  </span>
                );
              }

              if (isChat && onChatToggle) {
                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => {
                      onChatToggle();
                      onMobileClose();
                    }}
                    className={`sidebar-nav-link w-full ${active ? "active" : ""} ${isCollapsed ? "justify-center" : ""}`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon
                      name={item.icon}
                      className={`h-4 w-4 shrink-0 ${item.color} ${active ? "opacity-100" : "opacity-70"}`}
                    />
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        {showBadge && (
                          <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            {chatUnread > 99 ? "99+" : chatUnread}
                          </span>
                        )}
                      </>
                    )}
                    {isCollapsed && showBadge && (
                      <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-600" />
                    )}
                  </button>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onMobileClose}
                  className={`sidebar-nav-link ${active ? "active" : ""} ${isCollapsed ? "justify-center" : ""}`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon
                    name={item.icon}
                    className={`h-4 w-4 shrink-0 ${item.color} ${active ? "opacity-100" : "opacity-70"}`}
                  />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1">{item.label}</span>
                      {showBadge && item.href === "/kanban" && (
                        <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          {kanbanOverdueCount > 99 ? "99+" : kanbanOverdueCount}
                        </span>
                      )}
                    </>
                  )}
                  {isCollapsed && showBadge && item.href === "/kanban" && (
                    <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-600" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Collapse toggle — desktop only */}
      <div className={`hidden border-t border-border/40 lg:flex ${collapsed ? "justify-center p-2" : "justify-end px-3 py-2"}`}>
        <button
          type="button"
          onClick={toggleCollapsed}
          className="btn-ghost p-1.5"
          title={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
        >
          <Icon
            name="chevronRight"
            className={`h-4 w-4 text-muted transition-transform duration-200 ${collapsed ? "" : "rotate-180"}`}
          />
        </button>
      </div>

      {/* User footer */}
      <div className="shrink-0 border-t border-border p-2">
        {!isCollapsed ? (
          <div className="flex items-center gap-2">
            {user && (
              <Link
                href="/perfil"
                onClick={onMobileClose}
                className={`shrink-0 rounded-full ring-2 transition-all ${perfilActive ? "ring-primary" : "ring-transparent hover:ring-primary/40"}`}
                title="Meu perfil"
              >
                <UserAvatar user={user} size={32} />
              </Link>
            )}
            {user && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium leading-tight text-foreground">{user.name}</p>
                <p className="truncate text-xs text-muted">{user.role}</p>
              </div>
            )}
            <div className="flex items-center gap-0.5">
              {user && <NotificationBell />}
              <button
                type="button"
                onClick={toggleTheme}
                className="btn-icon"
                title={theme === "dark" ? "Modo claro" : "Modo escuro"}
              >
                <Icon name={theme === "dark" ? "sun" : "moon"} className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="btn-icon"
                title="Sair"
                onClick={() => {
                  primeSessionCache(null);
                  void fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).finally(() => {
                    window.location.assign("/");
                  });
                }}
              >
                <Icon name="logOut" className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            {user && (
              <Link
                href="/perfil"
                onClick={onMobileClose}
                className={`rounded-full ring-2 transition-all ${perfilActive ? "ring-primary" : "ring-transparent hover:ring-primary/40"}`}
                title="Meu perfil"
              >
                <UserAvatar user={user} size={32} />
              </Link>
            )}
            {user && <NotificationBell />}
            <button
              type="button"
              onClick={toggleTheme}
              className="btn-icon"
              title={theme === "dark" ? "Modo claro" : "Modo escuro"}
            >
              <Icon name={theme === "dark" ? "sun" : "moon"} className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="btn-icon"
              title="Sair"
              onClick={() => {
                primeSessionCache(null);
                void fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).finally(() => {
                  window.location.assign("/");
                });
              }}
            >
              <Icon name="logOut" className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
