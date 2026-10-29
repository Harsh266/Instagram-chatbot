"use client";

import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import type { ActivityKind, Workspace } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Card, Eyebrow } from "../ui/primitives";

const STEPS: { kind: ActivityKind; title: string; hint: string; href: string; cta: string }[] = [
  { kind: "message_in", title: "Send a message as a customer", hint: "In the Inbox, type a question such as “What is your website price?”", href: "/inbox", cta: "Open Inbox" },
  { kind: "bot_reply", title: "See the chatbot reply", hint: "It answers from your approved business info. Click “Why this reply?” to see how it decided.", href: "/inbox", cta: "Open Inbox" },
  { kind: "lead", title: "Watch a lead get captured", hint: "Reply as the customer: “My budget is ₹30,000 and I need it this month.”", href: "/inbox", cta: "Open Inbox" },
  { kind: "pipeline", title: "Move the lead in the pipeline", hint: "Drag a lead card to “Contacted” on the Leads board.", href: "/leads", cta: "Open Leads" },
  { kind: "handoff", title: "Hand the chat to a salesperson", hint: "Click “Take over” in a conversation — the chatbot pauses automatically.", href: "/inbox", cta: "Open Inbox" },
  { kind: "followup", title: "Schedule a follow-up", hint: "Create a reminder or a customer follow-up and mark it done.", href: "/follow-ups", cta: "Open Follow-ups" },
];

// Activities created by the sample data have fixed id prefixes; anything else was done by the viewer.
const isSeed = (id: string) => /^a_(seed|lead|setup|dup|pipe)_/.test(id);

export function GuidedTour({ ws }: { ws: Workspace }) {
  const done = new Set(ws.activities.filter((a) => !isSeed(a.id)).map((a) => a.kind));
  const count = STEPS.filter((s) => done.has(s.kind)).length;
  const next = STEPS.findIndex((s) => !done.has(s.kind));

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <Eyebrow>Start here · guided demo</Eyebrow>
          <h2 className="mt-1.5 text-lg font-semibold text-navy-900">Try the full workflow in 6 steps</h2>
        </div>
        <div className="min-w-[160px] text-right">
          <p className="font-mono text-xs text-slate-500">
            {count}/{STEPS.length} completed
          </p>
          <div className="mt-1.5 h-1.5 rounded-full bg-slate-100">
            <div className="h-1.5 rounded-full bg-brand-500 transition-[width] duration-500" style={{ width: `${(count / STEPS.length) * 100}%` }} />
          </div>
        </div>
      </div>
      <ol className="divide-y divide-slate-100">
        {STEPS.map((s, i) => {
          const isDone = done.has(s.kind);
          const isNext = i === next;
          return (
            <li key={s.kind} className={cn("flex items-center gap-4 px-5 py-3.5", isNext && "bg-brand-50/60")}>
              <span className="w-6 shrink-0 font-mono text-xs text-slate-400">{String(i + 1).padStart(2, "0")}</span>
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border",
                  isDone ? "border-brand-500 bg-brand-500 text-navy-950" : "border-slate-300 text-transparent",
                )}
                aria-label={isDone ? "Done" : "Not done yet"}
              >
                <Check className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-semibold", isDone ? "text-slate-500 line-through decoration-slate-300" : "text-navy-900")}>{s.title}</p>
                <p className="text-xs leading-relaxed text-slate-500">{s.hint}</p>
              </div>
              {!isDone && (
                <Link
                  href={s.href}
                  className={cn(
                    "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors",
                    isNext ? "bg-navy-900 text-white hover:bg-navy-700" : "border border-slate-300 text-slate-700 hover:bg-slate-50",
                  )}
                >
                  {s.cta} <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              )}
            </li>
          );
        })}
      </ol>
      {count === STEPS.length && (
        <p className="border-t border-slate-100 bg-brand-50 px-5 py-3 text-sm font-medium text-brand-700">
          You&apos;ve seen the complete workflow. Check Analytics to see your actions reflected in the numbers.
        </p>
      )}
    </Card>
  );
}
