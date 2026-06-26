"use client";

import { useEffect } from "react";

export function CapacitorPushRegister() {
  useEffect(() => {
    try {
      const loadCapacitor = async () => {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        const { StatusBar } = await import("@capacitor/status-bar");
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setStyle({ style: "DARK" as never });

        const { PushNotifications } = await import("@capacitor/push-notifications");
        const perm = await PushNotifications.requestPermissions();
        if (perm.receive !== "granted") return;

        await PushNotifications.register();
        PushNotifications.addListener("registration", (token) => {
          console.log("Push token:", token.value);
          fetch("/api/ti/push-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: token.value, platform: "android" }),
          }).catch(() => {});
        });

        PushNotifications.addListener("pushNotificationReceived", (n) => {
          if (n.title) {
            new Notification(n.title, { body: n.body, icon: "/favicon.ico" });
          }
        });
      };
      loadCapacitor();
    } catch { /* não é capacitor */ }
  }, []);

  return null;
}
