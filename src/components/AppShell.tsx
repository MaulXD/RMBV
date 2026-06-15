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

  return (
    <TeseFilterProvider>
      <div className="min-h-screen bg-surface">
        <header className="border-b border-border bg-surface-elevated">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-8">
              <span className="text-sm font-semibold tracking-widest uppercase text-muted">
                RMBV System
              </span>
              <nav className="flex gap-1">
                {nav.map((item) => {
                  const active = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`rounded-[var(--radius-ui)] px-3 py-2 text-sm transition-colors ${
                        active
                          ? "bg-grafite-900 text-platina-50 dark:bg-platina-100 dark:text-grafite-950"
                          : "text-muted hover:text-foreground"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex items-center gap-2">
              {user && (
                <span className="hidden text-xs text-muted sm:inline">{user.name}</span>
              )}
              <button type="button" onClick={toggleTheme} className="btn-ghost">
                {theme === "dark" ? "Modo claro" : "Modo escuro"}
              </button>
              <form action="/api/auth/logout" method="post">
                <button type="submit" className="btn-ghost">
                  Sair
                </button>
              </form>
            </div>
          </div>
        </header>
        <TeseFilterBar showPdfButton={showTesePdf} />
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </div>
    </TeseFilterProvider>
  );
}
