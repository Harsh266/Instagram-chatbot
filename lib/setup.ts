import type { Workspace } from "./types";

export interface SetupCheck {
  id: string;
  label: string;
  step: number;
  done: boolean;
}

/** Workflow stage 1: "Is setup complete?" — returns every check so missing items can be shown. */
export function setupChecks(ws: Workspace): SetupCheck[] {
  const b = ws.business;
  return [
    { id: "name", label: "Business name", step: 0, done: Boolean(b.name.trim()) },
    { id: "desc", label: "Business description", step: 0, done: Boolean(b.description.trim()) },
    { id: "contact", label: "Contact email or phone", step: 0, done: Boolean(b.email.trim() || b.phone.trim()) },
    { id: "hours", label: "Working hours", step: 0, done: Boolean(b.workingHours.trim()) },
    {
      id: "products",
      label: "At least one approved product or service",
      step: 1,
      done: ws.products.some((p) => p.status === "approved"),
    },
    {
      id: "faq",
      label: "At least one approved FAQ",
      step: 2,
      done: ws.knowledge.some((k) => k.type === "faq" && k.status === "approved"),
    },
    { id: "ig", label: "Instagram account connected (simulated)", step: 3, done: ws.instagram.status === "connected" },
  ];
}

export function isSetupComplete(ws: Workspace) {
  return setupChecks(ws).every((c) => c.done);
}
