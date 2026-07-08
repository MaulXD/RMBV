"use client";
import { useCallback, useEffect, useState } from "react";

export type RecentItem = {
  id: string;
  type: "client" | "chamado" | "ti-chamado";
  name: string;
  href: string;
  subtitle?: string;
  visitedAt: number;
};

const KEY = "scs:recent-items";
const MAX = 10;

function load(): RecentItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function save(items: RecentItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function useRecentItems() {
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    setItems(load());
  }, []);

  const add = useCallback((item: Omit<RecentItem, "visitedAt">) => {
    setItems((prev) => {
      const filtered = prev.filter((i) => i.id !== item.id || i.type !== item.type);
      const next = [{ ...item, visitedAt: Date.now() }, ...filtered].slice(0, MAX);
      save(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string, type: RecentItem["type"]) => {
    setItems((prev) => {
      const next = prev.filter((i) => !(i.id === id && i.type === type));
      save(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    save([]);
    setItems([]);
  }, []);

  return { items, add, remove, clear };
}
