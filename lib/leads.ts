import type { Customer, Lead, LeadCategory, Product } from "./types";
import { formatINR } from "./utils";

const URGENT = /urgent|today|tomorrow|this week|next week|this month|within (\d+|a|one|two) (day|days|week|weeks)/i;
const MEDIUM = /next month|within .* month|next quarter/i;

/**
 * Transparent demo scoring. Every point is listed in the reason so the client
 * can see exactly why a lead got its category.
 */
export function classifyLead(
  lead: Lead,
  product: Product | null,
  customer: Customer | null,
): { score: number; category: LeadCategory; reason: string } {
  const parts: string[] = [];
  let score = 0;
  const add = (n: number, why: string) => {
    score += n;
    parts.push(`${why} (${n > 0 ? "+" : ""}${n})`);
  };

  if (customer?.optedOut) {
    return { score: 0, category: "unqualified", reason: "Customer opted out of messages." };
  }

  if (lead.interest) add(20, `Interested in ${lead.interest}`);
  if (lead.budget) {
    add(20, `Budget shared: ${formatINR(lead.budget)}`);
    if (product?.priceFrom) {
      if (lead.budget >= product.priceFrom) add(15, "Budget fits starting price");
      else if (lead.budget < product.priceFrom * 0.5) {
        return {
          score: Math.max(score - 30, 0),
          category: "unqualified",
          reason: `Budget ${formatINR(lead.budget)} is well below the ${formatINR(product.priceFrom)} starting price for ${product.name}.`,
        };
      } else add(-10, "Budget slightly below starting price");
    }
  }
  if (lead.timeline) {
    if (URGENT.test(lead.timeline)) add(25, `Urgent timeline: ${lead.timeline}`);
    else if (MEDIUM.test(lead.timeline)) add(10, `Timeline: ${lead.timeline}`);
    else add(0, `Timeline: ${lead.timeline}`);
  }
  if (lead.contact) add(10, "Contact details shared");
  if (lead.location) add(5, `Location: ${lead.location}`);
  if (lead.purchaseIntent) add(10, "Expressed purchase intent");

  score = Math.max(0, Math.min(100, score));
  const summary = parts.length ? parts.join(" · ") : "No qualification details captured yet";

  if (lead.reviewFlag && score < 70) {
    return { score, category: "review", reason: `${lead.reviewFlag}. ${summary}` };
  }
  const category: LeadCategory = score >= 70 ? "hot" : score >= 40 ? "warm" : "cold";
  const band = category === "hot" ? "Score ≥ 70 → Hot" : category === "warm" ? "Score 40–69 → Warm" : "Score < 40 → Cold";
  return { score, category, reason: `${band}. ${summary}` };
}

export function nextActionFor(lead: Lead): string {
  if (lead.stage === "won") return "Onboard customer";
  if (lead.stage === "lost") return "No action — closed";
  if (lead.category === "unqualified") return "No sales action";
  if (lead.category === "review") return "Review conversation";
  if (!lead.interest) return "Identify required service";
  if (!lead.budget) return "Confirm budget";
  if (!lead.timeline) return "Confirm timeline";
  if (!lead.contact) return "Collect contact details";
  if (lead.stage === "new" || lead.stage === "qualified") return "Call customer";
  if (lead.stage === "contacted") return "Send proposal";
  return "Follow up on proposal";
}
