"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "./ThemeProvider";
import { TeseFilterProvider } from "./TeseFilterProvider";
import { TeseFilterBar } from "./TeseFilterBar";

type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "ADV" | "GERENTE" | "COLABORADOR";
  teamId: string | null;
  teamName: string | null;
};

const baseNav = [
  { href: "/dashboard", label: "Clientes" },
  { href: "/clients/new", label: "Novo cliente" },
  { href: "/reports", label: "Relatórios" },
];

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function NavLinks({
  nav,
  pathname,
  onNavigate,
  vertical = false,
}: {
  nav: { href: string; label: string }[];
  pathname: string;
  onNavigate?: () => void;
  vertical?: boolean;
}) {
  return (
    <nav
      className={
        vertical ? "flex flex-col gap-1" : "hidden items-center gap-1 lg:flex"
      }
    >
      {nav.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`rounded-[var(--radius-ui)] px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-ambar-100 font-medium text-ambar-900 dark:bg-ambar-950/40 dark:text-ambar-200"
                : "text-muted hover:bg-platina-200/80 hover:text-foreground dark:hover:bg-grafite-800"
            }`}
          >
            {item.label}
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

  const nav = [
    ...baseNav,
    ...(user?.role && user.role !== "ADMIN"
      ? [{ href: "/equipe", label: "Minha equipe" }]
      : []),
    ...(user?.role === "ADMIN" ? [{ href: "/admin", label: "Administração" }] : []),
  ];

  return (
    <TeseFilterProvider>
      <div className="min-h-screen bg-surface">
        <header className="sticky top-0 z-40 border-b border-border bg-surface-elevated/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <button
                type="button"
                className="btn-ghost shrink-0 px-2.5 py-2 lg:hidden"
                onClick={() => setMenuOpen(true)}
                aria-label="Abrir menu"
                aria-expanded={menuOpen}
              >
                <MenuIcon />
              </button>

              <Link href="/dashboard" className="flex min-w-0 flex-col">
                <span className="text-xs font-semibold tracking-widest text-muted uppercase">
                  RMBV
                </span>
                <span className="truncate text-sm font-semibold text-foreground">
                  {user?.teamName ?? user?.name ?? "Sistema"}
                </span>
              </Link>

              <NavLinks nav={nav} pathname={pathname} />
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="btn-ghost hidden px-3 py-2 text-xs sm:inline-flex"
                title={theme === "dark" ? "Modo claro" : "Modo escuro"}
              >
                {theme === "dark" ? "Claro" : "Escuro"}
              </button>
              <form action="/api/auth/logout" method="post" className="hidden sm:block">
                <button type="submit" className="btn-ghost text-xs">
                  Sair
                </button>
              </form>
            </div>
          </div>
        </header>

        {menuOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-50 bg-grafite-950/50 lg:hidden"
              aria-label="Fechar menu"
              onClick={() => setMenuOpen(false)}
            />
            <aside
              className="fixed inset-y-0 left-0 z-50 flex w-[min(100%,18rem)] flex-col border-r border-border bg-surface-elevated p-4 shadow-xl lg:hidden"
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
                  <CloseIcon />
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
                  className="btn-ghost w-full justify-center text-xs"
                >
                  {theme === "dark" ? "Modo claro" : "Modo escuro"}
                </button>
                <form action="/api/auth/logout" method="post">
                  <button type="submit" className="btn-ghost w-full justify-center">
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
