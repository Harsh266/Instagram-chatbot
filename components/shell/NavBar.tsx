"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNow } from "@/lib/clock";
import { isSetupComplete } from "@/lib/setup";
import type { Workspace } from "@/lib/types";
import { cn } from "@/lib/utils";
import { NAV } from "./nav";

function indicators(ws: Workspace | null, now: number): Record<string, { text?: string; tone: string; label: string } | undefined> {
  if (!ws) return {};
  const unread = ws.conversations.reduce((n, c) => n + c.unread, 0);
  const hot = ws.leads.filter((l) => l.category === "hot" && l.stage !== "won" && l.stage !== "lost").length;
  const overdue = ws.followUps.filter((f) => f.status === "scheduled" && f.dueAt < now).length;
  return {
    "/setup": isSetupComplete(ws) ? undefined : { tone: "bg-amber-400", label: "Setup incomplete" },
    "/inbox": unread ? { text: String(unread), tone: "bg-brand-500 text-navy-950", label: `${unread} unread` } : undefined,
    "/leads": hot ? { text: String(hot), tone: "bg-red-500 text-white", label: `${hot} hot leads` } : undefined,
    "/follow-ups": overdue ? { text: String(overdue), tone: "bg-amber-400 text-navy-950", label: `${overdue} overdue` } : undefined,
    "/settings": ws.settings.chatbotEnabled ? undefined : { tone: "bg-slate-400", label: "Chatbot off" },
  };
}

/** Second header row: page navigation with an accent underline on the active page. */
export function NavBar({ ws }: { ws: Workspace | null }) {
  const pathname = usePathname();
  const now = useNow();
  const ind = indicators(ws, now);
  const botOn = ws?.settings.chatbotEnabled;

  return (
    <div className="border-t border-slate-100">
      <div className="mx-auto flex max-w-[1600px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <nav aria-label="Main navigation" className="-mb-px flex flex-1 gap-1 overflow-x-auto">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const badge = ind[item.href];
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.description}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-12 shrink-0 items-center gap-2 border-b-2 px-3 text-sm transition-colors",
                  active ? "border-brand-500 font-semibold text-navy-900" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-navy-900",
                )}
              >
                <Icon className={cn("size-4", active ? "text-brand-700" : "text-slate-400")} aria-hidden />
                {item.label}
                {badge && (
                  <span
                    className={cn("flex items-center justify-center rounded-full text-[10px] font-bold", badge.text ? "h-5 min-w-5 px-1.5" : "size-2", badge.tone)}
                    aria-label={badge.label}
                    title={badge.label}
                  >
                    {badge.text}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <span className="hidden shrink-0 items-center gap-2 font-mono text-[11px] uppercase tracking-[0.15em] text-slate-500 lg:flex">
          <span className={cn("size-2 rounded-full", botOn ? "bg-brand-500 shadow-[0_0_0_3px_rgba(183,183,27,0.2)]" : "bg-slate-300")} aria-hidden />
          {botOn ? "Chatbot active" : "Chatbot off"}
        </span>
      </div>
    </div>
  );
}
