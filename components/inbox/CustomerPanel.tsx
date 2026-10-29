"use client";

import { ArrowLeft, CalendarPlus, CheckCircle2, ExternalLink, Hand, PauseCircle, PlayCircle, RotateCcw, StickyNote } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { actions, newFollowUp, useDemoState } from "@/lib/store";
import type { Conversation, FollowUp, Workspace } from "@/lib/types";
import { formatDateTime, formatINR, timeAgo } from "@/lib/utils";
import { ActivityFeed } from "../activity/ActivityFeed";
import { FollowUpForm } from "../followups/FollowUpForm";
import { CategoryBadge, StageBadge } from "../leads/LeadBadges";
import { Avatar, Button, Select, Textarea } from "../ui/primitives";
import { toast } from "../ui/toast";

export function CustomerPanel({ ws, conv, onBack }: { ws: Workspace; conv: Conversation; onBack: () => void }) {
  const state = useDemoState();
  const customer = ws.customers.find((c) => c.id === conv.customerId)!;
  const lead = ws.leads.find((l) => l.conversationId === conv.id);
  const [note, setNote] = useState("");
  const [fu, setFu] = useState<FollowUp | null>(null);
  const [agent, setAgent] = useState(conv.assignedTo ?? ws.team[0]?.id ?? "");
  const activity = ws.activities.filter((a) => a.conversationId === conv.id).slice(0, 15);
  const pending = ws.followUps.filter((f) => f.conversationId === conv.id && f.status === "scheduled");

  const fields: [string, string | null][] = [
    ["Interested in", lead?.interest ?? null],
    ["Budget", lead?.budget ? formatINR(lead.budget) : null],
    ["Timeline", lead?.timeline ?? null],
    ["Location", lead?.location ?? null],
    ["Contact", lead?.contact ?? null],
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 xl:hidden">
        <button type="button" onClick={onBack} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Back to conversation">
          <ArrowLeft className="size-5" />
        </button>
        <p className="text-sm font-semibold text-navy-900">Customer details</p>
      </div>

      <section className="flex flex-col items-center border-b border-slate-100 px-4 py-5 text-center">
        <Avatar name={customer.name} color={customer.color} size="lg" />
        <p className="mt-2 text-sm font-semibold text-navy-900">{customer.name}</p>
        <p className="text-xs text-slate-500">@{customer.username}</p>
        <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">Sample customer</p>
        {customer.optedOut && <p className="mt-2 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">Opted out of follow-ups</p>}
      </section>

      <section className="space-y-3 border-b border-slate-100 p-4" aria-labelledby="ctl">
        <h3 id="ctl" className="text-xs font-semibold uppercase tracking-wide text-slate-400">Conversation controls</h3>
        <div>
          <label htmlFor="assign" className="mb-1 block text-xs text-slate-600">
            Assigned salesperson
          </label>
          <Select
            id="assign"
            value={conv.assignedTo ?? ""}
            onChange={(e) => {
              actions.assignConversation(conv.id, e.target.value || null);
              toast(e.target.value ? `Assigned to ${ws.team.find((m) => m.id === e.target.value)?.name}` : "Unassigned");
            }}
            className="h-9 text-xs"
          >
            <option value="">Unassigned</option>
            {ws.team.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} — {m.role}
              </option>
            ))}
          </Select>
        </div>
        {conv.handledBy !== "human" && (
          <div className="flex gap-2">
            <Select value={agent} onChange={(e) => setAgent(e.target.value)} className="h-8 flex-1 text-xs" aria-label="Agent taking over">
              {ws.team.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
            <Button
              size="sm"
              variant="secondary"
              icon={Hand}
              onClick={() => {
                actions.takeOver(conv.id, agent);
                toast("Taken over — chatbot paused for this conversation");
              }}
            >
              Take over
            </Button>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          {conv.botPaused ? (
            <Button size="sm" variant="outline" icon={PlayCircle} onClick={() => { actions.setBotPaused(conv.id, false); toast("Chatbot resumed"); }}>
              Resume bot
            </Button>
          ) : (
            <Button size="sm" variant="outline" icon={PauseCircle} onClick={() => { actions.setBotPaused(conv.id, true); toast("Chatbot paused for this conversation"); }}>
              Pause bot
            </Button>
          )}
          {conv.status === "open" ? (
            <Button size="sm" variant="outline" icon={CheckCircle2} onClick={() => { actions.setConversationStatus(conv.id, "closed"); toast("Conversation marked as resolved"); }}>
              Resolve
            </Button>
          ) : (
            <Button size="sm" variant="outline" icon={RotateCcw} onClick={() => { actions.setConversationStatus(conv.id, "open"); toast("Conversation reopened"); }}>
              Reopen
            </Button>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          icon={CalendarPlus}
          className="w-full"
          onClick={() => setFu(newFollowUp(ws, { customerId: customer.id, conversationId: conv.id, leadId: lead?.id ?? null, assignedTo: conv.assignedTo ?? lead?.assignedTo ?? null }))}
        >
          Create follow-up {pending.length ? `(${pending.length} pending)` : ""}
        </Button>
      </section>

      <section className="space-y-2 border-b border-slate-100 p-4" aria-labelledby="lead-h">
        <div className="flex items-center justify-between">
          <h3 id="lead-h" className="text-xs font-semibold uppercase tracking-wide text-slate-400">Lead information</h3>
          {lead && (
            <Link href={`/leads?lead=${lead.id}`} className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-700 hover:underline">
              Open lead <ExternalLink className="size-3" />
            </Link>
          )}
        </div>
        {lead ? (
          <>
            <div className="flex flex-wrap items-center gap-1.5">
              <CategoryBadge category={lead.category} />
              <StageBadge stage={lead.stage} />
              <span className="text-[11px] text-slate-500">Score {lead.score}</span>
            </div>
            <dl className="space-y-1.5 text-xs">
              {fields.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className={v ? "text-right font-medium text-slate-800" : "text-slate-400"}>{v ?? "Not captured"}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Next action</dt>
                <dd className="text-right font-medium text-slate-800">{lead.nextAction}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Last interaction</dt>
                <dd className="text-right text-slate-700">{timeAgo(lead.lastInteractionAt)}</dd>
              </div>
            </dl>
            <p className="rounded-lg bg-slate-50 p-2 text-[11px] leading-relaxed text-slate-600">
              <span className="font-semibold">Why {lead.category === "review" ? "Needs Review" : lead.category}?</span> {lead.categoryReason}
            </p>
          </>
        ) : (
          <p className="text-xs text-slate-500">No lead yet. A lead is created when the customer shows interest in a service, a budget or a timeline.</p>
        )}
      </section>

      <section className="space-y-2 border-b border-slate-100 p-4" aria-labelledby="notes-h">
        <h3 id="notes-h" className="text-xs font-semibold uppercase tracking-wide text-slate-400">Internal notes</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (note.trim().length < 2) return toast("Write a note first.", "error");
            actions.addNote(conv.id, note.trim(), state?.profile.name ?? "Team");
            setNote("");
            toast("Internal note added");
          }}
          className="space-y-2"
        >
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Visible to your team only" className="min-h-[60px] text-xs" aria-label="Internal note" />
          <Button size="sm" variant="outline" type="submit" icon={StickyNote} className="w-full">
            Add note
          </Button>
        </form>
        <ul className="space-y-2">
          {conv.notes.map((n) => (
            <li key={n.id} className="rounded-lg border border-amber-100 bg-amber-50/60 p-2 text-xs">
              <p className="text-slate-700">{n.text}</p>
              <p className="mt-1 text-[10px] text-slate-400">
                {n.author} · {formatDateTime(n.at)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="p-4" aria-labelledby="act-h">
        <h3 id="act-h" className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Conversation activity</h3>
        {activity.length ? <ActivityFeed items={activity} compact /> : <p className="text-xs text-slate-500">No activity yet.</p>}
      </section>
      <FollowUpForm ws={ws} value={fu} onClose={() => setFu(null)} />
    </div>
  );
}
