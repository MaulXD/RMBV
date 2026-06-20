"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TeseFilterProvider } from "@/components/TeseFilterProvider";
import { Sidebar } from "@/components/Sidebar";
import { Icon } from "@/components/ui/Icon";
import { OnboardingTour } from "@/components/OnboardingTour";
import { AccessBlockedScreen } from "@/components/AccessBlockedScreen";
import { GlobalSearchPalette, useGlobalSearchShortcut } from "@/components/GlobalSearchPalette";
import { useSession } from "@/components/SessionProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  const pathname = usePathname();
  const [kanbanOverdueCount, setKanbanOverdueCount] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scheduleBlock, setScheduleBlock] = useState<{
    startHour: number;
    endHour: number;
    allowedDays: number[];
  } | null>(null);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  useGlobalSearchShortcut(openSearch);

  useEffect(() => {
    if (!user) { setKanbanOverdueCount(0); return; }
    let cancelled = false;
    const load = () => {
      fetch("/api/tasks/alerts")
        .then((r) => r.json())
        .then((d) => { if (!cancelled) setKanbanOverdueCount(d.counts?.overdue ?? 0); })
        .catch(() => { if (!cancelled) setKanbanOverdueCount(0); });
    };
    load();
    const id = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [user, pathname]);

  useEffect(() => {
    if (!user || user.role !== "COLABORADOR") return;
    let cancelled = false;
    const check = () => {
      fetch("/api/equipe/schedule-check")
        .then((r) => r.json())
        .then((d: { allowed: boolean; startHour?: number; endHour?: number; allowedDays?: number[] }) => {
          if (cancelled) return;
          if (!d.allowed && d.startHour !== undefined && d.endHour !== undefined) {
            setScheduleBlock({ startHour: d.startHour, endHour: d.endHour, allowedDays: d.allowedDays ?? [1, 2, 3, 4, 5] });
          } else {
            setScheduleBlock(null);
          }
        })
        .catch(() => {});
    };
    check();
    const id = setInterval(check, 60_000);
    window.addEventListener("focus", check);
    return () => { cancelled = true; clearInterval(id); window.removeEventListener("focus", check); };
  }, [user]);

  // Close mobile sidebar on route change
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  return (
    <TeseFilterProvider>
      <div className="relative flex min-h-screen">
        {/* Dark mode atmosphere */}
        <div className="pointer-events-none fixed inset-0 hidden dark:block" style={{ zIndex: 0 }}>
          <div className="absolute -top-40 left-1/3 h-[600px] w-[600px] rounded-full bg-indigo-700/20 blur-[160px]" />
          <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-violet-700/15 blur-[140px]" />
          <div className="absolute left-0 top-1/2 h-[400px] w-[400px] -translate-y-1/2 rounded-full bg-blue-800/10 blur-[120px]" />
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(99,102,241,1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,1) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        {/* Desktop sidebar — sticky */}
        <div className="relative sticky top-0 hidden h-screen shrink-0 overflow-y-auto lg:flex lg:flex-col" style={{ zIndex: 1 }}>
          <Sidebar
            onMobileClose={() => {}}
            onSearch={openSearch}
            kanbanOverdueCount={kanbanOverdueCount}
          />
        </div>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="sidebar-mobile absolute inset-y-0 left-0">
              <Sidebar
                onMobileClose={() => setSidebarOpen(false)}
                onSearch={openSearch}
                kanbanOverdueCount={kanbanOverdueCount}
              />
            </div>
          </div>
        )}

        {/* Content column */}
        <div className="relative flex min-h-screen min-w-0 flex-1 flex-col" style={{ zIndex: 1 }}>
          {/* Mobile top bar */}
          <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface-elevated/95 px-4 backdrop-blur-md dark:border-white/[0.07] dark:bg-[rgb(8_12_24_/_0.85)] lg:hidden">
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
                <button type="button" className="btn-ghost px-2 py-1.5" onClick={openSearch} title="Buscar">
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
