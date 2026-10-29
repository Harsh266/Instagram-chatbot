import { AlertTriangle, Bot, CalendarClock, Copy, Handshake, KanbanSquare, MessageCircle, Settings2, UserRound, Wrench, BookOpen, type LucideIcon } from "lucide-react";
import type { Activity, ActivityKind } from "@/lib/types";
import { cn, formatDateTime, timeAgo } from "@/lib/utils";

const META: Record<ActivityKind, { icon: LucideIcon; tone: string }> = {
  message_in: { icon: MessageCircle, tone: "bg-pink-50 text-pink-600" },
  bot_reply: { icon: Bot, tone: "bg-brand-50 text-brand-700" },
  reply_failed: { icon: AlertTriangle, tone: "bg-red-50 text-red-600" },
  duplicate: { icon: Copy, tone: "bg-slate-100 text-slate-500" },
  handoff: { icon: Handshake, tone: "bg-violet-50 text-violet-600" },
  agent: { icon: UserRound, tone: "bg-navy-900/5 text-navy-800" },
  lead: { icon: KanbanSquare, tone: "bg-amber-50 text-amber-600" },
  pipeline: { icon: KanbanSquare, tone: "bg-emerald-50 text-emerald-600" },
  followup: { icon: CalendarClock, tone: "bg-sky-50 text-sky-600" },
  setup: { icon: Wrench, tone: "bg-slate-100 text-slate-600" },
  knowledge: { icon: BookOpen, tone: "bg-slate-100 text-slate-600" },
  system: { icon: Settings2, tone: "bg-slate-100 text-slate-500" },
};

export function ActivityFeed({ items, compact }: { items: Activity[]; compact?: boolean }) {
  return (
    <ol className="space-y-3">
      {items.map((a) => {
        const m = META[a.kind];
        const Icon = m.icon;
        return (
          <li key={a.id} className="flex gap-3">
            <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full", m.tone)}>
              <Icon className="size-3.5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium leading-snug text-slate-800">{a.title}</p>
                <time className="shrink-0 text-[10px] text-slate-400" dateTime={new Date(a.at).toISOString()} title={formatDateTime(a.at)}>
                  {timeAgo(a.at)}
                </time>
              </div>
              {a.detail && <p className={cn("mt-0.5 text-[11px] leading-relaxed text-slate-500", compact && "line-clamp-2")}>{a.detail}</p>}
              {a.stage && <span className="mt-1 inline-block rounded bg-slate-100 px-1.5 text-[10px] font-medium text-slate-500">Stage {a.stage}</span>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
