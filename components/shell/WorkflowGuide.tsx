"use client";

import Link from "next/link";
import { Modal } from "../ui/Modal";

export const STAGES_INFO = [
  { n: 1, title: "Business setup", text: "Add business info, products, prices, offers, FAQs and policies; connect Instagram. Missing items are shown until setup is complete.", href: "/setup" },
  { n: 2, title: "Customer sends a message", text: "Each new Instagram DM is picked up and duplicates are skipped. In this demo, use “Simulate Customer Message”.", href: "/inbox" },
  { n: 3, title: "Understand & answer", text: "The chatbot identifies intent and checks only approved business information. If it is missing, it asks to clarify or offers the team.", href: "/knowledge" },
  { n: 4, title: "Reply to the customer", text: "The reply is sent; failures are retried safely and the team is alerted. Paused conversations get no automatic reply.", href: "/inbox" },
  { n: 5, title: "Qualify the lead", text: "Need, budget, location, timeline and contact are captured, and the lead is classified Hot · Warm · Cold · Unqualified · Needs review.", href: "/leads" },
  { n: 6, title: "Sales team handoff", text: "When a person is needed the lead is assigned, the team is notified and the chatbot pauses for that conversation.", href: "/inbox" },
  { n: 7, title: "Follow-up & outcome", text: "Follow-ups are sent only when permitted, otherwise they become internal reminders. Won, lost or opt-out stops sales follow-ups.", href: "/follow-ups" },
];

export function WorkflowGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="How this demo works" description="The 7 workflow stages from the client workflow document, and where to see each one." size="lg">
      <p className="mb-4 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
        Everything runs locally in your browser. No real Instagram account, Meta API or AI model is connected — customer messages are simulated and replies
        come from a deterministic rules engine that only uses the business information you configure.
      </p>
      <ol className="space-y-3">
        {STAGES_INFO.map((s) => (
          <li key={s.n} className="flex gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-navy-900 text-xs font-semibold text-white">{s.n}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-navy-900">{s.title}</p>
                <Link href={s.href} onClick={onClose} className="text-xs font-medium text-brand-700 hover:underline">
                  Open
                </Link>
              </div>
              <p className="text-xs leading-relaxed text-slate-600">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </Modal>
  );
}
