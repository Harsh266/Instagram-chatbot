"use client";

import { Bot, CalendarCheck, Clock, Handshake, Inbox, MessageCircle, Percent, Trophy, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { BarList, CATEGORY_COLORS, ColumnChart, Donut } from "@/components/charts/Charts";
import { Card, CardHeader, DemoNotice, EmptyState, Field, Input, PageHeader, StatCard, Tabs } from "@/components/ui/primitives";
import { analytics, startOfDay } from "@/lib/analytics";
import { useNow } from "@/lib/clock";
import { useWorkspace } from "@/lib/store";
import type { LeadCategory, SourceType } from "@/lib/types";
import { CATEGORY_LABEL, DAY, SOURCE_LABEL, STAGES, STAGE_LABEL } from "@/lib/utils";

type Preset = "7" | "14" | "30" | "all" | "custom";

const iso = (ts: number) => new Date(ts - new Date(ts).getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export default function AnalyticsPage() {
  const ws = useWorkspace()!;
  const now = useNow();
  const [preset, setPreset] = useState<Preset>("14");
  const [from, setFrom] = useState(() => iso(now - 13 * DAY));
  const [to, setTo] = useState(() => iso(now));

  const range = useMemo(() => {
    const end = startOfDay(now) + DAY - 1;
    if (preset === "custom") {
      const f = new Date(from + "T00:00").getTime();
      const t = new Date(to + "T23:59:59").getTime();
      return Number.isNaN(f) || Number.isNaN(t) || f > t ? null : { from: f, to: t };
    }
    if (preset === "all") {
      const earliest = Math.min(now, ...ws.messages.map((m) => m.at), ...ws.leads.map((l) => l.createdAt));
      return { from: startOfDay(earliest), to: end };
    }
    return { from: startOfDay(now) - (Number(preset) - 1) * DAY, to: end };
  }, [preset, from, to, ws, now]);

  const a = useMemo(() => (range ? analytics(ws, range) : null), [ws, range]);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader eyebrow="Insights"
        title="Analytics"
        description="How the chatbot is performing: messages answered, leads won and follow-ups done. Every number is calculated live from the demo data."
        actions={
          <Tabs
            value={preset}
            onChange={setPreset}
            items={[
              { value: "7", label: "7 days" },
              { value: "14", label: "14 days" },
              { value: "30", label: "30 days" },
              { value: "all", label: "All time" },
              { value: "custom", label: "Custom" },
            ]}
          />
        }
      />
      <DemoNotice className="mb-5">These analytics represent sample or locally simulated activity — not real Instagram performance.</DemoNotice>

      {preset === "custom" && (
        <Card className="mb-5 flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <Field label="From" htmlFor="an-from">
            <Input id="an-from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="To" htmlFor="an-to">
            <Input id="an-to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </Field>
          {!range && <p className="text-xs text-red-600">“From” must be on or before “To”.</p>}
        </Card>
      )}

      {!a ? (
        <Card>
          <EmptyState icon={CalendarCheck} title="Choose a valid date range" />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <StatCard label="Conversations" value={a.conversations} icon={MessageCircle} hint="With activity in range" />
            <StatCard label="Incoming messages" value={a.incoming} icon={Inbox} tone="violet" />
            <StatCard label="Simulated replies" value={a.replies} icon={Bot} tone="green" hint={`${a.failed} failed (simulated)`} />
            <StatCard label="Avg. response time" value={a.avgResponseMs ? `${(a.avgResponseMs / 1000).toFixed(1)}s` : "—"} icon={Clock} tone="slate" hint="Simulated processing time" />
            <StatCard label="Human handoffs" value={a.handoffs} icon={Handshake} tone="amber" />
            <StatCard label="Lead conversion rate" value={`${a.conversionRate.toFixed(0)}%`} icon={Percent} hint={`${a.won} won of ${a.leads} leads`} />
            <StatCard label="Won opportunities" value={a.won} icon={Trophy} tone="green" />
            <StatCard label="Lost opportunities" value={a.lost} icon={XCircle} tone="red" hint={`Win rate ${a.winRate.toFixed(0)}%`} />
            <StatCard label="Follow-up completion" value={`${a.followUpRate.toFixed(0)}%`} icon={CalendarCheck} tone="violet" hint={`${a.followUpsDone} of ${a.followUps} follow-ups`} />
            <StatCard label="Answered from knowledge" value={`${a.automationRate.toFixed(0)}%`} icon={Bot} tone="blue" hint="Replies not using the fallback" />
          </div>

          <Card className="mt-6">
            <CardHeader title="Messages per day" description="Incoming customer messages vs simulated chatbot replies vs team replies" />
            <div className="p-5">
              {a.incoming + a.replies ? (
                <ColumnChart
                  data={a.series}
                  series={[
                    { key: "incoming", label: "Incoming", color: "#d62976" },
                    { key: "replies", label: "Chatbot replies", color: "#b7b71b" },
                    { key: "agent", label: "Team replies", color: "#2c2c2c" },
                  ]}
                  labelFor={(d) => new Date(d.day).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  height={240}
                />
              ) : (
                <EmptyState icon={MessageCircle} title="No messages in this range" />
              )}
            </div>
          </Card>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader title="Lead categories" description="Leads created in range" />
              <div className="p-5">
                {a.leads ? (
                  <Donut
                    centerLabel="leads"
                    items={(Object.keys(a.categories) as LeadCategory[]).map((k) => ({ label: CATEGORY_LABEL[k], value: a.categories[k], color: CATEGORY_COLORS[k] }))}
                  />
                ) : (
                  <EmptyState icon={Percent} title="No leads in range" />
                )}
              </div>
            </Card>
            <Card>
              <CardHeader title="Pipeline stages" description="Where leads created in range are now" />
              <div className="p-5">
                {a.leads ? (
                  <BarList items={STAGES.map((s) => ({ label: STAGE_LABEL[s], value: a.stages[s], color: s === "won" ? "#059669" : s === "lost" ? "#94a3b8" : "#b7b71b" }))} />
                ) : (
                  <EmptyState icon={Percent} title="No leads in range" />
                )}
              </div>
            </Card>
            <Card>
              <CardHeader title="Reply sources" description="What information simulated replies were based on" />
              <div className="p-5">
                {Object.keys(a.sources).length ? (
                  <BarList
                    items={(Object.entries(a.sources) as [SourceType, number][])
                      .sort((x, y) => y[1] - x[1])
                      .map(([k, v]) => ({ label: SOURCE_LABEL[k], value: v, color: k === "fallback" ? "#f59e0b" : "#b7b71b" }))}
                  />
                ) : (
                  <EmptyState icon={Bot} title="No replies in range" />
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
