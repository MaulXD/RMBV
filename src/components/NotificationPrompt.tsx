"use client";

import { useEffect, useRef, useState } from "react";

type PushState = "loading" | "unavailable" | "denied" | "granted" | "error";

declare global {
  interface Window {
    PushNotifications?: {
      requestPermissions: () => Promise<{ receive: string }>;
      register: () => Promise<void>;
      addListener: (
        event: string,
        cb: (...args: any[]) => void,
      ) => Promise<{ remove: () => void }>;
    };
  }
}

export function NotificationPrompt() {
  const [state, setState] = useState<PushState>("loading");
  const [isNative, setIsNative] = useState(false);
  const inited = useRef(false);

  useEffect(() => {
    if (inited.current) return;
    inited.current = true;

    (async () => {
      try {
        const mod = await import("@capacitor/core");
        const Capacitor = mod.Capacitor ?? mod.default?.Capacitor;
        if (!Capacitor?.isNativePlatform?.()) {
          setState("unavailable");
          return;
        }
        setIsNative(true);

        const push = await import("@capacitor/push-notifications");
        const PushNotifications = push.PushNotifications ?? push.default?.PushNotifications;
        if (!PushNotifications) {
          setState("unavailable");
          return;
        }
        window.PushNotifications = PushNotifications;

        const perm = await PushNotifications.requestPermissions();
        if (perm.receive === "granted") {
          setState("granted");
          doRegister(PushNotifications);
        } else {
          setState("denied");
        }
      } catch {
        setState("unavailable");
      }
    })();
  }, []);

  async function doRegister(PN: typeof window.PushNotifications) {
    if (!PN) return;
    try {
      const regHandle = await PN.addListener("registration", (token: any) => {
        fetch("/api/ti/push-token", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: token.value ?? token, platform: "android" }),
        }).catch(() => {});
      });
      await PN.register();
      regHandle.remove();
    } catch { /* ignore */ }
  }

  async function handleEnable() {
    if (!window.PushNotifications) return;
    try {
      const perm = await window.PushNotifications.requestPermissions();
      if (perm.receive === "granted") {
        setState("granted");
        doRegister(window.PushNotifications);
      } else {
        setState("denied");
      }
    } catch {
      setState("error");
    }
  }

  if (state === "loading" || state === "granted" || !isNative) return null;

  return (
    <button
      onClick={handleEnable}
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-blue-700"
    >
      <span className="text-lg">🔔</span>
      Ativar notificações
    </button>
  );
}
