"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "./ThemeProvider";
import { TeseFilterProvider } from "./TeseFilterProvider";
import { TeseFilterBar } from "./TeseFilterBar";
import { Icon, type IconName } from "./ui/Icon";

type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "ADV" | "GERENTE" | "COLABORADOR";
  teamId: string | null;
  teamName: string | null;
};

type NavItem = { href: string; label: string; icon: IconName };

const baseNav: NavItem[] = [
  { href: "/dashboard", label: "Clientes", icon: "dashboard" },
  { href: "/kanban", label: "Kanban", icon: "kanban" },
  { href: "/clients/new", label: "Novo cliente", icon: "userPlus" },
  { href: "/reports", label: "Relatórios", icon: "reports" },
];

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
    <nav className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {nav.map((item) => {
        const active = pathname.startsWith(item.href);
        const showOverdueBadge = item.href === "/kanban" && kanbanOverdueCount > 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`inline-flex shrink-0 items-center gap-2 rounded-[var(--radius-ui)] px-3 py-2 text-sm transition-colors ${
              active
                ? "nav-link-active"
                : "text-muted hover:bg-white/60 hover:text-foreground dark:hover:bg-white/10"
            }`}
          >
            <Icon name={item.icon} className="h-4 w-4" />
            <span className="whitespace-nowrap">{item.label}</span>
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
  const [user, setUser] = useState<SessionUser | null>(null);
  const [kanbanOverdueCount, setKanbanOverdueCount] = useState(0);

  const showTesePdf =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/kanban");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .catch(() => setUser(null));
  }, []);

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
    ...baseNav,
    ...(user?.role && user.role !== "ADMIN"
      ? [{ href: "/equipe", label: "Minha equipe", icon: "briefcase" as const }]
      : []),
    ...(user?.role === "ADMIN"
      ? [{ href: "/admin", label: "Administração", icon: "shield" as const }]
      : []),
  ];

  return (
    <TeseFilterProvider>
      <div className="min-h-screen bg-surface">
        <header className="sticky top-0 z-40 border-b border-border bg-surface-elevated/90 backdrop-blur-md">
          <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <Link href="/dashboard" className="flex min-w-0 shrink-0 items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-ui)] border border-border bg-white/70 text-primary dark:bg-primary/15">
                  <Icon name="fileText" className="h-4 w-4" />
                </span>
                <span className="hidden min-w-0 flex-col sm:flex">
                  <span className="text-[10px] font-semibold tracking-widest text-muted uppercase">
                    RMBV
                  </span>
                  <span className="truncate text-sm font-semibold text-foreground">
                    {user?.teamName ?? user?.name ?? "Sistema"}
                  </span>
                </span>
              </Link>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="btn-ghost px-2.5 py-2"
                  title={theme === "dark" ? "Modo claro" : "Modo escuro"}
                  aria-label={theme === "dark" ? "Modo claro" : "Modo escuro"}
                >
                  <Icon name={theme === "dark" ? "sun" : "moon"} className="h-4 w-4" />
                </button>
                <form action="/api/auth/logout" method="post">
                  <button type="submit" className="btn-ghost px-2.5 py-2" title="Sair">
                    <Icon name="logOut" className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>

            <NavLinks nav={nav} pathname={pathname} kanbanOverdueCount={kanbanOverdueCount} />
          </div>
        </header>

        <TeseFilterBar showPdfButton={showTesePdf} />

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
      </div>
    </TeseFilterProvider>
  );
}
