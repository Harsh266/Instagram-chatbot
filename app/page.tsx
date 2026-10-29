"use client";

import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Building2,
  CalendarClock,
  CheckCircle2,
  Flame,
  Handshake,
  MessageCircle,
  RefreshCw,
  Sparkles,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { CATEGORY_COLORS, ColumnChart, Donut } from "@/components/charts/Charts";
import { CategoryBadge } from "@/components/leads/LeadBadges";
import { GuidedTour } from "@/components/overview/GuidedTour";
import { HowItWorks } from "@/components/overview/HowItWorks";
import { InstagramGlyph } from "@/components/ui/icons";
import { Avatar, Badge, Button, Card, CardHeader, DemoNotice, EmptyState, Eyebrow, StatCard } from "@/components/ui/primitives";
import { categoryCounts, dailySeries, overviewStats, stageCounts, startOfDay } from "@/lib/analytics";
import { useNow } from "@/lib/clock";
import { setupChecks } from "@/lib/setup";
import { useWorkspace } from "@/lib/store";
import { CATEGORY_LABEL, DAY, REASON_LABEL, STAGES, STAGE_LABEL, cn, timeAgo } from "@/lib/utils";

export default function OverviewPage() {
  const ws = useWorkspace()!;
  const now = useNow();
  const stats = overviewStats(ws, now);
  const today = startOfDay(now);
  const series = useMemo(() => dailySeries(ws, { from: today - 13 * DAY, to: today + DAY - 1 }), [ws, today]);
  const cats = categoryCounts(ws);
  const stages = stageCounts(ws);
  const checks = setupChecks(ws);
  const missing = checks.filter((c) => !c.done);
  const customers = new Map(ws.customers.map((c) => [c.id, c]));
  const team = new Map(ws.team.map((m) => [m.id, m]));
  const recent = [...ws.conversations].sort((a, b) => b.lastMessageAt - a.lastMessageAt).slice(0, 5);
  const tasks = ws.followUps.filter((f) => f.status === "scheduled").sort((a, b) => a.dueAt - b.dueAt).slice(0, 5);
  const lastMsg = (convId: string) => ws.messages.findLast((m) => m.conversationId === convId);

  return (
    <div className="mx-auto max-w-7xl">
      <section className="pb-10 pt-2">
        <div className="mb-6 flex flex-wrap gap-2">
          {["Answers from approved info only", "Captures & scores leads", "Hands off to your sales team", "Sample data · runs in your browser"].map((t) => (
            <span key={t} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-600">
              {t}
            </span>
          ))}
        </div>
        <Eyebrow>Instagram AI chatbot · live demo</Eyebrow>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-[1.1] tracking-tight text-navy-900 sm:text-5xl lg:text-6xl">
          Turn Instagram messages into qualified leads.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600">
          See how <strong className="font-semibold text-navy-900">{ws.business.name || "your business"}</strong> would use a chatbot on Instagram: it replies to
          customers instantly using only approved business information, collects lead details, and passes ready-to-buy customers to the sales team.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/inbox">
            <Button icon={MessageCircle} className="h-11 px-6">
              Try the chatbot
            </Button>
          </Link>
          <a href="#how-it-works">
            <Button variant="outline" className="h-11 px-6">
              See how it works
            </Button>
          </a>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <GuidedTour ws={ws} />
        </div>
        <Card className="p-5">
          <Eyebrow>What you&apos;re looking at</Eyebrow>
          <ul className="mt-4 space-y-4 text-sm">
            {[
              [Building2, "A sample business", `${ws.business.name || "Your business"} with ${ws.products.filter((p) => p.status === "approved").length} services, prices, FAQs and policies.`],
              [InstagramGlyph, "Simulated Instagram chats", `${ws.conversations.length} sample customers. You can play the customer and the chatbot replies live.`],
              [RefreshCw, "Everything is connected", "Every action updates leads, follow-ups and analytics instantly. Reset anytime in Settings."],
            ].map(([Icon, title, text]) => {
              const I = Icon as typeof Bot;
              return (
                <li key={title as string} className="flex gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                    <I className="size-4" aria-hidden />
                  </span>
                  <span>
                    <span className="block font-semibold text-navy-900">{title as string}</span>
                    <span className="block text-xs leading-relaxed text-slate-500">{text as string}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <DemoNotice className="mt-5">No real Instagram account, messages or AI service are used.</DemoNotice>
        </Card>
      </div>

      <Eyebrow className="mb-3 mt-10">At a glance</Eyebrow>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Conversations" value={stats.conversations} icon={MessageCircle} hint={`${stats.unread} unread`} />
        <StatCard label="New Leads" value={stats.newLeads} icon={UserPlus} tone="violet" hint="In the New stage" />
        <StatCard label="Hot Leads" value={stats.hotLeads} icon={Flame} tone="red" hint="Open opportunities" />
        <StatCard label="Replies Simulated" value={stats.replies} icon={Bot} tone="green" hint="Delivered chatbot replies" />
        <StatCard label="Pending Follow-Ups" value={stats.pendingFollowUps} icon={CalendarClock} tone="amber" hint={`${stats.overdueFollowUps} overdue`} />
        <StatCard label="Human Handoffs" value={stats.handoffs} icon={Handshake} tone="slate" hint="Open, handled by team" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Conversation activity" description="Last 14 days · incoming messages vs simulated replies vs team replies" />
          <div className="p-5">
            {series.some((d) => d.incoming || d.replies || d.agent) ? (
              <ColumnChart
                data={series}
                series={[
                  { key: "incoming", label: "Incoming", color: "#d62976" },
                  { key: "replies", label: "Chatbot replies", color: "#b7b71b" },
                  { key: "agent", label: "Team replies", color: "#2c2c2c" },
                ]}
                labelFor={(d) => new Date(d.day).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              />
            ) : (
              <EmptyState icon={MessageCircle} title="No conversation activity yet" description="Simulate a customer message from the Instagram Inbox to see activity here." />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Chatbot status" icon={Sparkles} />
          <div className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Simulated chatbot</span>
              <Badge tone={ws.settings.chatbotEnabled ? "green" : "slate"} dot>
                {ws.settings.chatbotEnabled ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-slate-600">
                <InstagramGlyph className="size-4 text-ig" aria-hidden /> Instagram (simulated)
              </span>
              <Badge tone={ws.instagram.status === "connected" ? "green" : "red"} dot>
                {ws.instagram.status === "connected" ? ws.instagram.handle : "Disconnected"}
              </Badge>
            </div>
            <div>
              <div className="mb-1.5 flex justify-between text-xs">
                <span className="text-slate-600">Setup completeness</span>
                <span className="font-semibold text-slate-800">
                  {checks.length - missing.length}/{checks.length}
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-brand-500 transition-[width]" style={{ width: `${((checks.length - missing.length) / checks.length) * 100}%` }} />
              </div>
            </div>
            {missing.length ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                  <AlertTriangle className="size-3.5" aria-hidden /> Missing items
                </p>
                <ul className="mt-1 list-inside list-disc text-xs text-amber-800">
                  {missing.map((m) => (
                    <li key={m.id}>{m.label}</li>
                  ))}
                </ul>
                <Link href="/setup" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-900 hover:underline">
                  Complete setup <ArrowRight className="size-3" />
                </Link>
              </div>
            ) : (
              <p className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">
                <CheckCircle2 className="size-4" aria-hidden /> Setup complete — the chatbot is ready.
              </p>
            )}
            <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center">
              {[
                ["Services", ws.products.filter((p) => p.status === "approved").length],
                ["FAQs", ws.knowledge.filter((k) => k.type === "faq" && k.status === "approved").length],
                ["Policies", ws.knowledge.filter((k) => k.type !== "faq" && k.status === "approved").length],
              ].map(([l, v]) => (
                <div key={l}>
                  <p className="text-lg font-semibold text-navy-900">{v}</p>
                  <p className="text-[11px] text-slate-500">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-10">
        <HowItWorks />
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader title="Recent conversations" action={<Link href="/inbox" className="text-xs font-medium text-brand-700 hover:underline">View all</Link>} />
          {recent.length ? (
            <ul className="divide-y divide-slate-100">
              {recent.map((c) => {
                const cu = customers.get(c.customerId)!;
                const lm = lastMsg(c.id);
                return (
                  <li key={c.id}>
                    <Link href={`/inbox?c=${c.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                      <Avatar name={cu.name} color={cu.color} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium text-slate-800">{cu.name}</p>
                          <span className="shrink-0 text-[11px] text-slate-400">{timeAgo(c.lastMessageAt)}</span>
                        </div>
                        <p className="truncate text-xs text-slate-500">{lm?.text ?? "No messages yet"}</p>
                      </div>
                      {c.unread > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1.5 text-[10px] font-semibold text-navy-950">{c.unread}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon={MessageCircle} title="No conversations" description="Simulated Instagram conversations will appear here." />
          )}
        </Card>

        <Card>
          <CardHeader title="Lead pipeline" action={<Link href="/leads" className="text-xs font-medium text-brand-700 hover:underline">Open pipeline</Link>} />
          <div className="space-y-5 p-5">
            {ws.leads.length ? (
              <>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-3 xl:grid-cols-3">
                  {STAGES.map((s) => (
                    <Link key={s} href="/leads" className={cn("rounded-lg border p-2.5 text-center hover:border-brand-200", s === "won" ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200")}>
                      <p className="text-lg font-semibold tabular-nums text-navy-900">{stages[s]}</p>
                      <p className="text-[11px] text-slate-500">{STAGE_LABEL[s]}</p>
                    </Link>
                  ))}
                </div>
                <Donut
                  centerLabel="leads"
                  items={(Object.keys(cats) as (keyof typeof cats)[]).map((k) => ({ label: CATEGORY_LABEL[k], value: cats[k], color: CATEGORY_COLORS[k] }))}
                />
              </>
            ) : (
              <EmptyState icon={UserPlus} title="No leads yet" description="Leads are created when a customer shows interest in a service." />
            )}
          </div>
        </Card>

        <Card className="lg:col-span-2 xl:col-span-1">
          <CardHeader title="Pending sales tasks" action={<Link href="/follow-ups" className="text-xs font-medium text-brand-700 hover:underline">Follow-Up Center</Link>} />
          {tasks.length ? (
            <ul className="divide-y divide-slate-100">
              {tasks.map((f) => {
                const cu = customers.get(f.customerId);
                const overdue = f.dueAt < now;
                return (
                  <li key={f.id} className="flex items-start gap-3 px-5 py-3">
                    <CalendarClock className={cn("mt-0.5 size-4 shrink-0", overdue ? "text-red-500" : "text-slate-400")} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {cu?.name} · <span className="font-normal text-slate-600">{REASON_LABEL[f.reason]}</span>
                      </p>
                      <p className="text-xs text-slate-500">
                        {team.get(f.assignedTo ?? "")?.name ?? "Unassigned"} · {f.kind === "internal" ? "Internal reminder" : "Customer follow-up"}
                      </p>
                    </div>
                    <Badge tone={overdue ? "red" : "slate"}>{overdue ? `Overdue ${timeAgo(f.dueAt).replace(" ago", "")}` : `Due ${timeAgo(f.dueAt)}`}</Badge>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon={CalendarClock} title="No pending tasks" description="Create follow-ups from the Follow-Up Center or a conversation." />
          )}
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Recent automation activity" description="Every step is labelled with its workflow stage (1–7)" />
          <div className="max-h-[420px] overflow-y-auto p-5">
            {ws.activities.length ? <ActivityFeed items={ws.activities.slice(0, 12)} /> : <EmptyState icon={Bot} title="No activity yet" />}
          </div>
        </Card>
        <Card>
          <CardHeader title="Leads needing attention" />
          {ws.leads.filter((l) => (l.category === "hot" || l.category === "review") && l.stage !== "won" && l.stage !== "lost").length ? (
            <ul className="divide-y divide-slate-100">
              {ws.leads
                .filter((l) => (l.category === "hot" || l.category === "review") && l.stage !== "won" && l.stage !== "lost")
                .map((l) => {
                  const cu = customers.get(l.customerId)!;
                  return (
                    <li key={l.id}>
                      <Link href={`/leads?lead=${l.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                        <Avatar name={cu.name} color={cu.color} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-800">{cu.name}</p>
                          <p className="truncate text-xs text-slate-500">{l.nextAction}</p>
                        </div>
                        <CategoryBadge category={l.category} />
                      </Link>
                    </li>
                  );
                })}
            </ul>
          ) : (
            <EmptyState icon={Flame} title="Nothing urgent" description="Hot and review-required leads will be listed here." />
          )}
        </Card>
      </div>
    </div>
  );
}
