"use client";

import { MessageCircle, MessageSquarePlus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ChatPanel } from "@/components/inbox/ChatPanel";
import { ConversationList } from "@/components/inbox/ConversationList";
import { CustomerPanel } from "@/components/inbox/CustomerPanel";
import { SimulateModal } from "@/components/inbox/SimulateModal";
import { Button, Card, DemoNotice, EmptyState, PageHeader } from "@/components/ui/primitives";
import { actions, setActiveConversation, useTyping, useWorkspace } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function InboxPage() {
  return (
    <Suspense>
      <Inbox />
    </Suspense>
  );
}

type View = "list" | "chat" | "info";

function Inbox() {
  const ws = useWorkspace()!;
  const typing = useTyping();
  const params = useSearchParams();
  const router = useRouter();
  const fromUrl = params.get("c");
  const [picked, setPicked] = useState<string | null>(null);
  const [view, setView] = useState<View>(fromUrl ? "chat" : "list");
  const [simOpen, setSimOpen] = useState(false);

  const fallback = [...ws.conversations].sort((a, b) => b.lastMessageAt - a.lastMessageAt)[0]?.id ?? null;
  const selectedId = [picked, fromUrl, fallback].find((id) => id && ws.conversations.some((c) => c.id === id)) ?? null;
  const conv = ws.conversations.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    setActiveConversation(selectedId);
    if (selectedId) actions.markRead(selectedId);
    return () => setActiveConversation(null);
  }, [selectedId, conv?.unread]);

  const select = (id: string) => {
    setPicked(id);
    setView("chat");
    if (fromUrl) router.replace("/inbox", { scroll: false });
  };

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader
        eyebrow="Stages 2–6 · Conversations"
        title="Instagram Inbox"
        description="Customer messages and chatbot replies, just like an Instagram inbox. Play the customer, watch the chatbot answer, and step in as a salesperson whenever you like."
        actions={
          <Button icon={MessageSquarePlus} onClick={() => setSimOpen(true)}>
            Simulate Customer Message
          </Button>
        }
      />
      <ol className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-3" aria-label="How to use the inbox">
        {[
          ["Pick a conversation", "Choose a customer on the left, or start a new one with “Simulate Customer Message”."],
          ["Type as the customer", "Ask about prices, discounts or delivery. The chatbot replies in a second from approved info."],
          ["See why it replied", "Click “Why this reply?” under any chatbot message. Use “Take over” to reply as a salesperson."],
        ].map(([t, d], i) => (
          <li key={t} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-500 font-mono text-xs font-semibold text-navy-950">{i + 1}</span>
            <span>
              <span className="block text-sm font-semibold text-navy-900">{t}</span>
              <span className="block text-xs leading-relaxed text-slate-500">{d}</span>
            </span>
          </li>
        ))}
      </ol>
      <DemoNotice className="mb-4">Messages shown here are sample or simulated data. Nothing is received from or sent to Instagram.</DemoNotice>

      <Card className="grid grid-cols-1 h-[calc(100vh-180px)] min-h-[560px] overflow-hidden lg:grid-cols-[320px_1fr] xl:grid-cols-[320px_1fr_320px]">
        <div className={cn("min-h-0 border-r border-slate-100", view === "list" ? "block" : "hidden lg:block")}>
          <ConversationList ws={ws} selectedId={selectedId} onSelect={select} typing={typing} />
        </div>
        <div className={cn("min-h-0 min-w-0", view === "chat" ? "block" : "hidden lg:block", view === "info" && "lg:block")}>
          {conv ? (
            <ChatPanel key={conv.id} ws={ws} conv={conv} typing={typing.includes(conv.id)} onBack={() => setView("list")} onInfo={() => setView("info")} />
          ) : (
            <EmptyState
              icon={MessageCircle}
              title="No conversation selected"
              description="Simulate a customer message to start a conversation."
              action={<Button onClick={() => setSimOpen(true)}>Simulate Customer Message</Button>}
              className="h-full"
            />
          )}
        </div>
        <div
          className={cn(
            "min-h-0 border-l border-slate-100",
            view === "info" ? "fixed inset-0 z-30 bg-white lg:static lg:hidden xl:block" : "hidden xl:block",
          )}
        >
          {conv && <CustomerPanel key={conv.id} ws={ws} conv={conv} onBack={() => setView("chat")} />}
        </div>
      </Card>

      <SimulateModal ws={ws} open={simOpen} onClose={() => setSimOpen(false)} defaultCustomerId={conv?.customerId ?? null} onSent={(id) => select(id)} />
    </div>
  );
}
