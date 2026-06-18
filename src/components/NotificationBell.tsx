"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "./ui/Icon";

type Notification = {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  createdAt: string;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => {
        setNotifications(d.notifications ?? []);
        setUnreadCount(d.unreadCount ?? 0);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    load();
  }

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    load();
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="btn-ghost relative px-2 py-1.5"
        title="Notificações"
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="bell" className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-80 overflow-hidden rounded-xl border border-border bg-surface-elevated shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-xs font-semibold">Notificações</span>
              {unreadCount > 0 && (
                <button type="button" className="text-[10px] text-primary" onClick={() => void markAllRead()}>
                  Marcar todas como lidas
                </button>
              )}
            </div>
            <ul className="max-h-72 overflow-y-auto">
              {notifications.length === 0 && (
                <li className="px-3 py-6 text-center text-xs text-muted">Nenhuma notificação</li>
              )}
              {notifications.map((n) => (
                <li key={n.id} className={`border-b border-border/50 ${n.read ? "opacity-70" : ""}`}>
                  {n.href ? (
                    <Link
                      href={n.href}
                      className="block px-3 py-2 text-sm hover:bg-surface"
                      onClick={() => {
                        if (!n.read) void markRead(n.id);
                        setOpen(false);
                      }}
                    >
                      <p className="font-medium">{n.title}</p>
                      {n.body && <p className="text-xs text-muted">{n.body}</p>}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-surface"
                      onClick={() => !n.read && void markRead(n.id)}
                    >
                      <p className="font-medium">{n.title}</p>
                      {n.body && <p className="text-xs text-muted">{n.body}</p>}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
