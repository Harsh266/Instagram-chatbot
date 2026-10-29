"use client";

import { ArrowLeft, Bot, Hand, Info, PauseCircle, PlayCircle, Send, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { actions } from "@/lib/store";
import type { Conversation, Workspace } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar, Badge, Button, Select } from "../ui/primitives";
import { toast } from "../ui/toast";
import { MessageBubble, TypingIndicator } from "./MessageBubble";
import { SCENARIOS } from "./SimulateModal";

const AGENT_QUICK = [
  "Thanks for your patience! Let me check and get back to you shortly.",
  "Could you share your phone number so we can call you?",
  "I've emailed you the details and quotation.",
  "Would you like to schedule a quick call today?",
];

type Mode = "customer" | "agent";

export function ChatPanel({
  ws,
  conv,
  typing,
  onBack,
  onInfo,
}: {
  ws: Workspace;
  conv: Conversation;
  typing: boolean;
  onBack: () => void;
  onInfo: () => void;
}) {
  const customer = ws.customers.find((c) => c.id === conv.customerId)!;
  const messages = ws.messages.filter((m) => m.conversationId === conv.id);
  const team = new Map(ws.team.map((m) => [m.id, m]));
  const [text, setText] = useState("");
  const [mode, setMode] = useState<Mode>(conv.botPaused ? "agent" : "customer");
  const [agentId, setAgentId] = useState(conv.assignedTo ?? ws.team[0]?.id ?? "");
  const end = useRef<HTMLDivElement>(null);
  const firstName = customer.name.split(" ")[0];

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages.length, typing, conv.id]);

  const sendAsCustomer = (t: string) => {
    const r = actions.simulateIncoming({ customerId: customer.id, text: t });
    if (!r.ok) return toast(r.message, "error");
    if (r.status !== "delivered") toast(r.message, "info");
    setText("");
  };

  const sendAsAgent = (t: string) => {
    if (!agentId) return toast("Choose which team member is replying.", "error");
    if (!conv.botPaused) {
      actions.takeOver(conv.id, agentId);
      toast(`${team.get(agentId)?.name} took over — chatbot paused for this conversation`, "info");
    }
    actions.sendAgentMessage(conv.id, t, agentId);
    setText("");
  };

  const send = (body: string) => {
    const t = body.trim();
    if (!t) return;
    if (mode === "customer") sendAsCustomer(t);
    else sendAsAgent(t);
  };

  const quick = mode === "customer" ? SCENARIOS.map((s) => s.text) : AGENT_QUICK;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <button type="button" onClick={onBack} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Back to conversations">
          <ArrowLeft className="size-5" />
        </button>
        <Avatar name={customer.name} color={customer.color} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-navy-900">{customer.name}</p>
          <p className="truncate text-xs text-slate-500">
            @{customer.username} · Instagram DM (simulated){customer.optedOut ? " · opted out of follow-ups" : ""}
          </p>
        </div>
        <div className="hidden items-center gap-1.5 sm:flex">
          <Badge tone={conv.status === "open" ? "green" : "slate"} dot>
            {conv.status === "open" ? "Open" : "Resolved"}
          </Badge>
          <Badge tone={conv.handledBy === "human" ? "violet" : "blue"}>{conv.handledBy === "human" ? "Human handling" : "Chatbot handling"}</Badge>
        </div>
        <button type="button" onClick={onInfo} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 xl:hidden" aria-label="Customer details">
          <Info className="size-5" />
        </button>
      </div>

      {conv.botPaused ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900" role="status">
          <PauseCircle className="size-4 shrink-0" aria-hidden />
          <span className="flex-1">
            <strong>Chatbot paused</strong> — {conv.handledBy === "human" ? `${team.get(conv.assignedTo ?? "")?.name ?? "The team"} is handling this conversation.` : "no automatic replies."} New customer
            messages will wait for the team.
          </span>
          <Button size="sm" variant="outline" icon={PlayCircle} onClick={() => { actions.setBotPaused(conv.id, false); toast("Chatbot resumed for this conversation"); }}>
            Resume chatbot
          </Button>
        </div>
      ) : !ws.settings.chatbotEnabled ? (
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">The chatbot is inactive for this business. Activate it in Business Setup to send simulated replies.</div>
      ) : null}

      <div className="flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_1px_1px,#e2e8f0_1px,transparent_0)] bg-[length:20px_20px] px-4 py-4" aria-live="polite">
        {messages.length === 0 && <p className="py-10 text-center text-xs text-slate-400">No messages yet.</p>}
        {messages.map((m) => (
          <MessageBubble key={m.id} m={m} agent={m.agentId ? team.get(m.agentId) : undefined} onRetry={(id) => { actions.retryMessage(id); toast("Reply re-sent (simulated)"); }} />
        ))}
        {typing && <TypingIndicator />}
        <div ref={end} />
      </div>

      <div className="border-t border-slate-100 bg-white p-3">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <div role="radiogroup" aria-label="Send message as" className="inline-flex rounded-lg bg-slate-100 p-0.5">
            {(
              [
                ["customer", UserRound, `${firstName} (customer)`],
                ["agent", Hand, "Team agent"],
              ] as const
            ).map(([v, Icon, label]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={mode === v}
                onClick={() => setMode(v)}
                className={cn("inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors", mode === v ? "bg-white text-navy-900 shadow-sm" : "text-slate-500 hover:text-slate-800")}
              >
                <Icon className="size-3" aria-hidden /> {label}
              </button>
            ))}
          </div>
          {mode === "agent" && (
            <Select value={agentId} onChange={(e) => setAgentId(e.target.value)} className="h-7 w-40 text-[11px]" aria-label="Reply as">
              {ws.team.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          )}
        </div>
        <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
          {quick.map((q) => (
            <button key={q} type="button" onClick={() => setText(q)} className="shrink-0 rounded-full border border-slate-200 px-2.5 py-1 text-[11px] text-slate-600 hover:border-brand-300 hover:text-brand-700">
              {q.length > 38 ? q.slice(0, 36) + "…" : q}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(text);
          }}
          className="flex items-end gap-2"
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(text);
              }
            }}
            rows={1}
            placeholder={mode === "customer" ? `Type as ${firstName} — the chatbot will reply…` : conv.botPaused ? "Reply as a human agent (demo)…" : "Reply as agent — this takes over from the chatbot"}
            aria-label={mode === "customer" ? "Simulated customer message" : "Agent message"}
            className={cn(
              "max-h-32 min-h-10 flex-1 resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2",
              mode === "customer" ? "border-pink-200 bg-pink-50/30 focus:border-pink-400 focus:ring-pink-400/20" : "border-slate-300 focus:border-brand-500 focus:ring-brand-500/20",
            )}
          />
          <Button type="submit" icon={Send} disabled={!text.trim()} aria-label="Send message">
            <span className="hidden sm:inline">Send</span>
          </Button>
        </form>
        <p className={cn("mt-1.5 flex items-center gap-1 text-[10px]", mode === "agent" && !conv.botPaused ? "text-amber-700" : "text-slate-400")}>
          {mode === "customer" ? <Bot className="size-3" aria-hidden /> : <Hand className="size-3" aria-hidden />}
          {mode === "customer"
            ? conv.botPaused
              ? "Simulated customer message — the chatbot is paused, so it will wait for the team."
              : "Simulated customer message — the chatbot replies using only approved business information."
            : conv.botPaused
              ? "Human agent messages are demo-only and are not sent to Instagram."
              : "Sending as an agent takes over this conversation and pauses the chatbot."}
        </p>
      </div>
    </div>
  );
}
