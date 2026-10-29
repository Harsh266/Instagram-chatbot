"use client";

import { GripVertical, KanbanSquare, List, Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { CategoryBadge, StageBadge } from "@/components/leads/LeadBadges";
import { LeadDetail } from "@/components/leads/LeadDetail";
import { Avatar, Card, EmptyState, Input, PageHeader, Select, Tabs } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { actions, useWorkspace } from "@/lib/store";
import type { Lead, LeadCategory, PipelineStage } from "@/lib/types";
import { CATEGORY_LABEL, STAGES, STAGE_LABEL, cn, formatINR, timeAgo } from "@/lib/utils";

export default function LeadsPage() {
  return (
    <Suspense>
      <Leads />
    </Suspense>
  );
}

function Leads() {
  const ws = useWorkspace()!;
  const params = useSearchParams();
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [view, setView] = useState<"board" | "table">("board");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<LeadCategory | "all">("all");
  const [owner, setOwner] = useState("all");
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<PipelineStage | null>(null);

  const detailId = openId ?? params.get("lead");
  const detail = ws.leads.find((l) => l.id === detailId) ?? null;
  const customers = new Map(ws.customers.map((c) => [c.id, c]));
  const team = new Map(ws.team.map((m) => [m.id, m]));

  const s = q.trim().toLowerCase();
  const leads = ws.leads.filter((l) => {
    const c = customers.get(l.customerId);
    return (
      (cat === "all" || l.category === cat) &&
      (owner === "all" || (owner === "none" ? !l.assignedTo : l.assignedTo === owner)) &&
      (!s || c?.name.toLowerCase().includes(s) || c?.username.includes(s) || (l.interest ?? "").toLowerCase().includes(s))
    );
  });

  const move = (id: string, stage: PipelineStage) => {
    const lead = ws.leads.find((l) => l.id === id);
    if (!lead || lead.stage === stage) return;
    actions.moveLead(id, stage);
    toast(`${customers.get(lead.customerId)?.name} moved to ${STAGE_LABEL[stage]}${stage === "won" || stage === "lost" ? " — pending sales follow-ups stopped" : ""}`);
  };

  const closeDetail = () => {
    setOpenId(null);
    if (params.get("lead")) router.replace("/leads", { scroll: false });
  };

  const leadCard = (l: Lead) => {
    const c = customers.get(l.customerId)!;
    return (
      <div
        key={l.id}
        draggable
        onDragStart={(e) => {
          setDragId(l.id);
          e.dataTransfer.setData("text/plain", l.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragEnd={() => {
          setDragId(null);
          setOver(null);
        }}
        className={cn("group rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-brand-200 hover:shadow", dragId === l.id && "opacity-40")}
      >
        <div className="flex items-start gap-2">
          <GripVertical className="mt-0.5 size-4 shrink-0 cursor-grab text-slate-300" aria-hidden />
          <button type="button" onClick={() => setOpenId(l.id)} className="min-w-0 flex-1 text-left">
            <span className="flex items-center gap-2">
              <Avatar name={c.name} color={c.color} size="sm" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-800">{c.name}</span>
                <span className="block truncate text-[11px] text-slate-500">{l.interest ?? "Interest not captured"}</span>
              </span>
            </span>
            <span className="mt-2 flex flex-wrap items-center gap-1.5">
              <CategoryBadge category={l.category} />
              <span className="text-[11px] text-slate-500">{l.budget ? formatINR(l.budget) : "No budget"}</span>
            </span>
            <span className="mt-2 block text-[11px] text-slate-500">
              {team.get(l.assignedTo ?? "")?.name ?? "Unassigned"} · {timeAgo(l.lastInteractionAt)}
            </span>
            <span className="mt-1 block truncate text-[11px] font-medium text-brand-700">→ {l.nextAction}</span>
          </button>
        </div>
        <label className="sr-only" htmlFor={`mv-${l.id}`}>
          Move {c.name} to stage
        </label>
        <select
          id={`mv-${l.id}`}
          value={l.stage}
          onChange={(e) => move(l.id, e.target.value as PipelineStage)}
          className="mt-2 h-7 w-full cursor-pointer rounded-md border border-slate-200 bg-slate-50 px-2 text-[11px] text-slate-600 focus:border-brand-500 focus:outline-none"
        >
          {STAGES.map((s) => (
            <option key={s} value={s}>
              Move to: {STAGE_LABEL[s]}
            </option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader eyebrow="Stages 5–7 · Sales pipeline"
        title="Leads & Pipeline"
        description="Every interested customer becomes a lead, scored Hot, Warm or Cold with the reason shown. Drag a card to move it through the sales stages."
        actions={
          <Tabs
            value={view}
            onChange={setView}
            items={[
              { value: "board", label: "Board" },
              { value: "table", label: "Table" },
            ]}
          />
        }
      />
      <div className="mb-4 flex flex-col gap-2 md:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search leads by name or interest" className="pl-9" aria-label="Search leads" />
        </div>
        <Select value={cat} onChange={(e) => setCat(e.target.value as LeadCategory | "all")} className="md:w-44" aria-label="Filter by category">
          <option value="all">All categories</option>
          {(Object.keys(CATEGORY_LABEL) as LeadCategory[]).map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </Select>
        <Select value={owner} onChange={(e) => setOwner(e.target.value)} className="md:w-48" aria-label="Filter by salesperson">
          <option value="all">All salespeople</option>
          <option value="none">Unassigned</option>
          {ws.team.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
      </div>

      {ws.leads.length === 0 ? (
        <Card>
          <EmptyState icon={KanbanSquare} title="No leads yet" description="Leads appear when simulated customers ask about services, prices, budgets or timelines." />
        </Card>
      ) : view === "board" ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const col = leads.filter((l) => l.stage === stage);
            return (
              <section
                key={stage}
                aria-label={`${STAGE_LABEL[stage]} column`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOver(stage);
                }}
                onDragLeave={() => setOver((o) => (o === stage ? null : o))}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain") || dragId;
                  if (id) move(id, stage);
                  setOver(null);
                  setDragId(null);
                }}
                className={cn(
                  "flex w-72 shrink-0 flex-col rounded-xl border bg-slate-100/70 p-2 transition-colors",
                  over === stage ? "border-brand-400 bg-brand-50" : "border-transparent",
                )}
              >
                <div className="flex items-center justify-between px-2 py-2">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <span className={cn("size-2 rounded-full", stage === "won" ? "bg-emerald-500" : stage === "lost" ? "bg-slate-400" : "bg-brand-500")} aria-hidden />
                    {STAGE_LABEL[stage]}
                  </p>
                  <span className="rounded-full bg-white px-2 text-[11px] font-semibold text-slate-600">{col.length}</span>
                </div>
                <div className="min-h-[120px] flex-1 space-y-2">
                  {col.map(leadCard)}
                  {!col.length && <p className="rounded-lg border border-dashed border-slate-300 py-6 text-center text-[11px] text-slate-400">Drop leads here</p>}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                {["Customer", "Interest", "Budget", "Timeline", "Location", "Score", "Category", "Stage", "Salesperson", "Next action"].map((h) => (
                  <th key={h} className="px-4 py-2.5 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map((l) => {
                const c = customers.get(l.customerId)!;
                return (
                  <tr key={l.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setOpenId(l.id)}>
                    <td className="px-4 py-3">
                      <button type="button" className="text-left font-medium text-slate-800 hover:text-brand-700" onClick={() => setOpenId(l.id)}>
                        {c.name}
                        <span className="block text-[11px] font-normal text-slate-500">@{c.username}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{l.interest ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{formatINR(l.budget)}</td>
                    <td className="px-4 py-3 text-slate-600">{l.timeline ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{l.location ?? "—"}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-navy-900">{l.score}</td>
                    <td className="px-4 py-3">
                      <CategoryBadge category={l.category} />
                    </td>
                    <td className="px-4 py-3">
                      <StageBadge stage={l.stage} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{team.get(l.assignedTo ?? "")?.name ?? "Unassigned"}</td>
                    <td className="px-4 py-3 text-slate-600">{l.nextAction}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!leads.length && <EmptyState icon={List} title="No leads match your filters" />}
        </Card>
      )}
      <LeadDetail ws={ws} lead={detail} onClose={closeDetail} />
    </div>
  );
}
