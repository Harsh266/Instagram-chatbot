"use client";

import { useSyncExternalStore } from "react";

/** Demo-only sign-in flag. There are no credentials: clicking "Login" signs the presenter in. */
const KEY = "ig-ai-chatbot-demo:session";
const listeners = new Set<() => void>();
let memory = false;

function read(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return memory;
  }
}

function write(v: boolean) {
  memory = v;
  try {
    if (v) window.localStorage.setItem(KEY, "1");
    else window.localStorage.removeItem(KEY);
  } catch {
    // storage unavailable — keep the in-memory flag
  }
  listeners.forEach((l) => l());
}

export const login = () => write(true);
export const logout = () => write(false);

/** null while rendering on the server / hydrating. */
export function useSession(): boolean | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    read,
    () => null,
  );
}
