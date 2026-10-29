"use client";

import { Ban, Bell, CalendarClock, CalendarPlus, Check, Clock, Pencil, PlayCircle, Search, Send } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { FollowUpForm } from "@/components/followups/FollowUpForm";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { Avatar, Badge, Button, Card, DemoNotice, EmptyState, Field, Input, PageHeader, Select, StatCard } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { startOfDay } from "@/lib/analytics";
import { useNow } from "@/lib/clock";
import { actions, followUpBlocker, newFollowUp, useWorkspace } from "@/lib/store";
import type { FollowUp } from "@/lib/types";
import { DAY, REASON_LABEL, cn, formatDateTime, timeAgo, toLocalInput } from "@/lib/utils";

export default function FollowUpsPage() {
  return (
    <Suspense>
      <FollowUps />
    </Suspense>
  );
}

type StatusFilter = "active" | "overdue" | "scheduled" | "completed" | "cancelled" | "stopped" | "all";
type DueFilter = "any" | "today" | "week" | "past";

function FollowUps() {
  const ws = useWorkspace()!;
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [due, setDue] = useState<DueFilter>("any");
  const [owner, setOwner] = useState("all");
  const [editing, setEditing] = useState<FollowUp | null>(null);
  const [resched, setResched] = useState<FollowUp | null>(null);
  const [reschedAt, setReschedAt] = useState("");
  const [reschedErr, setReschedErr] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<FollowUp | null>(null);

  const now = useNow();
  const customers = new Map(ws.customers.map((c) => [c.id, c]));
  const team = new Map(ws.team.map((m) => [m.id, m]));
  const isOverdue = (f: FollowUp) => f.status === "scheduled" && f.dueAt < now;
  const today0 = startOfDay(now);

  const s = q.trim().toLowerCase();
  const list = ws.followUps
    .filter((f) => {
      const st =
        status === "all" ||
        (status === "active" && f.status === "scheduled") ||
        (status === "overdue" && isOverdue(f)) ||
        (status === "scheduled" && f.status === "scheduled" && !isOverdue(f)) ||
        f.status === status;
      const du =
        due === "any" ||
        (due === "today" && f.dueAt >= today0 && f.dueAt < today0 + DAY) ||
        (due === "week" && f.dueAt >= today0 && f.dueAt < today0 + 7 * DAY) ||
        (due === "past" && f.dueAt < now);
      const ow = owner === "all" || (owner === "none" ? !f.assignedTo : f.assignedTo === owner);
      const c = customers.get(f.customerId);
      const tx = !s || c?.name.toLowerCase().includes(s) || f.notes.toLowerCase().includes(s) || f.message.toLowerCase().includes(s);
      return st && du && ow && tx;
    })
    .sort((a, b) => (a.status === "scheduled" ? 0 : 1) - (b.status === "scheduled" ? 0 : 1) || a.dueAt - b.dueAt);

  const counts = {
    scheduled: ws.followUps.filter((f) => f.status === "scheduled").length,
    overdue: ws.followUps.filter(isOverdue).length,
    completed: ws.followUps.filter((f) => f.status === "completed").length,
    stopped: ws.followUps.filter((f) => f.status === "stopped" || f.status === "cancelled").length,
  };

  const run = (f: FollowUp) => {
    const r = actions.runFollowUp(f.id);
    if (r.sent) toast(`Simulated follow-up sent to ${customers.get(f.customerId)?.name} — see the Inbox`);
    else toast(f.kind === "internal" ? "Reminder marked complete" : `Not sent: ${r.reason}. Recorded as an internal reminder only.`, f.kind === "internal" ? "success" : "info");
  };

  const runDue = () => {
    const dueList = ws.followUps.filter(isOverdue);
    if (!dueList.length) return toast("No follow-ups are due right now.", "info");
    let sent = 0;
    let internal = 0;
    for (const f of dueList) {
      if (f.kind === "internal") continue;
      if (actions.runFollowUp(f.id).sent) sent++;
      else internal++;
    }
    const reminders = dueList.filter((f) => f.kind === "internal").length;
    toast(`Processed due follow-ups: ${sent} simulated message(s) sent, ${internal} blocked (internal only), ${reminders} internal reminder(s) left for the team.`, "info");
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader eyebrow="Stage 7 · Follow-up & outcome"
        title="Follow-Up Center"
        description="Reminders for the sales team and follow-up messages for customers. Messages are only sent when allowed, and stop automatically when a lead is won, lost or opts out."
        actions={
          <>
            <Button variant="outline" icon={PlayCircle} onClick={runDue}>
              Run due follow-ups
            </Button>
            <Button icon={CalendarPlus} onClick={() => setEditing(newFollowUp(ws))} disabled={!ws.customers.length}>
              Create follow-up
            </Button>
          </>
        }
      />
      <DemoNotice className="mb-5">
        Scheduling is simulated in your browser — no background jobs run and nothing is sent to Instagram. <strong>Internal reminders</strong> are tasks for
        your team; <strong>customer follow-ups</strong> add a simulated message to the conversation when run.
      </DemoNotice>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Scheduled" value={counts.scheduled} icon={CalendarClock} />
        <StatCard label="Overdue" value={counts.overdue} icon={Clock} tone="red" />
        <StatCard label="Completed" value={counts.completed} icon={Check} tone="green" />
        <StatCard label="Stopped / cancelled" value={counts.stopped} icon={Ban} tone="slate" />
      </div>

      <div className="mb-4 flex flex-col gap-2 lg:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by customer or notes" className="pl-9" aria-label="Search follow-ups" />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className="lg:w-44" aria-label="Filter by status">
          <option value="active">Pending (all)</option>
          <option value="overdue">Overdue</option>
          <option value="scheduled">Upcoming</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="stopped">Stopped</option>
          <option value="all">All statuses</option>
        </Select>
        <Select value={due} onChange={(e) => setDue(e.target.value as DueFilter)} className="lg:w-40" aria-label="Filter by due date">
          <option value="any">Any due date</option>
          <option value="today">Due today</option>
          <option value="week">Next 7 days</option>
          <option value="past">Past due date</option>
        </Select>
        <Select value={owner} onChange={(e) => setOwner(e.target.value)} className="lg:w-44" aria-label="Filter by salesperson">
          <option value="all">All salespeople</option>
          <option value="none">Unassigned</option>
          {ws.team.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
      </div>

      {list.length === 0 ? (
        <Card>
          <EmptyState icon={CalendarClock} title="No follow-ups found" description="Change the filters or create a new follow-up." action={<Button variant="outline" size="sm" onClick={() => { setStatus("all"); setDue("any"); setOwner("all"); setQ(""); }}>Show all</Button>} />
        </Card>
      ) : (
        <ul className="space-y-3">
          {list.map((f) => {
            const c = customers.get(f.customerId);
            const overdue = isOverdue(f);
            const blocker = f.status === "scheduled" ? followUpBlocker(ws, f) : null;
            return (
              <li key={f.id}>
                <Card className={cn("p-4", overdue && "border-red-200")}>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start">
                    {c && <Avatar name={c.name} color={c.color} />}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-navy-900">{c?.name ?? "Unknown customer"}</p>
                        <Badge tone={f.kind === "internal" ? "slate" : "pink"}>
                          {f.kind === "internal" ? <Bell className="size-3" aria-hidden /> : <Send className="size-3" aria-hidden />}
                          {f.kind === "internal" ? "Internal reminder" : "Simulated customer follow-up"}
                        </Badge>
                        <StatusBadge f={f} overdue={overdue} />
                      </div>
                      <p className="mt-1 text-xs text-slate-600">
                        {REASON_LABEL[f.reason]} · {team.get(f.assignedTo ?? "")?.name ?? "Unassigned"} · due {formatDateTime(f.dueAt)} ({timeAgo(f.dueAt)})
                      </p>
                      {f.message && <p className="mt-2 rounded-lg bg-pink-50/60 px-3 py-2 text-xs text-slate-700">“{f.message}”</p>}
                      {f.notes && <p className="mt-2 text-xs text-slate-500">Note: {f.notes}</p>}
                      {f.closedReason && <p className="mt-2 text-xs font-medium text-slate-500">{f.closedReason}</p>}
                      {f.kind === "customer" && blocker && <p className="mt-2 text-xs text-amber-700">Will become an internal reminder only: {blocker}.</p>}
                      {f.conversationId && (
                        <Link href={`/inbox?c=${f.conversationId}`} className="mt-2 inline-block text-xs font-medium text-brand-700 hover:underline">
                          Related conversation →
                        </Link>
                      )}
                    </div>
                    {f.status === "scheduled" ? (
                      <div className="flex flex-wrap gap-2 md:max-w-[260px] md:justify-end">
                        {f.kind === "customer" && (
                          <Button size="sm" icon={Send} onClick={() => run(f)}>
                            Send now
                          </Button>
                        )}
                        <Button size="sm" variant="outline" icon={Check} onClick={() => { actions.setFollowUpStatus(f.id, "completed", "Marked complete by the team"); toast("Follow-up marked complete"); }}>
                          Complete
                        </Button>
                        <Button size="sm" variant="outline" icon={Clock} onClick={() => { setResched(f); setReschedAt(toLocalInput(Math.max(f.dueAt, Date.now() + 3_600_000))); setReschedErr(null); }}>
                          Reschedule
                        </Button>
                        <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(f)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" icon={Ban} className="text-red-600 hover:bg-red-50" onClick={() => setCancelling(f)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" icon={Clock} onClick={() => { setResched(f); setReschedAt(toLocalInput(Date.now() + DAY)); setReschedErr(null); }}>
                        Reschedule
                      </Button>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <FollowUpForm ws={ws} value={editing} onClose={() => setEditing(null)} />
      <Modal
        open={Boolean(resched)}
        onClose={() => setResched(null)}
        title="Reschedule follow-up"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setResched(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const t = new Date(reschedAt).getTime();
                if (!reschedAt || Number.isNaN(t)) return setReschedErr("Choose a valid date and time.");
                if (t < Date.now()) return setReschedErr("Choose a time in the future.");
                if (resched) actions.rescheduleFollowUp(resched.id, t);
                toast("Follow-up rescheduled");
                setResched(null);
              }}
            >
              Reschedule
            </Button>
          </>
        }
      >
        <Field label="New due date & time" htmlFor="rs-at" error={reschedErr}>
          <Input id="rs-at" type="datetime-local" value={reschedAt} onChange={(e) => setReschedAt(e.target.value)} aria-invalid={Boolean(reschedErr)} />
        </Field>
      </Modal>
      <ConfirmDialog
        open={Boolean(cancelling)}
        onClose={() => setCancelling(null)}
        onConfirm={() => {
          if (cancelling) actions.setFollowUpStatus(cancelling.id, "cancelled", "Cancelled by the team");
          toast("Follow-up cancelled");
        }}
        title="Cancel follow-up?"
        message="The follow-up will not be sent or reminded. You can reschedule it later."
        confirmLabel="Cancel follow-up"
      />
    </div>
  );
}

function StatusBadge({ f, overdue }: { f: FollowUp; overdue: boolean }) {
  if (overdue) return <Badge tone="red">Overdue</Badge>;
  const map = { scheduled: ["blue", "Scheduled"], completed: ["green", "Completed"], cancelled: ["slate", "Cancelled"], stopped: ["amber", "Stopped"] } as const;
  const [tone, label] = map[f.status];
  return <Badge tone={tone}>{label}</Badge>;
}
