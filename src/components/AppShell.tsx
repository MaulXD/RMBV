"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useTheme } from "./ThemeProvider";
import { TeseFilterProvider } from "./TeseFilterProvider";
import { TeseFilterBar } from "./TeseFilterBar";
import { Icon, type IconName } from "./ui/Icon";
import { useSession, primeSessionCache } from "./SessionProvider";
import { GlobalSearchPalette, useGlobalSearchShortcut } from "./GlobalSearchPalette";
import { NotificationBell } from "./NotificationBell";
import { OnboardingTour } from "./OnboardingTour";
import { AccessBlockedScreen } from "./AccessBlockedScreen";

type NavItem = { href: string; label: string; icon: IconName; color: string };
type NavGroup = { label: string; items: NavItem[] };

function userInitial(name: string) {
  const trimmed = name.trim();
  return trimmed ? trimmed[0]!.toUpperCase() : "?";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { user, loading: sessionLoading } = useSession();
  const [kanbanOverdueCount, setKanbanOverdueCount] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scheduleBlock, setScheduleBlock] = useState<{ startHour: number; endHour: number; allowedDays: number[] } | null>(null);

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

  // Schedule enforcement for COLABORADOR
  useEffect(() => {
    if (!user || user.role !== "COLABORADOR") return;

    let cancelled = false;

    const checkSchedule = () => {
      fetch("/api/equipe/schedule-check")
        .then((r) => r.json())
        .then((d: { allowed: boolean; startHour?: number; endHour?: number; allowedDays?: number[] }) => {
          if (cancelled) return;
          if (!d.allowed && d.startHour !== undefined && d.endHour !== undefined) {
            setScheduleBlock({ startHour: d.startHour, endHour: d.endHour, allowedDays: d.allowedDays ?? [1,2,3,4,5] });
          } else {
            setScheduleBlock(null);
          }
        })
        .catch(() => {});
    };

    checkSchedule();
    const interval = setInterval(checkSchedule, 60_000);
    const onFocus = () => checkSchedule();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [user]);

  const navGroups: NavGroup[] = [
    {
      label: "Principal",
      items: [
        { href: "/dashboard", label: "Clientes", icon: "dashboard", color: "text-blue-500" },
        { href: "/kanban", label: "Kanban", icon: "kanban", color: "text-violet-500" },
        { href: "/reports", label: "Relatórios", icon: "reports", color: "text-emerald-500" },
      ],
    },
    {
      label: "Operações",
      items: [
        { href: "/ferramentas", label: "Ferramentas", icon: "wrench", color: "text-orange-500" },
        { href: "/chamados", label: "Chamados", icon: "ticket", color: "text-amber-500" },
      ],
    },
    ...(!sessionLoading ? [{
      label: "Sistema",
      items: [
        ...(user?.role === "ADV" || user?.role === "GERENTE" || user?.role === "ADMIN"
          ? [{ href: "/acesso", label: "Acesso", icon: "clock" as const, color: "text-sky-500" }]
          : []),
        user?.role === "ADMIN"
          ? { href: "/admin", label: "Administração", icon: "shield" as const, color: "text-rose-500" }
          : { href: "/equipe", label: "Configurações", icon: "briefcase" as const, color: "text-cyan-500" },
      ],
    }] : []),
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
      <nav className="flex-1 overflow-y-auto px-2 py-1" aria-label="Navegação principal">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-1">
            <p className="px-3 pb-1 pt-3 text-[10px] font-bold tracking-[0.1em] text-muted/70 uppercase">
              {group.label}
            </p>
            {group.items.map((item) => {
              const active = pathname.startsWith(item.href);
              const showBadge = item.href === "/kanban" && kanbanOverdueCount > 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`sidebar-nav-link ${active ? "active" : ""}`}
                >
                  <Icon
                    name={item.icon}
                    className={`h-4 w-4 shrink-0 transition-opacity duration-150 ${item.color} ${active ? "opacity-100" : "opacity-60"}`}
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
          </div>
        ))}
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
                primeSessionCache(null);
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
            <div className="sidebar-mobile absolute inset-y-0 left-0 w-60">
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

          <main className="page-enter flex-1 px-4 py-6 sm:px-6 lg:px-8">
            {user && <OnboardingTour />}
            {children}
          </main>
        </div>
      </div>
      {user && <GlobalSearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />}
      {scheduleBlock && (
        <AccessBlockedScreen
          startHour={scheduleBlock.startHour}
          endHour={scheduleBlock.endHour}
          allowedDays={scheduleBlock.allowedDays}
        />
      )}
    </TeseFilterProvider>
  );
}
