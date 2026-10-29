"use client";

import { Bot, Hand, MessageCircle, PauseCircle, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { Conversation, Workspace } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";
import { CategoryBadge } from "../leads/LeadBadges";
import { Avatar, EmptyState, Select } from "../ui/primitives";

export type ConvFilter = "all" | "unread" | "new" | "hot" | "human" | "paused" | "closed";

const FILTERS: { value: ConvFilter; label: string }[] = [
  { value: "all", label: "All Conversations" },
  { value: "unread", label: "Unread" },
  { value: "new", label: "New Leads" },
  { value: "hot", label: "Hot Leads" },
  { value: "human", label: "Human Handoff" },
  { value: "paused", label: "Bot Paused" },
  { value: "closed", label: "Closed Conversations" },
];

export function ConversationList({
  ws,
  selectedId,
  onSelect,
  typing,
}: {
  ws: Workspace;
  selectedId: string | null;
  onSelect: (id: string) => void;
  typing: string[];
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<ConvFilter>("all");
  const [sort, setSort] = useState<"recent" | "unread" | "name">("recent");

  const customers = useMemo(() => new Map(ws.customers.map((c) => [c.id, c])), [ws.customers]);
  const leads = useMemo(() => new Map(ws.leads.map((l) => [l.conversationId, l])), [ws.leads]);
  const lastMsg = useMemo(() => {
    const m = new Map<string, Workspace["messages"][number]>();
    for (const msg of ws.messages) if (msg.sender !== "system") m.set(msg.conversationId, msg);
    return m;
  }, [ws.messages]);

  const match = (c: Conversation) => {
    const lead = leads.get(c.id);
    switch (filter) {
      case "unread":
        return c.unread > 0;
      case "new":
        return lead?.stage === "new";
      case "hot":
        return lead?.category === "hot";
      case "human":
        return c.handledBy === "human";
      case "paused":
        return c.botPaused;
      case "closed":
        return c.status === "closed";
      default:
        return true;
    }
  };
  const s = q.trim().toLowerCase();
  const list = ws.conversations
    .filter((c) => {
      const cu = customers.get(c.customerId);
      return match(c) && (!s || cu?.name.toLowerCase().includes(s) || cu?.username.toLowerCase().includes(s) || lastMsg.get(c.id)?.text.toLowerCase().includes(s));
    })
    .sort((a, b) =>
      sort === "name"
        ? (customers.get(a.customerId)?.name ?? "").localeCompare(customers.get(b.customerId)?.name ?? "")
        : sort === "unread"
          ? b.unread - a.unread || b.lastMessageAt - a.lastMessageAt
          : b.lastMessageAt - a.lastMessageAt,
    );

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2 border-b border-slate-100 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search conversations"
            aria-label="Search conversations"
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <div className="flex gap-2">
          <Select value={filter} onChange={(e) => setFilter(e.target.value as ConvFilter)} className="h-9 min-w-0 flex-1 text-xs" aria-label="Filter conversations">
            {FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </Select>
          <Select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="h-9 w-28 text-xs" aria-label="Sort conversations">
            <option value="recent">Recent</option>
            <option value="unread">Unread first</option>
            <option value="name">Name</option>
          </Select>
        </div>
      </div>
      <ul className="flex-1 overflow-y-auto" aria-label="Conversations">
        {list.length === 0 && <EmptyState icon={MessageCircle} title="No conversations" description={s || filter !== "all" ? "Nothing matches this search or filter." : "Simulate a customer message to start."} />}
        {list.map((c) => {
          const cu = customers.get(c.customerId);
          if (!cu) return null;
          const lead = leads.get(c.id);
          const lm = lastMsg.get(c.id);
          const isTyping = typing.includes(c.id);
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onSelect(c.id)}
                aria-current={selectedId === c.id ? "true" : undefined}
                className={cn(
                  "flex w-full gap-3 border-b border-slate-50 px-3 py-3 text-left transition-colors",
                  selectedId === c.id ? "bg-brand-50/70" : "hover:bg-slate-50",
                  c.status === "closed" && "opacity-70",
                )}
              >
                <span className="relative">
                  <Avatar name={cu.name} color={cu.color} />
                  <span
                    className={cn("absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full ring-2 ring-white", c.botPaused ? "bg-amber-500" : "bg-navy-900")}
                    title={c.botPaused ? "Chatbot paused" : "Chatbot enabled"}
                  >
                    {c.botPaused ? <PauseCircle className="size-2.5 text-white" aria-label="Chatbot paused" /> : <Bot className="size-2.5 text-brand-400" aria-label="Chatbot enabled" />}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className={cn("truncate text-sm", c.unread ? "font-semibold text-navy-900" : "font-medium text-slate-800")}>{cu.name}</span>
                    <span className="shrink-0 text-[10px] text-slate-400">{timeAgo(c.lastMessageAt)}</span>
                  </span>
                  <span className="block truncate text-[11px] text-slate-400">@{cu.username}</span>
                  <span className={cn("mt-0.5 block truncate text-xs", c.unread ? "text-slate-700" : "text-slate-500")}>
                    {isTyping ? <em className="text-brand-700">Chatbot is replying…</em> : `${lm?.sender === "customer" ? "" : lm?.sender === "agent" ? "Team: " : "Bot: "}${lm?.text ?? ""}`}
                  </span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-1">
                    {lead && <CategoryBadge category={lead.category} />}
                    {c.handledBy === "human" && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
                        <Hand className="size-2.5" aria-hidden /> Human
                      </span>
                    )}
                    {c.status === "closed" && <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">Closed</span>}
                  </span>
                </span>
                {c.unread > 0 && (
                  <span className="mt-1 flex h-5 min-w-5 items-center justify-center self-start rounded-full bg-brand-500 px-1.5 text-[10px] font-semibold text-navy-950" aria-label={`${c.unread} unread`}>
                    {c.unread}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
