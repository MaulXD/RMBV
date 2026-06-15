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
  { href: "/clients/new", label: "Novo cliente", icon: "userPlus" },
  { href: "/reports", label: "Relatórios", icon: "reports" },
];

function NavLinks({
  nav,
  pathname,
  onNavigate,
  vertical = false,
}: {
  nav: NavItem[];
  pathname: string;
  onNavigate?: () => void;
  vertical?: boolean;
}) {
  return (
    <nav
      className={
        vertical ? "flex flex-col gap-1" : "hidden items-center gap-0.5 md:flex"
      }
    >
      {nav.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`inline-flex items-center gap-2 rounded-[var(--radius-ui)] px-3 py-2 text-sm transition-colors ${
              active
                ? "nav-link-active"
                : "text-muted hover:bg-white/60 hover:text-foreground dark:hover:bg-white/10"
            }`}
          >
            <Icon name={item.icon} className="h-4 w-4" />
            <span>{item.label}</span>
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
  const [menuOpen, setMenuOpen] = useState(false);

  const showTesePdf =
    pathname.startsWith("/dashboard") || pathname.startsWith("/reports");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => {
      if (mq.matches) setMenuOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

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
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              <button
                type="button"
                className="btn-ghost inline-flex shrink-0 px-2.5 py-2 md:hidden"
                onClick={() => setMenuOpen(true)}
                aria-label="Abrir menu"
                aria-expanded={menuOpen}
              >
                <Icon name="menu" className="h-5 w-5" />
              </button>

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

              <NavLinks nav={nav} pathname={pathname} />
            </div>

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
              <form action="/api/auth/logout" method="post" className="hidden sm:block">
                <button type="submit" className="btn-ghost px-2.5 py-2" title="Sair">
                  <Icon name="logOut" className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </header>

        {menuOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-50 bg-slate-900/40 md:hidden"
              aria-label="Fechar menu"
              onClick={() => setMenuOpen(false)}
            />
            <aside
              className="fixed inset-y-0 left-0 z-50 flex w-[min(100%,18rem)] flex-col border-r border-border bg-surface-elevated p-4 shadow-xl md:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Menu de navegação"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold">Menu</span>
                <button
                  type="button"
                  className="btn-ghost px-2.5 py-2"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Fechar menu"
                >
                  <Icon name="x" className="h-5 w-5" />
                </button>
              </div>

              <NavLinks
                nav={nav}
                pathname={pathname}
                vertical
                onNavigate={() => setMenuOpen(false)}
              />

              <div className="mt-auto space-y-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="btn-ghost w-full justify-center gap-2 text-xs"
                >
                  <Icon name={theme === "dark" ? "sun" : "moon"} className="h-4 w-4" />
                  {theme === "dark" ? "Modo claro" : "Modo escuro"}
                </button>
                <form action="/api/auth/logout" method="post">
                  <button type="submit" className="btn-ghost w-full justify-center gap-2">
                    <Icon name="logOut" className="h-4 w-4" />
                    Sair
                  </button>
                </form>
              </div>
            </aside>
          </>
        )}

        <TeseFilterBar showPdfButton={showTesePdf} />

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
      </div>
    </TeseFilterProvider>
  );
}
