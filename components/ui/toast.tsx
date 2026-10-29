"use client";

import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";
interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

let items: ToastItem[] = [];
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const empty: ToastItem[] = [];

export function toast(message: string, tone: ToastTone = "success") {
  const id = ++seq;
  items = [...items, { id, message, tone }].slice(-4);
  emit();
  setTimeout(() => dismiss(id), tone === "error" ? 6000 : 3800);
}

function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

export function Toaster() {
  const list = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => items,
    () => empty,
  );
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6" aria-live="polite">
      {list.map((t) => {
        const Icon = t.tone === "success" ? CheckCircle2 : t.tone === "error" ? AlertTriangle : Info;
        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              "animate-fade-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-white px-4 py-3 text-sm shadow-lg",
              t.tone === "error" ? "border-red-200" : "border-slate-200",
            )}
          >
            <Icon
              className={cn(
                "mt-0.5 size-4 shrink-0",
                t.tone === "success" ? "text-emerald-600" : t.tone === "error" ? "text-red-600" : "text-brand-700",
              )}
              aria-hidden
            />
            <p className="flex-1 text-slate-700">{t.message}</p>
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss notification" className="text-slate-400 hover:text-slate-700">
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
