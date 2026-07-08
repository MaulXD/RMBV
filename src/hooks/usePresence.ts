"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Conecta ao SSE de presença e envia heartbeats a cada 20 s.
 * Retorna o conjunto de IDs de usuários atualmente online.
 */
export function usePresence(enabled = true): Set<string> {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const esRef = useRef<EventSource | null>(null);
  const hbRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    function connect() {
      const es = new EventSource("/api/presence");
      esRef.current = es;

      es.onmessage = (e: MessageEvent<string>) => {
        try {
          const ids: string[] = JSON.parse(e.data);
          setOnlineIds(new Set(ids));
        } catch { /* ignore */ }
      };

      es.onerror = () => {
        es.close();
        // reconnect after 10 s
        setTimeout(connect, 10_000);
      };
    }

    connect();

    async function heartbeat() {
      try {
        await fetch("/api/presence", { method: "POST" });
      } catch { /* ignore */ }
    }

    void heartbeat();
    hbRef.current = setInterval(() => void heartbeat(), 20_000);

    return () => {
      esRef.current?.close();
      if (hbRef.current) clearInterval(hbRef.current);
    };
  }, [enabled]);

  return onlineIds;
}
