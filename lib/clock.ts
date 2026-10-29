"use client";

import { useSyncExternalStore } from "react";

/**
 * A render-safe "current time". Components read a cached value that refreshes every
 * 15 seconds and whenever demo data changes, so renders stay pure and overdue states update.
 */
let now = typeof window === "undefined" ? 0 : Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

export function bumpNow() {
  now = Date.now();
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  timer ??= setInterval(bumpNow, 15_000);
  return () => {
    listeners.delete(l);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

export function useNow() {
  return useSyncExternalStore(subscribe, () => now, () => 0);
}
