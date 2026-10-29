"use client";

import { AlertCircle, Bot, Check, CheckCheck, RotateCcw } from "lucide-react";
import { useState } from "react";
import type { Message, TeamMember } from "@/lib/types";
import { SOURCE_LABEL, cn, formatTime } from "@/lib/utils";

function StatusIcon({ m }: { m: Message }) {
  if (m.status === "failed") return <AlertCircle className="size-3 text-red-300" aria-label="Failed" />;
  if (m.status === "seen") return <CheckCheck className="size-3 text-brand-500" aria-label="Seen" />;
  if (m.status === "delivered") return <CheckCheck className="size-3 opacity-70" aria-label="Delivered" />;
  return <Check className="size-3 opacity-70" aria-label="Sent" />;
}

export function MessageBubble({ m, agent, onRetry }: { m: Message; agent?: TeamMember; onRetry: (id: string) => void }) {
  const [showLogic, setShowLogic] = useState(false);
  if (m.sender === "system")
    return (
      <div className="my-3 flex justify-center">
        <p className="max-w-[85%] rounded-full bg-slate-100 px-3 py-1 text-center text-[11px] text-slate-500">
          {m.text} · {formatTime(m.at)}
        </p>
      </div>
    );

  const out = m.sender !== "customer";
  return (
    <div className={cn("animate-fade-in flex flex-col", out ? "items-end" : "items-start")}>
      {m.sender === "agent" && <p className="mb-0.5 mr-1 text-[10px] font-medium text-slate-500">{agent?.name ?? "Team member"} · Human agent</p>}
      {m.sender === "bot" && (
        <p className="mb-0.5 mr-1 flex items-center gap-1 text-[10px] font-medium text-brand-700">
          <Bot className="size-3" aria-hidden /> Simulated chatbot reply
        </p>
      )}
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed sm:max-w-[75%]",
          m.sender === "customer" && "rounded-bl-md bg-slate-100 text-slate-800",
          m.sender === "bot" && "rounded-br-md bg-navy-900 text-white",
          m.sender === "agent" && "rounded-br-md bg-brand-100 text-navy-900 ring-1 ring-inset ring-brand-200",
          m.status === "failed" && "ring-2 ring-red-400",
        )}
      >
        <p className="whitespace-pre-wrap break-words">{m.text}</p>
        <p className={cn("mt-1 flex items-center justify-end gap-1 text-[10px]", m.sender === "bot" ? "text-white/60" : "text-slate-500")}>
          {formatTime(m.at)}
          {out && <StatusIcon m={m} />}
        </p>
      </div>
      {m.sender === "bot" && m.source && (
        <p className="mr-1 mt-0.5 max-w-[85%] text-right text-[10px] text-slate-400">
          Source: {SOURCE_LABEL[m.source.type]} — {m.source.label}
          {m.responseMs ? ` · ${(m.responseMs / 1000).toFixed(1)}s` : ""}
          {m.logic && (
            <>
              {" · "}
              <button type="button" onClick={() => setShowLogic((s) => !s)} aria-expanded={showLogic} className="font-medium text-brand-700 hover:underline">
                {showLogic ? "Hide logic" : "Why this reply?"}
              </button>
            </>
          )}
        </p>
      )}
      {showLogic && m.logic && (
        <dl className="animate-fade-in mr-1 mt-1 w-full max-w-[85%] space-y-1 rounded-xl border border-brand-100 bg-brand-50/60 p-3 text-[11px] sm:max-w-[75%]">
          {(
            [
              ["1 · Intent detected", m.logic.intent.replace("_", " ")],
              ["2 · Business information checked", m.logic.matched.length ? m.logic.matched.join(" · ") : "No approved entry matched"],
              ["3 · Lead details captured", m.logic.captured.length ? m.logic.captured.join(" · ") : "Nothing new"],
              ["4 · Result", m.logic.outcome],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="grid grid-cols-1 gap-0.5 sm:grid-cols-[150px_1fr] sm:gap-2">
              <dt className="font-semibold text-navy-800">{k}</dt>
              <dd className="text-slate-600">{v}</dd>
            </div>
          ))}
          <p className="pt-1 text-[10px] text-slate-400">Local keyword rules — not a real AI model.</p>
        </dl>
      )}
      {m.status === "failed" && (
        <p className="mr-1 mt-1 flex items-center gap-2 text-[11px] text-red-600">
          Not delivered (simulated failure) — team alerted.
          <button type="button" onClick={() => onRetry(m.id)} className="inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline">
            <RotateCcw className="size-3" aria-hidden /> Retry
          </button>
        </p>
      )}
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex flex-col items-end" role="status" aria-label="Simulated chatbot is preparing a reply">
      <p className="mb-0.5 mr-1 flex items-center gap-1 text-[10px] font-medium text-brand-700">
        <Bot className="size-3" aria-hidden /> Checking approved business information…
      </p>
      <div className="flex gap-1 rounded-2xl rounded-br-md bg-brand-50 px-4 py-3">
        {[0, 1, 2].map((i) => (
          <span key={i} className="typing-dot size-1.5 rounded-full bg-brand-500" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}
