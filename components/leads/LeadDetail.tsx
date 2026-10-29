"use client";

import { ExternalLink, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { actions } from "@/lib/store";
import type { Lead, LeadCategory, PipelineStage, Workspace } from "@/lib/types";
import { CATEGORY_LABEL, STAGES, STAGE_LABEL, formatDateTime } from "@/lib/utils";
import { ActivityFeed } from "../activity/ActivityFeed";
import { Modal } from "../ui/Modal";
import { Avatar, Button, Field, Input, Select } from "../ui/primitives";
import { toast } from "../ui/toast";
import { CategoryBadge, StageBadge } from "./LeadBadges";

export function LeadDetail({ ws, lead, onClose }: { ws: Workspace; lead: Lead | null; onClose: () => void }) {
  return lead ? <Inner key={lead.id} ws={ws} lead={lead} onClose={onClose} /> : null;
}

function Inner({ ws, lead, onClose }: { ws: Workspace; lead: Lead; onClose: () => void }) {
  const customer = ws.customers.find((c) => c.id === lead.customerId)!;
  const [form, setForm] = useState({
    interest: lead.interest ?? "",
    budget: lead.budget?.toString() ?? "",
    timeline: lead.timeline ?? "",
    location: lead.location ?? "",
    contact: lead.contact ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const activity = ws.activities.filter((a) => a.leadId === lead.id || a.conversationId === lead.conversationId).slice(0, 10);

  const saveDetails = () => {
    const b = form.budget.trim() ? Number(form.budget.replace(/[,₹\s]/g, "")) : null;
    if (b !== null && (!Number.isFinite(b) || b <= 0)) return setError("Budget must be a positive number.");
    setError(null);
    const product = ws.products.find((p) => p.name.toLowerCase() === form.interest.trim().toLowerCase());
    // Empty inputs keep the previously captured value rather than wiping it.
    actions.updateLead(lead.id, {
      interest: form.interest.trim() || lead.interest,
      productId: product?.id ?? lead.productId,
      budget: b ?? lead.budget,
      timeline: form.timeline.trim() || lead.timeline,
      location: form.location.trim() || lead.location,
      contact: form.contact.trim() || lead.contact,
    });
    toast("Lead details saved and re-scored");
  };

  return (
    <Modal open onClose={onClose} title="Lead details" size="lg">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_260px]">
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <Avatar name={customer.name} color={customer.color} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-navy-900">{customer.name}</p>
              <p className="text-xs text-slate-500">
                @{customer.username} · created {formatDateTime(lead.createdAt)} · last interaction {formatDateTime(lead.lastInteractionAt)}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <CategoryBadge category={lead.category} />
                <StageBadge stage={lead.stage} />
                <span className="text-xs text-slate-500">Score {lead.score}/100</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-700">
              Why this category? {lead.categoryOverridden && <span className="font-normal text-amber-700">(manually set)</span>}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{lead.categoryReason}</p>
            <p className="mt-2 text-[11px] text-slate-400">Demo rules: interest +20 · budget +20 · budget fits price +15 · urgent timeline +25 · contact +10 · location +5 · purchase intent +10. ≥70 Hot, 40–69 Warm, &lt;40 Cold.</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Interested product / service" htmlFor="ld-i">
              <Input id="ld-i" list="ld-products" value={form.interest} onChange={(e) => setForm({ ...form, interest: e.target.value })} />
              <datalist id="ld-products">
                {ws.products.map((p) => (
                  <option key={p.id} value={p.name} />
                ))}
              </datalist>
            </Field>
            <Field label="Budget (₹)" htmlFor="ld-b" error={error}>
              <Input id="ld-b" inputMode="numeric" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} aria-invalid={Boolean(error)} />
            </Field>
            <Field label="Purchase timeline" htmlFor="ld-t">
              <Input id="ld-t" value={form.timeline} onChange={(e) => setForm({ ...form, timeline: e.target.value })} placeholder="This month" />
            </Field>
            <Field label="Location" htmlFor="ld-l">
              <Input id="ld-l" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </Field>
            <Field label="Contact details" htmlFor="ld-c" className="sm:col-span-2">
              <Input id="ld-c" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
            </Field>
          </div>
          <Button variant="outline" onClick={saveDetails}>
            Save details
          </Button>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Activity</p>
            {activity.length ? <ActivityFeed items={activity} compact /> : <p className="text-xs text-slate-500">No activity yet.</p>}
          </div>
        </div>

        <aside className="space-y-4">
          <Field label="Pipeline stage" htmlFor="ld-stage">
            <Select
              id="ld-stage"
              value={lead.stage}
              onChange={(e) => {
                actions.moveLead(lead.id, e.target.value as PipelineStage);
                toast(`Moved to ${STAGE_LABEL[e.target.value as PipelineStage]}`);
              }}
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABEL[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Lead category" htmlFor="ld-cat" hint="Override the suggested category if needed.">
            <Select
              id="ld-cat"
              value={lead.category}
              onChange={(e) => {
                actions.setLeadCategory(lead.id, e.target.value as LeadCategory);
                toast(`Category set to ${CATEGORY_LABEL[e.target.value as LeadCategory]}`);
              }}
            >
              {(Object.keys(CATEGORY_LABEL) as LeadCategory[]).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </Select>
          </Field>
          {lead.categoryOverridden && (
            <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => { actions.setLeadCategory(lead.id, null); toast("Reverted to the suggested category"); }}>
              Revert to suggested
            </Button>
          )}
          <Field label="Assigned salesperson" htmlFor="ld-as">
            <Select
              id="ld-as"
              value={lead.assignedTo ?? ""}
              onChange={(e) => {
                actions.updateLead(lead.id, { assignedTo: e.target.value || null });
                toast("Salesperson updated");
              }}
            >
              <option value="">Unassigned</option>
              {ws.team.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Next action</p>
            <p className="text-sm font-semibold text-navy-900">{lead.nextAction}</p>
          </div>
          <Link href={`/inbox?c=${lead.conversationId}`} onClick={onClose} className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Open conversation <ExternalLink className="size-3.5" />
          </Link>
        </aside>
      </div>
    </Modal>
  );
}
