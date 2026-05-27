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
};

const baseNav = [
  { href: "/dashboard", label: "Clientes" },
  { href: "/clients/new", label: "Novo cliente" },
  { href: "/reports", label: "Relatórios" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<SessionUser | null>(null);

  const showTesePdf =
    pathname.startsWith("/dashboard") || pathname.startsWith("/reports");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .catch(() => setUser(null));
  }, []);

  const nav = [
    ...baseNav,
    ...(user?.role === "ADMIN" ? [{ href: "/admin", label: "Administração" }] : []),
  ];

  const currentTitle =
    nav.find((n) => pathname.startsWith(n.href))?.label ??
    (pathname.startsWith("/clients/") ? "Cliente" : "RMBV");

  return (
    <TeseFilterProvider>
      <div className="min-h-screen bg-surface">
        <div className="mx-auto flex min-h-screen max-w-7xl gap-6 px-4 py-4 sm:px-6">
          <aside className="industrial-panel hidden w-64 shrink-0 p-4 md:flex md:flex-col">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-semibold tracking-widest uppercase text-muted">
                  RMBV
                </span>
                <span className="mt-1 text-sm font-semibold text-foreground">
                  {user?.name ?? "Sistema"}
                </span>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className="btn-ghost px-3 py-2 text-xs"
                title={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
              >
                {theme === "dark" ? "Claro" : "Escuro"}
              </button>
            </div>

            <nav className="mt-4 flex flex-col gap-1">
              {nav.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-[var(--radius-ui)] px-3 py-2.5 text-sm transition-colors ${
                      active
                        ? "bg-ambar-100 text-ambar-900 dark:bg-ambar-950/40 dark:text-ambar-200"
                        : "text-muted hover:bg-platina-100 hover:text-foreground dark:hover:bg-grafite-800"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto pt-4">
              <form action="/api/auth/logout" method="post">
                <button type="submit" className="btn-ghost w-full justify-center">
                  Sair
                </button>
              </form>
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <header className="industrial-panel flex items-center justify-between px-4 py-3 md:hidden">
              <div className="flex flex-col">
                <span className="text-xs font-semibold tracking-widest uppercase text-muted">
                  RMBV
                </span>
                <span className="text-sm font-semibold">{currentTitle}</span>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={toggleTheme} className="btn-ghost">
                  {theme === "dark" ? "Claro" : "Escuro"}
                </button>
                <form action="/api/auth/logout" method="post">
                  <button type="submit" className="btn-ghost">
                    Sair
                  </button>
                </form>
              </div>
            </header>

            <div className="industrial-panel overflow-hidden">
              <TeseFilterBar showPdfButton={showTesePdf} />
            </div>

            <main className="min-w-0">{children}</main>
          </div>
        </div>
      </div>
    </TeseFilterProvider>
  );
}
