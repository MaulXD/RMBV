"use client";
import { createContext, useContext } from "react";

export const PresenceContext = createContext<Set<string>>(new Set());

export function useOnlineIds(): Set<string> {
  return useContext(PresenceContext);
}
