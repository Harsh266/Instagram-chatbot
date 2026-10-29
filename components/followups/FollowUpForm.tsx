"use client";

import { useState } from "react";
import { actions } from "@/lib/store";
import type { FollowUp, FollowUpReason, Workspace } from "@/lib/types";
import { REASON_LABEL, toLocalInput } from "@/lib/utils";
import { Modal } from "../ui/Modal";
import { Button, Field, Input, Select, Textarea } from "../ui/primitives";
import { toast } from "../ui/toast";

export function FollowUpForm({ ws, value, onClose }: { ws: Workspace; value: FollowUp | null; onClose: () => void }) {
  return value ? <Inner key={value.id} ws={ws} value={value} onClose={onClose} /> : null;
}

function Inner({ ws, value, onClose }: { ws: Workspace; value: FollowUp; onClose: () => void }) {
  const [f, setF] = useState(value);
  const [due, setDue] = useState(toLocalInput(value.dueAt));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isNew = !ws.followUps.some((x) => x.id === value.id);
  const customer = ws.customers.find((c) => c.id === f.customerId);

  const setCustomer = (id: string) => {
    const conv = ws.conversations.find((c) => c.customerId === id);
    const lead = ws.leads.find((l) => l.customerId === id);
    setF({ ...f, customerId: id, conversationId: conv?.id ?? null, leadId: lead?.id ?? null, assignedTo: f.assignedTo ?? lead?.assignedTo ?? null });
  };

  const save = () => {
    const e: Record<string, string> = {};
    if (!f.customerId) e.customer = "Select a customer.";
    const dueAt = new Date(due).getTime();
    if (!due || Number.isNaN(dueAt)) e.due = "Choose a valid due date and time.";
    else if (isNew && dueAt < Date.now() - 60_000) e.due = "Due date must be in the future.";
    if (f.kind === "customer" && f.message.trim().length < 5) e.message = "Write the simulated message the customer would receive.";
    if (f.kind === "customer" && !f.conversationId) e.kind = "This customer has no conversation — use an internal reminder.";
    setErrors(e);
    if (Object.keys(e).length) return;
    actions.upsertFollowUp({ ...f, dueAt, message: f.message.trim(), notes: f.notes.trim() });
    toast(isNew ? "Follow-up created" : "Follow-up updated");
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? "Create follow-up" : "Edit follow-up"}
      description="Scheduling is simulated locally — no background jobs run and no real messages are sent."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>{isNew ? "Create follow-up" : "Save changes"}</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Customer" htmlFor="fu-c" required error={errors.customer}>
          <Select id="fu-c" value={f.customerId} onChange={(e) => setCustomer(e.target.value)} aria-invalid={Boolean(errors.customer)}>
            <option value="">Select customer</option>
            {ws.customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} (@{c.username})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Reason" htmlFor="fu-r">
          <Select id="fu-r" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value as FollowUpReason })}>
            {Object.entries(REASON_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Due date & time" htmlFor="fu-d" required error={errors.due}>
          <Input id="fu-d" type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} aria-invalid={Boolean(errors.due)} />
        </Field>
        <Field label="Assigned salesperson" htmlFor="fu-a">
          <Select id="fu-a" value={f.assignedTo ?? ""} onChange={(e) => setF({ ...f, assignedTo: e.target.value || null })}>
            <option value="">Unassigned</option>
            {ws.team.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} — {m.role}
              </option>
            ))}
          </Select>
        </Field>
        <fieldset className="sm:col-span-2">
          <legend className="mb-1.5 text-xs font-medium text-slate-700">Type</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(
              [
                ["internal", "Internal reminder", "A task for the sales team. Nothing is sent to the customer."],
                ["customer", "Simulated customer follow-up", "A message added to the conversation when run — only if permitted."],
              ] as const
            ).map(([v, l, d]) => (
              <label key={v} className={`cursor-pointer rounded-lg border p-3 ${f.kind === v ? "border-brand-500 bg-brand-50/50 ring-1 ring-brand-500" : "border-slate-200"}`}>
                <input type="radio" name="fu-kind" value={v} checked={f.kind === v} onChange={() => setF({ ...f, kind: v })} className="sr-only" />
                <span className="block text-sm font-medium text-slate-800">{l}</span>
                <span className="block text-xs text-slate-500">{d}</span>
              </label>
            ))}
          </div>
          {errors.kind && <p className="mt-1 text-xs text-red-600">{errors.kind}</p>}
          {f.kind === "customer" && customer?.optedOut && (
            <p className="mt-2 text-xs text-amber-700">This customer opted out — when run, this will become an internal reminder only.</p>
          )}
        </fieldset>
        {f.kind === "customer" && (
          <Field label="Message to customer (simulated)" htmlFor="fu-m" required error={errors.message} className="sm:col-span-2">
            <Textarea id="fu-m" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} aria-invalid={Boolean(errors.message)} placeholder={`Hi ${customer?.name.split(" ")[0] ?? "there"}, just following up…`} />
          </Field>
        )}
        <Field label="Internal notes" htmlFor="fu-n" className="sm:col-span-2">
          <Textarea id="fu-n" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} className="min-h-[64px]" />
        </Field>
      </div>
    </Modal>
  );
}
