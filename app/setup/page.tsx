"use client";

import { AlertTriangle, Check, CheckCircle2, Power } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CatalogueStep } from "@/components/setup/CatalogueStep";
import { InstagramCard } from "@/components/setup/InstagramCard";
import { PoliciesStep } from "@/components/setup/PoliciesStep";
import { ProfileStep } from "@/components/setup/ProfileStep";
import { Badge, Button, Card, PageHeader } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { setupChecks } from "@/lib/setup";
import { actions, useWorkspace } from "@/lib/store";
import { cn, priceLabel } from "@/lib/utils";

const STEPS = ["Business Profile", "Products & Services", "FAQs & Policies", "Instagram Connection", "Review & Activate"];

export default function SetupPage() {
  const ws = useWorkspace()!;
  const [step, setStep] = useState(0);
  const checks = setupChecks(ws);
  const stepDone = (i: number) => checks.filter((c) => c.step === i).every((c) => c.done);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow="Stage 1 · Business setup" title="Business Setup" description="Tell the chatbot about the business once: profile, services and prices, FAQs and policies, and the Instagram account. The chatbot can only use what you enter here." />

      <ol className="mb-6 grid grid-cols-5 gap-2" aria-label="Setup steps">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button
              type="button"
              onClick={() => setStep(i)}
              aria-current={step === i ? "step" : undefined}
              className={cn(
                "flex w-full flex-col items-center gap-2 rounded-lg p-2 text-center transition-colors sm:flex-row sm:text-left",
                step === i ? "bg-white shadow-sm ring-1 ring-brand-200" : "hover:bg-white/60",
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  step === i ? "bg-brand-500 text-navy-950" : i < 4 && stepDone(i) ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600",
                )}
              >
                {i < 4 && stepDone(i) && step !== i ? <Check className="size-3.5" aria-label="Complete" /> : i + 1}
              </span>
              <span className={cn("hidden text-xs font-medium sm:block", step === i ? "text-navy-900" : "text-slate-600")}>{s}</span>
            </button>
          </li>
        ))}
      </ol>

      <Card className="p-5 sm:p-6">
        <h2 className="mb-4 text-base font-semibold text-navy-900">
          Step {step + 1}: {STEPS[step]}
        </h2>
        {step === 0 && <ProfileStep key={ws.id} business={ws.business} onNext={() => setStep(1)} />}
        {step === 1 && <CatalogueStep ws={ws} />}
        {step === 2 && <PoliciesStep ws={ws} />}
        {step === 3 && <InstagramCard key={ws.id} ws={ws} />}
        {step === 4 && <ReviewStep onGoto={setStep} />}
        {step > 0 && (
          <div className="mt-6 flex justify-between border-t border-slate-100 pt-4">
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              Back
            </Button>
            {step < 4 && <Button onClick={() => setStep(step + 1)}>Continue</Button>}
          </div>
        )}
      </Card>
    </div>
  );
}

function ReviewStep({ onGoto }: { onGoto: (s: number) => void }) {
  const ws = useWorkspace()!;
  const checks = setupChecks(ws);
  const missing = checks.filter((c) => !c.done);
  const active = ws.settings.chatbotEnabled;
  const b = ws.business;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Business</p>
          <p className="mt-1 text-sm font-semibold text-navy-900">{b.name || "—"}</p>
          <p className="mt-1 line-clamp-3 text-xs text-slate-600">{b.description || "No description"}</p>
          <dl className="mt-3 space-y-1 text-xs text-slate-600">
            <div>Industry: {b.industry || "—"}</div>
            <div>Location: {b.location || "—"}</div>
            <div>Contact: {[b.email, b.phone].filter(Boolean).join(" · ") || "—"}</div>
            <div>Hours: {b.workingHours || "—"}</div>
          </dl>
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Knowledge summary</p>
          <ul className="mt-2 space-y-1 text-xs text-slate-600">
            {ws.products
              .filter((p) => p.status === "approved")
              .slice(0, 5)
              .map((p) => (
                <li key={p.id} className="flex justify-between gap-2">
                  <span className="truncate">{p.name}</span>
                  <span className="shrink-0 font-medium text-slate-800">{priceLabel(p)}</span>
                </li>
              ))}
          </ul>
          <p className="mt-3 text-xs text-slate-600">
            {ws.knowledge.filter((k) => k.type === "faq" && k.status === "approved").length} FAQs ·{" "}
            {ws.knowledge.filter((k) => k.type === "offer" && k.status === "approved").length} offers ·{" "}
            {ws.knowledge.filter((k) => !["faq", "offer"].includes(k.type) && k.status === "approved").length} policies · {ws.documents.length} documents
          </p>
          <p className="mt-1 text-xs text-slate-600">Instagram: {ws.instagram.status === "connected" ? `${ws.instagram.handle} (simulated)` : "not connected"}</p>
        </div>
      </div>

      {missing.length ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <AlertTriangle className="size-4" aria-hidden /> Setup is not complete — show missing items
          </p>
          <ul className="mt-2 space-y-1.5">
            {missing.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 text-xs text-amber-900">
                <span>• {m.label}</span>
                <button type="button" onClick={() => onGoto(m.step)} className="font-medium underline-offset-2 hover:underline">
                  Go to step {m.step + 1}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="size-4" aria-hidden /> All required information is complete.
        </p>
      )}

      <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-navy-900">
            Demo chatbot <Badge tone={active ? "green" : "slate"} dot>{active ? "Active" : "Inactive"}</Badge>
          </p>
          <p className="mt-0.5 text-xs text-slate-500">When active, simulated customer messages receive automatic replies from your approved information.</p>
        </div>
        <Button
          icon={Power}
          variant={active ? "outline" : "primary"}
          onClick={() => {
            const ok = actions.setChatbotEnabled(!active);
            if (!ok) toast("Complete the missing setup items before activating the chatbot.", "error");
            else toast(active ? "Chatbot deactivated" : "Chatbot activated — it's ready to reply to simulated messages");
          }}
        >
          {active ? "Deactivate chatbot" : "Activate chatbot"}
        </Button>
      </div>
      {active && (
        <p className="text-xs text-slate-500">
          Next: open the{" "}
          <Link href="/inbox" className="font-medium text-brand-700 hover:underline">
            Instagram Inbox
          </Link>{" "}
          and simulate a customer message.
        </p>
      )}
    </div>
  );
}
