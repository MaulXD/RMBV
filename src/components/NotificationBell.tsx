"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<{
    top: number;
    width: number;
    left?: number;
    right?: number;
  } | null>(null);
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

  useEffect(() => {
    if (!open) {
      setPanelStyle(null);
      return;
    }

    function updatePosition() {
      const button = buttonRef.current;
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const margin = 8;
      const maxWidth = 320;
      const width = Math.min(maxWidth, window.innerWidth - margin * 2);
      const top = rect.bottom + 6;
      const buttonCenterX = (rect.left + rect.right) / 2;

      if (buttonCenterX < window.innerWidth / 2) {
        // Button on left side (sidebar) — open to the right
        const left = Math.min(rect.left, window.innerWidth - width - margin);
        setPanelStyle({ top, left: Math.max(margin, left), width });
      } else {
        // Button on right side — open to the left
        const right = Math.max(margin, window.innerWidth - rect.right);
        setPanelStyle({ top, right, width });
      }
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

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
        ref={buttonRef}
        type="button"
        className="btn-ghost relative px-2 py-1.5"
        title="Notificações"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="bell" className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open &&
        panelStyle &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[60] bg-black/20 sm:bg-transparent"
              aria-hidden
              onClick={() => setOpen(false)}
            />
            <div
              className="fixed z-[61] overflow-hidden rounded-xl border border-border bg-surface-elevated shadow-xl"
              style={{
                top: panelStyle.top,
                right: panelStyle.right,
                width: panelStyle.width,
              }}
            >
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <span className="text-xs font-semibold">Notificações</span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    className="text-[10px] text-primary"
                    onClick={() => void markAllRead()}
                  >
                    Marcar todas como lidas
                  </button>
                )}
              </div>
              <ul className="max-h-[min(18rem,calc(100dvh-8rem))] overflow-y-auto">
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
          </>,
          document.body,
        )}
    </div>
  );
}
