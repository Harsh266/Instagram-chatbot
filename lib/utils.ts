import type {
  Availability,
  FollowUpReason,
  KnowledgeType,
  LeadCategory,
  PipelineStage,
  Product,
  SourceType,
} from "./types";

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

let counter = 0;
export function uid(prefix = "id") {
  counter = (counter + 1) % 1_000_000;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;
export const MIN = 60_000;

export function formatINR(n: number | null | undefined) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return "₹" + n.toLocaleString("en-IN");
}

export function priceLabel(p: Pick<Product, "priceFrom" | "priceTo" | "priceUnit">) {
  if (p.priceFrom === null) return "Price on request";
  const unit = p.priceUnit ? ` ${p.priceUnit}` : "";
  if (p.priceTo && p.priceTo > p.priceFrom) return `${formatINR(p.priceFrom)} – ${formatINR(p.priceTo)}${unit}`;
  return `From ${formatINR(p.priceFrom)}${unit}`;
}

export function timeAgo(ts: number, now = Date.now()) {
  const d = now - ts;
  const abs = Math.abs(d);
  const future = d < 0;
  let s: string;
  if (abs < MIN) s = "just now";
  else if (abs < HOUR) s = `${Math.round(abs / MIN)}m`;
  else if (abs < DAY) s = `${Math.round(abs / HOUR)}h`;
  else s = `${Math.round(abs / DAY)}d`;
  if (s === "just now") return s;
  return future ? `in ${s}` : `${s} ago`;
}

export function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

export function toLocalInput(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export const CATEGORY_LABEL: Record<LeadCategory, string> = {
  hot: "Hot",
  warm: "Warm",
  cold: "Cold",
  unqualified: "Unqualified",
  review: "Needs Review",
};

export const CATEGORY_TONE: Record<LeadCategory, "red" | "amber" | "blue" | "slate" | "violet"> = {
  hot: "red",
  warm: "amber",
  cold: "blue",
  unqualified: "slate",
  review: "violet",
};

export const STAGES: PipelineStage[] = ["new", "qualified", "contacted", "proposal", "won", "lost"];

export const STAGE_LABEL: Record<PipelineStage, string> = {
  new: "New",
  qualified: "Qualified",
  contacted: "Contacted",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  available: "Available",
  limited: "Limited availability",
  out_of_stock: "Currently unavailable",
  on_request: "On request",
};

export const KNOWLEDGE_LABEL: Record<KnowledgeType, string> = {
  faq: "FAQ",
  offer: "Offer",
  refund: "Refund policy",
  cancellation: "Cancellation policy",
  delivery: "Delivery information",
  rule: "Business rule",
};

export const REASON_LABEL: Record<FollowUpReason, string> = {
  more_info: "Requested more information",
  quotation: "Needs a quotation",
  no_response: "Customer has not responded",
  call: "Salesperson to call customer",
  other: "Other",
};

export const SOURCE_LABEL: Record<SourceType, string> = {
  product: "Service record",
  pricing: "Pricing record",
  faq: "FAQ",
  offer: "Approved offer",
  policy: "Business policy",
  document: "Uploaded document",
  qualification: "Lead qualification",
  handoff: "Human handoff",
  greeting: "Welcome message",
  fallback: "Safe fallback",
  "follow-up": "Follow-up",
};

export const AVATAR_COLORS = [
  "#1d4ed8",
  "#0f766e",
  "#7c3aed",
  "#b45309",
  "#be123c",
  "#0369a1",
  "#4d7c0f",
  "#a21caf",
  "#334155",
  "#c2410c",
];
