"use client";

/**
 * Solicita permissão para notificações nativas e exibe banners do SO sempre que
 * uma notificação não-lida nova aparecer no sistema (polling a cada 30s).
 * Funciona independente do Firebase — usa a Web Notifications API padrão.
 */

import { useEffect, useRef } from "react";
import { useSession } from "./SessionProvider";

let lastKnownIds = new Set<string>();
let permissionRequested = false;

async function requestPermission(): Promise<boolean> {
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  if (permissionRequested) return false;
  permissionRequested = true;
  const result = await Notification.requestPermission();
  return result === "granted";
}

function showNative(title: string, body: string, href?: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const n = new Notification(title, {
    body,
    icon: "/icons/icon-192.png",
    tag: href ?? title,
    requireInteraction: false,
  });
  if (href) {
    n.onclick = () => {
      window.focus();
      window.location.assign(href);
      n.close();
    };
  }
}

export function WebNotificationManager() {
  const { user } = useSession();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) return;

    void requestPermission();

    async function poll() {
      try {
        const res = await fetch("/api/notifications?unread=true&limit=20");
        if (!res.ok) return;
        const data = (await res.json()) as {
          notifications: { id: string; title: string; body: string | null; href: string | null; read: boolean }[];
        };

        const fresh = data.notifications.filter((n) => !n.read && !lastKnownIds.has(n.id));

        if (lastKnownIds.size > 0) {
          for (const n of fresh) {
            showNative(n.title, n.body ?? "", n.href ?? undefined);
          }
        }

        data.notifications.forEach((n) => lastKnownIds.add(n.id));

        if (lastKnownIds.size > 200) {
          const arr = [...lastKnownIds].slice(-100);
          lastKnownIds = new Set(arr);
        }
      } catch {
        // network errors are silent
      }
    }

    void poll();
    timerRef.current = setInterval(() => void poll(), 30_000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [user]);

  return null;
}
