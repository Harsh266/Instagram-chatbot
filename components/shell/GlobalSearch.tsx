"use client";

import { BookOpen, CalendarClock, KanbanSquare, MessageCircle, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import type { Workspace } from "@/lib/types";
import { CATEGORY_LABEL, cn } from "@/lib/utils";

interface Result {
  key: string;
  group: string;
  label: string;
  sub: string;
  href: string;
  icon: typeof Search;
}

function searchWorkspace(ws: Workspace, q: string): Result[] {
  const s = q.trim().toLowerCase();
  if (s.length < 2) return [];
  const out: Result[] = [];
  const name = (id: string) => ws.customers.find((c) => c.id === id);
  for (const conv of ws.conversations) {
    const c = name(conv.customerId);
    if (!c) continue;
    const msg = ws.messages.find((m) => m.conversationId === conv.id && m.text.toLowerCase().includes(s));
    if (c.name.toLowerCase().includes(s) || c.username.toLowerCase().includes(s) || msg)
      out.push({ key: conv.id, group: "Conversations", label: c.name, sub: msg ? `“${msg.text.slice(0, 60)}”` : `@${c.username}`, href: `/inbox?c=${conv.id}`, icon: MessageCircle });
  }
  for (const l of ws.leads) {
    const c = name(l.customerId);
    if (c && (c.name.toLowerCase().includes(s) || (l.interest ?? "").toLowerCase().includes(s)))
      out.push({ key: l.id, group: "Leads", label: c.name, sub: `${CATEGORY_LABEL[l.category]} · ${l.interest ?? "Interest unknown"}`, href: `/leads?lead=${l.id}`, icon: KanbanSquare });
  }
  for (const p of ws.products)
    if (p.name.toLowerCase().includes(s) || p.keywords.some((k) => k.includes(s)))
      out.push({ key: p.id, group: "Knowledge", label: p.name, sub: "Service / product", href: `/knowledge?q=${encodeURIComponent(p.name)}`, icon: BookOpen });
  for (const k of ws.knowledge)
    if (k.title.toLowerCase().includes(s) || k.content.toLowerCase().includes(s))
      out.push({ key: k.id, group: "Knowledge", label: k.title, sub: k.content.slice(0, 60), href: `/knowledge?q=${encodeURIComponent(k.title)}`, icon: BookOpen });
  for (const f of ws.followUps) {
    const c = name(f.customerId);
    if (c && (c.name.toLowerCase().includes(s) || f.notes.toLowerCase().includes(s)))
      out.push({ key: f.id, group: "Follow-ups", label: c.name, sub: f.notes || f.message || "Follow-up task", href: `/follow-ups?q=${encodeURIComponent(c.name)}`, icon: CalendarClock });
  }
  return out.slice(0, 12);
}

export function GlobalSearch({ ws }: { ws: Workspace | null }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const results = useMemo(() => (ws ? searchWorkspace(ws, q) : []), [ws, q]);

  const go = (r: Result) => {
    router.push(r.href);
    setOpen(false);
    setQ("");
  };

  return (
    <div
      ref={box}
      className="relative w-full max-w-md"
      onBlur={(e) => {
        if (!box.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
      <input
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && results[active]) go(results[active]);
          else if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Search customers, leads, knowledge…"
        aria-label="Global search"
        className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      />
      {open && q.trim().length >= 2 && (
        <div className="animate-fade-in absolute left-0 right-0 top-full z-40 mt-2 max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl" role="listbox">
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-slate-500">No results for “{q}”.</p>
          ) : (
            results.map((r, i) => {
              const Icon = r.icon;
              const showGroup = i === 0 || results[i - 1].group !== r.group;
              return (
                <div key={r.group + r.key}>
                  {showGroup && <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{r.group}</p>}
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === active}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(r)}
                    className={cn("flex w-full items-center gap-3 px-4 py-2 text-left", i === active && "bg-slate-50")}
                  >
                    <Icon className="size-4 shrink-0 text-slate-400" aria-hidden />
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-slate-800">{r.label}</span>
                      <span className="block truncate text-xs text-slate-500">{r.sub}</span>
                    </span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
