"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useTheme } from "./ThemeProvider";
import { TeseFilterProvider } from "./TeseFilterProvider";
import { TeseFilterBar } from "./TeseFilterBar";
import { Icon, type IconName } from "./ui/Icon";
import { canAccessTools } from "@/lib/roles";
import { useSession } from "./SessionProvider";
import { GlobalSearchPalette, useGlobalSearchShortcut } from "./GlobalSearchPalette";
import { NotificationBell } from "./NotificationBell";
import { OnboardingTour } from "./OnboardingTour";

type NavItem = { href: string; label: string; shortLabel?: string; icon: IconName };

function userInitial(name: string) {
  const trimmed = name.trim();
  return trimmed ? trimmed[0]!.toUpperCase() : "?";
}

function NavLinks({
  nav,
  pathname,
  kanbanOverdueCount,
}: {
  nav: NavItem[];
  pathname: string;
  kanbanOverdueCount: number;
}) {
  return (
    <nav
      className="scrollbar-none flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]"
      aria-label="Navegação principal"
    >
      {nav.map((item) => {
        const active = pathname.startsWith(item.href);
        const showOverdueBadge = item.href === "/kanban" && kanbanOverdueCount > 0;

        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className={`nav-pill ${active ? "nav-pill-active" : "nav-pill-idle"}`}
          >
            <Icon name={item.icon} className="h-4 w-4 shrink-0" />
            <span className="hidden whitespace-nowrap xl:inline">{item.label}</span>
            <span className="hidden whitespace-nowrap sm:inline xl:hidden">
              {item.shortLabel ?? item.label}
            </span>
            {showOverdueBadge && (
              <span
                className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white"
                title={`${kanbanOverdueCount} tarefa(s) atrasada(s)`}
              >
                {kanbanOverdueCount > 99 ? "99+" : kanbanOverdueCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { user } = useSession();
  const [kanbanOverdueCount, setKanbanOverdueCount] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  useGlobalSearchShortcut(openSearch);

  const showTeseControls =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/kanban");

  useEffect(() => {
    if (!user) {
      setKanbanOverdueCount(0);
      return;
    }

    let cancelled = false;

    const loadAlerts = () => {
      fetch("/api/tasks/alerts")
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled) setKanbanOverdueCount(d.counts?.overdue ?? 0);
        })
        .catch(() => {
          if (!cancelled) setKanbanOverdueCount(0);
        });
    };

    loadAlerts();
    const interval = setInterval(loadAlerts, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user, pathname]);

  const nav: NavItem[] = [
    { href: "/dashboard", label: "Clientes", icon: "dashboard" },
    ...(user && canAccessTools(user)
      ? [{ href: "/ferramentas", label: "Ferramentas", shortLabel: "Tools", icon: "wrench" as const }]
      : []),
    { href: "/kanban", label: "Kanban", icon: "kanban" },
    { href: "/chamados", label: "Chamados", icon: "ticket" },
    { href: "/reports", label: "Relatórios", icon: "reports" },
    ...(user?.role && user.role !== "ADMIN"
      ? [{ href: "/equipe", label: "Minha equipe", shortLabel: "Equipe", icon: "briefcase" as const }]
      : []),
    ...(user?.role === "ADMIN"
      ? [{ href: "/admin", label: "Administração", shortLabel: "Admin", icon: "shield" as const }]
      : []),
  ];

  return (
    <TeseFilterProvider>
      <div className="min-h-screen bg-surface">
        <header className="sticky top-0 z-40 border-b border-border/80 bg-surface-elevated/95 shadow-sm backdrop-blur-md">
          <div className="mx-auto flex h-14 min-w-0 max-w-7xl items-center gap-1.5 px-3 sm:gap-2 sm:px-6 lg:gap-3">
            <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
              <Icon name="fileText" className="h-5 w-5 text-primary" />
              <span className="hidden min-w-0 flex-col md:flex">
                <span className="text-[10px] font-semibold tracking-widest text-muted uppercase">
                  RMBV
                </span>
                <span className="max-w-[88px] truncate text-sm font-semibold text-foreground lg:max-w-[140px]">
                  {user?.teamName ?? user?.name ?? "Sistema"}
                </span>
              </span>
            </Link>

            <NavLinks nav={nav} pathname={pathname} kanbanOverdueCount={kanbanOverdueCount} />

            <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
              {user && (
                <>
                  {canAccessTools(user) && (
                    <Link
                      href="/ferramentas"
                      className={`btn-ghost px-2 py-1.5 md:hidden ${
                        pathname.startsWith("/ferramentas") ? "text-primary" : ""
                      }`}
                      title="Ferramentas"
                      aria-label="Ferramentas"
                    >
                      <Icon name="wrench" className="h-4 w-4" />
                    </Link>
                  )}
                  <button
                    type="button"
                    className="btn-ghost px-2 py-1.5 text-xs sm:inline-flex"
                    onClick={openSearch}
                    title="Busca global (Ctrl+K)"
                  >
                    <Icon name="search" className="h-4 w-4" />
                  </button>
                  <NotificationBell />
                </>
              )}
              <button
                type="button"
                onClick={toggleTheme}
                className="btn-ghost px-2 py-1.5"
                title={theme === "dark" ? "Modo claro" : "Modo escuro"}
                aria-label={theme === "dark" ? "Modo claro" : "Modo escuro"}
              >
                <Icon name={theme === "dark" ? "sun" : "moon"} className="h-4 w-4" />
              </button>

              {user && (
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/15 text-sm font-bold text-primary"
                  title={user.name}
                >
                  {userInitial(user.name)}
                </div>
              )}

              <form action="/api/auth/logout" method="post">
                <button type="submit" className="btn-ghost px-2 py-1.5" title="Sair">
                  <Icon name="logOut" className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </header>

        {showTeseControls && <TeseFilterBar showPdfButton />}

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          {user && <OnboardingTour />}
          {children}
        </main>
        {user && <GlobalSearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />}
      </div>
    </TeseFilterProvider>
  );
}
