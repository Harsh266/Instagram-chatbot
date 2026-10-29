"use client";

import { ArrowDown, ArrowUp, Bell, Bot, CalendarClock, FlaskConical, Handshake, ListChecks, RotateCcw, Save } from "lucide-react";
import { useState } from "react";
import { InstagramCard } from "@/components/setup/InstagramCard";
import { ConfirmDialog } from "@/components/ui/Modal";
import { Button, Card, CardHeader, Field, Input, PageHeader, Select, Textarea, Toggle } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { actions, useWorkspace } from "@/lib/store";
import type { Settings, Tone, Workspace } from "@/lib/types";

export default function SettingsPage() {
  const ws = useWorkspace()!;
  // Re-mount the form when the workspace or saved settings change elsewhere (e.g. reset).
  return <SettingsForm key={ws.id + JSON.stringify(ws.settings) + ws.business.workingHours} ws={ws} />;
}

const FIELD_LABEL = { interest: "Product / service", budget: "Budget", timeline: "Timeline", location: "Location", contact: "Contact details" };

function SettingsForm({ ws }: { ws: Workspace }) {
  const [s, setS] = useState<Settings>(ws.settings);
  const [hours, setHours] = useState(ws.business.workingHours);
  const [resetOpen, setResetOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const dirty = JSON.stringify(s) !== JSON.stringify(ws.settings) || hours !== ws.business.workingHours;

  const save = () => {
    if (s.welcomeMessage.trim().length < 5) return setErr("Welcome message must be at least 5 characters.");
    if (s.qualificationQuestions.some((q) => q.enabled && q.question.trim().length < 5)) return setErr("Enabled qualification questions cannot be empty.");
    setErr(null);
    if (hours !== ws.business.workingHours) actions.updateBusiness({ ...ws.business, workingHours: hours.trim() });
    const ok = actions.updateSettings({ ...s, welcomeMessage: s.welcomeMessage.trim() });
    toast(ok ? "Settings saved" : "Settings saved, but the chatbot stays off until Business Setup is complete.", ok ? "success" : "error");
  };

  const moveQ = (i: number, d: -1 | 1) => {
    const qs = [...s.qualificationQuestions];
    const j = i + d;
    if (j < 0 || j >= qs.length) return;
    [qs[i], qs[j]] = [qs[j], qs[i]];
    setS({ ...s, qualificationQuestions: qs });
  };

  return (
    <div className="mx-auto max-w-4xl pb-20">
      <PageHeader eyebrow="Configuration"
        title="Settings"
        description="Choose how the chatbot talks, which questions it asks, and when it hands a conversation to a person."
        actions={
          <Button icon={Save} onClick={save} disabled={!dirty}>
            Save changes
          </Button>
        }
      />
      {err && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {err}
        </p>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader title="Chatbot" icon={Bot} />
          <div className="space-y-5 p-5">
            <Toggle id="st-on" checked={s.chatbotEnabled} onChange={(v) => setS({ ...s, chatbotEnabled: v })} label="Chatbot enabled" description="When off, simulated messages are left for the team without automatic replies." />
            <Field label="Welcome message" htmlFor="st-wel" hint="Used when a customer only says hello.">
              <Textarea id="st-wel" value={s.welcomeMessage} onChange={(e) => setS({ ...s, welcomeMessage: e.target.value })} />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Reply tone" htmlFor="st-tone">
                <Select id="st-tone" value={s.tone} onChange={(e) => setS({ ...s, tone: e.target.value as Tone })}>
                  <option value="friendly">Friendly</option>
                  <option value="professional">Professional</option>
                  <option value="concise">Concise</option>
                </Select>
              </Field>
              <Field label="Business working hours" htmlFor="st-hours" hint="Mentioned in handoff and opening-hours replies.">
                <Input id="st-hours" value={hours} onChange={(e) => setHours(e.target.value)} />
              </Field>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Lead qualification questions" description="Asked one at a time, in this order, only when the answer isn't already known." icon={ListChecks} />
          <ul className="divide-y divide-slate-100">
            {s.qualificationQuestions.map((q, i) => (
              <li key={q.field} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2 sm:w-40">
                  <input
                    type="checkbox"
                    id={`q-${q.field}`}
                    checked={q.enabled}
                    onChange={(e) => setS({ ...s, qualificationQuestions: s.qualificationQuestions.map((x, k) => (k === i ? { ...x, enabled: e.target.checked } : x)) })}
                    className="size-4 accent-brand-600"
                  />
                  <label htmlFor={`q-${q.field}`} className="text-xs font-medium text-slate-700">
                    {FIELD_LABEL[q.field]}
                  </label>
                </div>
                <Input
                  value={q.question}
                  onChange={(e) => setS({ ...s, qualificationQuestions: s.qualificationQuestions.map((x, k) => (k === i ? { ...x, question: e.target.value } : x)) })}
                  aria-label={`${FIELD_LABEL[q.field]} question`}
                  disabled={!q.enabled}
                  className="flex-1"
                />
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" icon={ArrowUp} onClick={() => moveQ(i, -1)} disabled={i === 0} aria-label="Move up" />
                  <Button size="sm" variant="ghost" icon={ArrowDown} onClick={() => moveQ(i, 1)} disabled={i === s.qualificationQuestions.length - 1} aria-label="Move down" />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Human handoff conditions" description="When a person is needed the lead is assigned, the team is notified and the chatbot pauses." icon={Handshake} />
          <div className="space-y-5 p-5">
            <Toggle id="h-req" checked={s.handoff.onHumanRequest} onChange={(v) => setS({ ...s, handoff: { ...s.handoff, onHumanRequest: v } })} label="Customer asks for a person" description="Hand off and pause the chatbot." />
            <Toggle id="h-hot" checked={s.handoff.onHotLead} onChange={(v) => setS({ ...s, handoff: { ...s.handoff, onHotLead: v } })} label="Assign hot leads automatically" description="Assigns the least-busy salesperson and notifies them; the chatbot keeps assisting until someone takes over." />
            <Toggle id="h-fail" checked={s.handoff.onSendFailure} onChange={(v) => setS({ ...s, handoff: { ...s.handoff, onSendFailure: v } })} label="Reply could not be sent" description="After a failed retry, alert the team and pause the chatbot." />
            <Field label="Unanswered questions before handoff" htmlFor="h-unk" hint="0 disables this rule.">
              <Select id="h-unk" value={s.handoff.unknownThreshold} onChange={(e) => setS({ ...s, handoff: { ...s.handoff, unknownThreshold: Number(e.target.value) } })} className="sm:w-48">
                {[0, 1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n === 0 ? "Disabled" : `${n} question${n > 1 ? "s" : ""}`}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Follow-up preferences" icon={CalendarClock} />
          <div className="space-y-5 p-5">
            <Toggle
              id="f-cust"
              checked={s.followUp.customerFacingEnabled}
              onChange={(v) => setS({ ...s, followUp: { ...s.followUp, customerFacingEnabled: v } })}
              label="Allow simulated customer-facing follow-ups"
              description="When off, every follow-up becomes an internal reminder only — no message is added to the conversation."
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Default follow-up delay" htmlFor="f-delay">
                <Select id="f-delay" value={s.followUp.defaultDelayHours} onChange={(e) => setS({ ...s, followUp: { ...s.followUp, defaultDelayHours: Number(e.target.value) } })}>
                  {[2, 6, 24, 48, 72].map((h) => (
                    <option key={h} value={h}>
                      {h < 24 ? `${h} hours` : `${h / 24} day${h > 24 ? "s" : ""}`}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Maximum follow-ups per lead" htmlFor="f-max" hint="Guidance for the sales team.">
                <Select id="f-max" value={s.followUp.maxPerLead} onChange={(e) => setS({ ...s, followUp: { ...s.followUp, maxPerLead: Number(e.target.value) } })}>
                  {[1, 2, 3, 5].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Notification preferences" description="In-app notifications in the top bar." icon={Bell} />
          <div className="space-y-5 p-5">
            {(
              [
                ["newLead", "New lead captured"],
                ["hotLead", "Lead becomes hot"],
                ["handoff", "Human handoff & assignments"],
                ["followUpDue", "Follow-up due"],
                ["failedReply", "Reply failed to send"],
              ] as const
            ).map(([k, l]) => (
              <Toggle key={k} id={`n-${k}`} checked={s.notifications[k]} onChange={(v) => setS({ ...s, notifications: { ...s.notifications, [k]: v } })} label={l} />
            ))}
          </div>
        </Card>

        <div>
          <h2 className="mb-2 text-sm font-semibold text-navy-900">Demo Instagram connection</h2>
          <InstagramCard ws={ws} />
        </div>

        <Card>
          <CardHeader title="Demo controls" icon={FlaskConical} />
          <div className="space-y-5 p-5">
            <Toggle
              id="d-fail"
              checked={s.simulateSendFailure}
              onChange={(v) => setS({ ...s, simulateSendFailure: v })}
              label="Simulate reply delivery failures"
              description="Every simulated chatbot reply fails after a safe retry, so you can demonstrate stage 4's error path."
            />
          </div>
        </Card>

        <Card id="reset" className="scroll-mt-24 border-red-200">
          <CardHeader title="Reset demo data" icon={RotateCcw} />
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">Restore the original Brightline Digital Studio sample data. All changes, created businesses and simulated conversations will be removed.</p>
            <Button variant="danger" icon={RotateCcw} onClick={() => setResetOpen(true)}>
              Reset demo
            </Button>
          </div>
        </Card>
      </div>

      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
            <p className="text-sm text-slate-600">You have unsaved changes.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setS(ws.settings); setHours(ws.business.workingHours); setErr(null); }}>
                Discard
              </Button>
              <Button icon={Save} onClick={save}>
                Save changes
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={() => {
          actions.resetDemo();
          toast("Demo reset — the original sample data has been restored");
        }}
        title="Reset demo data?"
        message="This restores the original sample business, customers, conversations, leads and follow-ups. Everything you changed in this browser will be lost."
        confirmLabel="Reset demo"
      />
    </div>
  );
}
