import type { LeadCategory, PipelineStage, SourceType, Workspace } from "./types";
import { DAY, STAGES } from "./utils";

export interface Range {
  from: number;
  to: number;
}

export function overviewStats(ws: Workspace, now: number) {
  return {
    conversations: ws.conversations.length,
    newLeads: ws.leads.filter((l) => l.stage === "new").length,
    hotLeads: ws.leads.filter((l) => l.category === "hot" && l.stage !== "won" && l.stage !== "lost").length,
    replies: ws.messages.filter((m) => m.sender === "bot" && m.status !== "failed").length,
    pendingFollowUps: ws.followUps.filter((f) => f.status === "scheduled").length,
    overdueFollowUps: ws.followUps.filter((f) => f.status === "scheduled" && f.dueAt < now).length,
    handoffs: ws.conversations.filter((c) => c.handledBy === "human" && c.status === "open").length,
    unread: ws.conversations.reduce((n, c) => n + c.unread, 0),
  };
}

export function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function dailySeries(ws: Workspace, range: Range) {
  const start = startOfDay(range.from);
  const days = Math.max(1, Math.min(90, Math.ceil((range.to - start) / DAY)));
  const series = Array.from({ length: days }, (_, i) => ({
    day: start + i * DAY,
    incoming: 0,
    replies: 0,
    agent: 0,
    leads: 0,
  }));
  const idx = (ts: number) => Math.floor((startOfDay(ts) - start) / DAY);
  for (const m of ws.messages) {
    if (m.at < range.from || m.at > range.to) continue;
    const s = series[idx(m.at)];
    if (!s) continue;
    if (m.sender === "customer") s.incoming++;
    else if (m.sender === "bot" && m.status !== "failed") s.replies++;
    else if (m.sender === "agent") s.agent++;
  }
  for (const l of ws.leads) {
    if (l.createdAt < range.from || l.createdAt > range.to) continue;
    const s = series[idx(l.createdAt)];
    if (s) s.leads++;
  }
  return series;
}

export function categoryCounts(ws: Workspace, leads = ws.leads) {
  const out: Record<LeadCategory, number> = { hot: 0, warm: 0, cold: 0, unqualified: 0, review: 0 };
  for (const l of leads) out[l.category]++;
  return out;
}

export function stageCounts(ws: Workspace, leads = ws.leads) {
  const out = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<PipelineStage, number>;
  for (const l of leads) out[l.stage]++;
  return out;
}

export function analytics(ws: Workspace, range: Range) {
  const inRange = (ts: number) => ts >= range.from && ts <= range.to;
  const msgs = ws.messages.filter((m) => inRange(m.at));
  const incoming = msgs.filter((m) => m.sender === "customer").length;
  const bot = msgs.filter((m) => m.sender === "bot");
  const replies = bot.filter((m) => m.status !== "failed").length;
  const failed = bot.length - replies;
  const timed = bot.filter((m) => (m.responseMs ?? 0) > 0);
  const avgResponseMs = timed.length ? timed.reduce((s, m) => s + (m.responseMs ?? 0), 0) / timed.length : 0;
  const conversations = new Set(msgs.map((m) => m.conversationId)).size;
  const leads = ws.leads.filter((l) => inRange(l.createdAt));
  const won = leads.filter((l) => l.stage === "won").length;
  const lost = leads.filter((l) => l.stage === "lost").length;
  const handoffs = ws.activities.filter((a) => inRange(a.at) && a.kind === "handoff").length;
  const fus = ws.followUps.filter((f) => inRange(f.createdAt) || inRange(f.dueAt));
  const fuDone = fus.filter((f) => f.status === "completed").length;
  const fuConsidered = fus.filter((f) => f.status !== "cancelled").length;
  const sources = {} as Partial<Record<SourceType, number>>;
  for (const m of bot) if (m.source) sources[m.source.type] = (sources[m.source.type] ?? 0) + 1;
  const fallbacks = sources.fallback ?? 0;

  return {
    conversations,
    incoming,
    replies,
    failed,
    avgResponseMs,
    leads: leads.length,
    won,
    lost,
    conversionRate: leads.length ? (won / leads.length) * 100 : 0,
    winRate: won + lost ? (won / (won + lost)) * 100 : 0,
    handoffs,
    followUps: fus.length,
    followUpsDone: fuDone,
    followUpRate: fuConsidered ? (fuDone / fuConsidered) * 100 : 0,
    automationRate: bot.length ? ((bot.length - fallbacks) / bot.length) * 100 : 0,
    categories: categoryCounts(ws, leads),
    stages: stageCounts(ws, leads),
    sources,
    series: dailySeries(ws, range),
  };
}
