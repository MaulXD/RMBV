"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useTheme } from "./ThemeProvider";
import { TeseFilterProvider } from "./TeseFilterProvider";
import { TeseFilterBar } from "./TeseFilterBar";
import { Icon, type IconName } from "./ui/Icon";
import { useSession } from "./SessionProvider";
import { GlobalSearchPalette, useGlobalSearchShortcut } from "./GlobalSearchPalette";
import { NotificationBell } from "./NotificationBell";
import { OnboardingTour } from "./OnboardingTour";

type NavItem = { href: string; label: string; icon: IconName };

function userInitial(name: string) {
  const trimmed = name.trim();
  return trimmed ? trimmed[0]!.toUpperCase() : "?";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { user } = useSession();
  const [kanbanOverdueCount, setKanbanOverdueCount] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    { href: "/ferramentas", label: "Ferramentas", icon: "wrench" },
    { href: "/kanban", label: "Kanban", icon: "kanban" },
    { href: "/chamados", label: "Chamados", icon: "ticket" },
    { href: "/reports", label: "Relatórios", icon: "reports" },
    // Enquanto a sessão carrega (user null), mostra Minha equipe por padrão
    ...(user?.role === "ADMIN"
      ? [{ href: "/admin", label: "Administração", icon: "shield" as const }]
      : [{ href: "/equipe", label: "Minha equipe", icon: "briefcase" as const }]),
  ];

  const sidebarContent = (
    <aside className="flex h-full flex-col border-r border-border bg-surface-elevated">
      {/* Brand */}
      <div className="flex h-16 shrink-0 items-center border-b border-border px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Icon name="fileText" className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-widest text-muted uppercase">RMBV</p>
            <p className="max-w-[130px] truncate text-sm font-semibold leading-tight text-foreground">
              {user?.teamName ?? user?.name ?? "Sistema"}
            </p>
          </div>
        </Link>
      </div>

      {/* Search */}
      {user && (
        <div className="px-3 pt-3">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted transition-colors hover:border-primary/40 hover:text-foreground"
            onClick={() => {
              openSearch();
              setSidebarOpen(false);
            }}
          >
            <Icon name="search" className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 text-left">Buscar...</span>
            <kbd className="text-[10px] opacity-40">⌘K</kbd>
          </button>
        </div>
      )}

      {/* Tese filter — integrado na sidebar */}
      {showTeseControls && (
        <div className="px-0 pt-3">
          <TeseFilterBar variant="sidebar" showPdfButton />
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Navegação principal">
        {nav.map((item) => {
          const active = pathname.startsWith(item.href);
          const showBadge = item.href === "/kanban" && kanbanOverdueCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted hover:bg-surface hover:text-foreground"
              }`}
            >
              <Icon
                name={item.icon}
                className={`h-4 w-4 shrink-0 ${active ? "text-primary" : ""}`}
              />
              <span className="flex-1">{item.label}</span>
              {showBadge && (
                <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {kanbanOverdueCount > 99 ? "99+" : kanbanOverdueCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="shrink-0 border-t border-border p-3">
        <div className="flex items-center gap-2">
          {user && (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
              {userInitial(user.name)}
            </div>
          )}
          {user && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-tight text-foreground">
                {user.name}
              </p>
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
              aria-label={theme === "dark" ? "Modo claro" : "Modo escuro"}
            >
              <Icon name={theme === "dark" ? "sun" : "moon"} className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="btn-icon"
              title="Sair"
              onClick={() => {
                void fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).finally(
                  () => {
                    window.location.assign("/");
                  },
                );
              }}
            >
              <Icon name="logOut" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <TeseFilterProvider>
      <div className="flex bg-surface">
        {/* Desktop sidebar — sticky, full viewport height */}
        <div className="sticky top-0 hidden h-screen w-60 shrink-0 overflow-y-auto lg:flex lg:flex-col">
          {sidebarContent}
        </div>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 w-60">
              {sidebarContent}
            </div>
          </div>
        )}

        {/* Content column */}
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          {/* Mobile top bar */}
          <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface-elevated/95 px-4 backdrop-blur-md lg:hidden">
            <button
              type="button"
              className="btn-ghost px-2 py-1.5"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menu"
            >
              <Icon name="menu" className="h-5 w-5" />
            </button>
            <Link href="/dashboard" className="flex items-center gap-2">
              <Icon name="fileText" className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">RMBV</span>
            </Link>
            <div className="ml-auto flex items-center gap-1">
              {user && (
                <button
                  type="button"
                  className="btn-ghost px-2 py-1.5"
                  onClick={openSearch}
                  title="Buscar (Ctrl+K)"
                >
                  <Icon name="search" className="h-4 w-4" />
                </button>
              )}
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            {user && <OnboardingTour />}
            {children}
          </main>
        </div>
      </div>
      {user && <GlobalSearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />}
    </TeseFilterProvider>
  );
}
