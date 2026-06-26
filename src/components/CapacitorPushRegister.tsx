"use client";

import { useEffect, useState } from "react";

export function CapacitorPushRegister() {
  const [permGranted, setPermGranted] = useState(false);

  useEffect(() => {
    let unregRegistration: (() => void) | undefined;
    let unregError: (() => void) | undefined;
    let unregReceived: (() => void) | undefined;

    const init = async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;
        console.log("[Push] Capacitor nativo detectado");

        const { StatusBar } = await import("@capacitor/status-bar");
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setStyle({ style: "DARK" as never });

        const { PushNotifications } = await import("@capacitor/push-notifications");

        const perm = await PushNotifications.requestPermissions();
        console.log("[Push] Permissão:", perm.receive);
        if (perm.receive !== "granted") {
          setPermGranted(false);
          return;
        }

        setPermGranted(true);

        unregRegistration = PushNotifications.addListener("registration", (token) => {
          console.log("[Push] Token recebido:", token.value);
          fetch("/api/ti/push-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: token.value, platform: "android" }),
          })
            .then((r) => console.log("[Push] Token enviado ao servidor:", r.status))
            .catch((e) => console.error("[Push] Erro ao enviar token:", e));
        }).remove;

        unregError = PushNotifications.addListener("registrationError", (err) => {
          console.error("[Push] Erro no registro:", err);
        }).remove;

        unregReceived = PushNotifications.addListener("pushNotificationReceived", (n) => {
          console.log("[Push] Notificação recebida em primeiro plano:", n.title);
        }).remove;

        await PushNotifications.register();
        console.log("[Push] register() executado com sucesso");
      } catch (err) {
        console.error("[Push] Erro no setup:", err);
      }
    };

    init();

    return () => {
      unregRegistration?.();
      unregError?.();
      unregReceived?.();
    };
  }, []);

  return null;
}
