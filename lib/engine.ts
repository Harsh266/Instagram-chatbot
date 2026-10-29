/**
 * Local, deterministic response engine for the demo.
 * It never calls an external AI service: it normalises the message, detects intent
 * with keyword rules, looks up approved business records and composes a reply
 * strictly from that data (Workflow stages 3 & 5).
 */
import type {
  DemoDocument,
  KnowledgeItem,
  KnowledgeType,
  Lead,
  LeadField,
  Message,
  Product,
  ResponseSource,
  Settings,
  BusinessProfile,
} from "./types";
import { AVAILABILITY_LABEL, formatINR, priceLabel } from "./utils";

export type Intent =
  | "opt_out"
  | "human"
  | "discount"
  | "delivery"
  | "refund"
  | "cancellation"
  | "pricing"
  | "availability"
  | "purchase"
  | "hours"
  | "contact"
  | "lead_info"
  | "greeting"
  | "thanks"
  | "faq"
  | "document"
  | "unknown";

export interface ExtractedFields {
  budget?: number;
  timeline?: string;
  location?: string;
  contact?: string;
  interest?: string;
  productId?: string;
}

export interface EngineResult {
  intent: Intent;
  reply: string;
  source: ResponseSource;
  extracted: ExtractedFields;
  needsHuman: boolean;
  handoffReason: string | null;
  unknown: boolean;
  optOut: boolean;
  purchaseIntent: boolean;
  matches: { label: string; type: string; score: number }[];
}

export interface EngineInput {
  text: string;
  business: BusinessProfile;
  products: Product[];
  knowledge: KnowledgeItem[];
  documents: DemoDocument[];
  settings: Settings;
  lead: Lead | null;
  history: Message[];
}

const STOP = new Set(
  "a an the is are am i me my we our you your to for of in on at and or it this that what whats how much do does can could would will please hi hello hey with be have has need want any there about get from by as just also tell know me us some like".split(
    " ",
  ),
);

export function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9₹@.\s'+-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stem(w: string) {
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

export function tokens(text: string) {
  return normalize(text)
    .replace(/[.'@+-]/g, " ")
    .split(" ")
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map(stem);
}

const has = (t: string, re: RegExp) => re.test(t);

const RE = {
  optOut: /\b(stop messag|stop sending|unsubscribe|opt ?out|don'?t (message|contact|text)|no more messages|not interested)/,
  human: /\b(human|real person|agent|representative|someone from (your|the) team|talk to (a |your |someone|person|team)|speak (to|with)|call me|manager)\b/,
  discount: /\b(discount|offer|coupon|deal|cheaper|promo|best price|any reduction|festive)/,
  delivery: /\b(deliver|delivery|shipping|ship|turnaround|how long|how many days|completion time|time to complete|timeframe)/,
  refund: /\b(refund|money back|return policy|returns?)\b/,
  cancellation: /\b(cancel|cancellation)/,
  pricing: /\b(price|prices|pricing|cost|costs|charge|charges|rate|rates|fee|fees|how much|package|packages|quote|quotation)\b/,
  availability: /\b(available|availability|in stock|do you (have|offer|provide|do|make|build)|can you (make|build|do|provide|design)|slots?)\b/,
  purchase: /\b(want to (buy|order|book|start|proceed|get)|i('d| would) like (to|a|an)|interested in|let'?s (proceed|start|go)|ready to|sign up|book (a|an|the)|place an order|go ahead)\b/,
  hours: /\b(open|opening|hours|timings?|working hours|when are you)\b/,
  contact: /\b(where are you|address|located|office|contact (number|details)|phone number|email id|your email)\b/,
  greeting: /^(hi|hii+|hello|hey|good (morning|afternoon|evening)|namaste)\b/,
  thanks: /\b(thanks|thank you|thx|great,? thanks|appreciate)\b/,
  affirm: /^(yes|yeah|yep|sure|ok|okay|please do|please|haan|yes please)\b/,
  exploring: /\b(just (exploring|browsing|checking|looking)|no rush|not sure yet|maybe later)\b/,
};

const CITIES = [
  "mumbai", "delhi", "new delhi", "bengaluru", "bangalore", "pune", "hyderabad", "chennai", "kolkata",
  "ahmedabad", "jaipur", "surat", "lucknow", "kochi", "indore", "nagpur", "goa", "chandigarh", "noida",
  "gurgaon", "gurugram", "thane", "nashik", "vadodara", "coimbatore", "dubai", "london", "singapore",
];

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function extractFields(raw: string): ExtractedFields {
  const t = normalize(raw);
  const out: ExtractedFields = {};

  const email = raw.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  const phone = raw.match(/(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/);
  if (email) out.contact = email[0];
  else if (phone) out.contact = phone[0].replace(/\s+/g, " ");

  // Budget: needs a currency marker or the word "budget" so phone numbers are not misread.
  const withoutPhone = phone ? raw.replace(phone[0], " ") : raw;
  const b =
    withoutPhone.match(/(?:₹|rs\.?|inr|rupees)\s*([\d,]+(?:\.\d+)?)\s*(k|lakhs?|lacs?|l)?\b/i) ??
    (/(budget|spend|afford)/i.test(withoutPhone)
      ? withoutPhone.match(/([\d,]+(?:\.\d+)?)\s*(k|lakhs?|lacs?|l)?\b/i)
      : null) ??
    withoutPhone.match(/\b([\d.]+)\s*(k|lakhs?|lacs?)\b/i);
  if (b) {
    let n = parseFloat(b[1].replace(/,/g, ""));
    const unit = (b[2] || "").toLowerCase();
    if (unit === "k") n *= 1000;
    else if (unit.startsWith("l")) n *= 100000;
    if (n >= 500) out.budget = Math.round(n);
  }

  const timelines: [RegExp, (m: RegExpMatchArray) => string][] = [
    [/\b(asap|urgent|urgently|immediately|right away)\b/, () => "Urgent (ASAP)"],
    [/\btoday\b/, () => "Today"],
    [/\btomorrow\b/, () => "Tomorrow"],
    [/\bthis week\b/, () => "This week"],
    [/\bnext week\b/, () => "Next week"],
    [/\b(this|end of( the)?) month\b/, () => "This month"],
    [/\bnext month\b/, () => "Next month"],
    [/\b(within|in) (\d+|a|one|two|three) (day|days|week|weeks|month|months)\b/, (m) => `Within ${m[2] === "a" ? "1" : m[2]} ${m[3]}`],
    [/\bnext quarter\b/, () => "Next quarter"],
    [/\bnext year\b/, () => "Next year"],
    [RE.exploring, () => "Exploring (no fixed timeline)"],
  ];
  for (const [re, f] of timelines) {
    const m = t.match(re);
    if (m) {
      out.timeline = f(m);
      break;
    }
  }

  const city = CITIES.find((c) => new RegExp(`\\b${c}\\b`).test(t));
  if (city) out.location = titleCase(city);
  else {
    const loc = raw.match(/\b(?:i(?:'|’)?m (?:based )?in|i am (?:based )?in|we are in|based in|located in|from)\s+([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)/);
    if (loc) out.location = loc[1];
  }
  return out;
}

function scoreProduct(p: Product, tks: string[], norm: string) {
  let s = 0;
  const nameT = tokens(p.name);
  const kw = p.keywords.map((k) => k.toLowerCase());
  for (const k of kw) if (k.includes(" ") && norm.includes(k)) s += 3;
  const kwT = new Set(kw.flatMap((k) => tokens(k)));
  const descT = new Set(tokens(p.description));
  for (const t of new Set(tks)) {
    if (nameT.includes(t)) s += 2;
    else if (kwT.has(t)) s += 1.5;
    else if (descT.has(t)) s += 0.3;
  }
  return s;
}

function scoreKnowledge(k: KnowledgeItem, tks: string[], norm: string) {
  let s = 0;
  for (const kw of k.keywords) {
    const kl = kw.toLowerCase();
    if (kl && norm.includes(kl)) s += kl.includes(" ") ? 3 : 2;
  }
  const titleT = new Set(tokens(k.title));
  for (const t of new Set(tks)) if (titleT.has(t)) s += 1;
  return s;
}

function best<T>(items: T[], scorer: (x: T) => number, min: number) {
  let top: T | null = null;
  let topScore = 0;
  for (const it of items) {
    const sc = scorer(it);
    if (sc > topScore) {
      top = it;
      topScore = sc;
    }
  }
  return topScore >= min ? { item: top as T, score: topScore } : null;
}

function firstSentences(text: string, n = 2) {
  const parts = text.split(/(?<=[.!?])\s+/);
  return parts.slice(0, n).join(" ");
}

function lastBot(history: Message[]) {
  for (let i = history.length - 1; i >= 0; i--) if (history[i].sender === "bot") return history[i];
  return null;
}

function priceSentence(p: Product) {
  const unit = p.priceUnit ? ` ${p.priceUnit}` : "";
  if (p.priceFrom === null)
    return `Pricing for ${p.name} depends on your requirements, so our team prepares a custom quotation.`;
  if (p.priceTo && p.priceTo > p.priceFrom)
    return `Our ${p.name} packages range from ${formatINR(p.priceFrom)} to ${formatINR(p.priceTo)}${unit}, depending on scope.`;
  return `Our ${p.name} packages start at ${formatINR(p.priceFrom)}${unit}.`;
}

function availabilitySentence(p: Product) {
  switch (p.availability) {
    case "available":
      return `Yes, ${p.name} is available. ${firstSentences(p.description, 1)}`;
    case "limited":
      return `${p.name} is available, but we have limited slots at the moment. ${firstSentences(p.description, 1)}`;
    case "out_of_stock":
      return `${p.name} is not available right now. Our team can let you know as soon as it opens up again.`;
    case "on_request":
      return `${p.name} is offered on request — our team confirms scope and availability for each project.`;
  }
}

const FIELD_ORDER: LeadField[] = ["interest", "budget", "timeline", "location", "contact"];

function missingFields(lead: Lead | null, ex: ExtractedFields): LeadField[] {
  const known: Record<LeadField, boolean> = {
    interest: Boolean(ex.interest || lead?.interest),
    budget: Boolean(ex.budget || lead?.budget),
    timeline: Boolean(ex.timeline || lead?.timeline),
    location: Boolean(ex.location || lead?.location),
    contact: Boolean(ex.contact || lead?.contact),
  };
  return FIELD_ORDER.filter((f) => !known[f]);
}

export function respond(input: EngineInput): EngineResult {
  const { text, products, knowledge, documents, settings, lead, history, business } = input;
  const norm = normalize(text);
  const tks = tokens(text);
  const extracted = extractFields(text);
  const approvedProducts = products.filter((p) => p.status === "approved");
  const approvedKnowledge = knowledge.filter((k) => k.status === "approved");
  const matches: EngineResult["matches"] = [];

  const productMatch = best(approvedProducts, (p) => scoreProduct(p, tks, norm), 2);
  if (productMatch) {
    extracted.interest = productMatch.item.name;
    extracted.productId = productMatch.item.id;
    matches.push({ label: productMatch.item.name, type: "Service record", score: productMatch.score });
  }
  // A product the customer mentioned earlier gives context to follow-up questions like "what's the price?"
  const contextProduct =
    productMatch?.item ?? approvedProducts.find((p) => p.id === lead?.productId) ?? null;

  const byType = (types: KnowledgeType[]) => approvedKnowledge.filter((k) => types.includes(k.type));
  const faqMatch = best(byType(["faq", "rule"]), (k) => scoreKnowledge(k, tks, norm), 2);
  if (faqMatch) matches.push({ label: faqMatch.item.title, type: "FAQ", score: faqMatch.score });

  const prevBot = lastBot(history);
  const offeredTeam = prevBot?.source?.type === "fallback";

  let intent: Intent = "unknown";
  if (has(norm, RE.optOut)) intent = "opt_out";
  else if (has(norm, RE.human) || (offeredTeam && has(norm, RE.affirm))) intent = "human";
  else if (has(norm, RE.discount)) intent = "discount";
  else if (has(norm, RE.refund)) intent = "refund";
  else if (has(norm, RE.cancellation)) intent = "cancellation";
  else if (has(norm, RE.delivery) && !extracted.timeline) intent = "delivery";
  else if (has(norm, RE.pricing) && !/\bbudget\b/.test(norm)) intent = "pricing";
  else if (has(norm, RE.availability)) intent = "availability";
  else if (has(norm, RE.purchase)) intent = "purchase";
  else if (faqMatch && faqMatch.score >= 3) intent = "faq";
  else if (has(norm, RE.hours)) intent = "hours";
  else if (has(norm, RE.contact)) intent = "contact";
  else if (extracted.budget || extracted.timeline || extracted.location || extracted.contact) intent = "lead_info";
  else if (productMatch) intent = "purchase";
  else if (faqMatch) intent = "faq";
  else if (has(norm, RE.greeting)) intent = "greeting";
  else if (has(norm, RE.thanks)) intent = "thanks";

  const friendly = settings.tone === "friendly";
  const concise = settings.tone === "concise";
  let reply = "";
  let source: ResponseSource = { type: "fallback", label: "Safe fallback" };
  let needsHuman = false;
  let handoffReason: string | null = null;
  let unknown = false;
  let qualify = false;
  const purchaseIntent = intent === "purchase" || has(norm, RE.purchase);

  const teamOffer = "Would you like our team to assist you?";

  const policyAnswer = (type: KnowledgeType, missing: string) => {
    const m = best(byType([type]), (k) => scoreKnowledge(k, tks, norm) + 1, 1);
    if (m) {
      matches.push({ label: m.item.title, type: "Policy", score: m.score });
      reply = m.item.content;
      source = { type: "policy", label: m.item.title, refId: m.item.id };
      qualify = true;
    } else {
      reply = `${missing} ${teamOffer}`;
      source = { type: "fallback", label: `No ${type} policy configured` };
    }
  };

  switch (intent) {
    case "opt_out":
      reply =
        "Understood — we won't send you any further follow-up messages. If you need anything in the future, just message us here.";
      source = { type: "policy", label: "Opt-out rule" };
      break;
    case "human":
      needsHuman = true;
      handoffReason = "Customer asked for a person";
      reply = `Of course. I've asked a member of our team to join this conversation — they'll reply here shortly${
        business.workingHours ? ` (working hours: ${business.workingHours})` : ""
      }.`;
      source = { type: "handoff", label: "Human handoff request" };
      break;
    case "discount": {
      // When a service is in context, only an offer that mentions that service applies
      // (ignoring generic words such as "package" that appear in many names).
      const GENERIC = new Set(["package", "service", "plan", "starter", "pack", "offer", "off", "business"]);
      const productTokens = contextProduct
        ? new Set(tokens([contextProduct.name, ...contextProduct.keywords].join(" ")).filter((t) => !GENERIC.has(t)))
        : null;
      const appliesToProduct = (k: KnowledgeItem) =>
        !productTokens || tokens([k.title, ...k.keywords].join(" ")).some((t) => productTokens.has(t));
      const offers = byType(["offer"]).filter(appliesToProduct);
      const scored = best(offers, (k) => scoreKnowledge(k, tks, norm) + 0.5, 0.5);
      if (scored) {
        matches.push({ label: scored.item.title, type: "Offer", score: scored.score });
        reply = scored.item.content;
        source = { type: "offer", label: scored.item.title, refId: scored.item.id };
        qualify = true;
      } else {
        reply = `I'd be happy to check that for you. I don't have a confirmed offer available right now. ${teamOffer}`;
        source = { type: "fallback", label: contextProduct ? `No approved offer for ${contextProduct.name}` : "No approved offer" };
      }
      break;
    }
    case "delivery":
      policyAnswer(
        "delivery",
        "Delivery timelines depend on the service and your requirements, and I don't want to give you an inaccurate estimate.",
      );
      break;
    case "refund":
      policyAnswer("refund", "I don't have our refund terms confirmed here.");
      break;
    case "cancellation":
      policyAnswer("cancellation", "I don't have our cancellation terms confirmed here.");
      break;
    case "pricing":
      if (contextProduct) {
        reply = (friendly ? "Great question! " : "") + priceSentence(contextProduct);
        source = { type: "pricing", label: `${contextProduct.name} — ${priceLabel(contextProduct)}`, refId: contextProduct.id };
        extracted.interest ??= contextProduct.name;
        extracted.productId ??= contextProduct.id;
        qualify = true;
      } else {
        const priced = approvedProducts.filter((p) => p.priceFrom !== null).slice(0, 3);
        if (priced.length) {
          reply = `Here are some of our starting prices: ${priced
            .map((p) => `${p.name} (${priceLabel(p).replace("From ", "from ")})`)
            .join(", ")}. Which service are you interested in?`;
          source = { type: "pricing", label: "Price list (approved services)" };
        } else {
          reply = `I don't have confirmed pricing to share right now. ${teamOffer}`;
          source = { type: "fallback", label: "No pricing configured" };
        }
      }
      break;
    case "availability":
      if (productMatch) {
        reply = availabilitySentence(productMatch.item);
        source = { type: "product", label: `${productMatch.item.name} — ${AVAILABILITY_LABEL[productMatch.item.availability]}`, refId: productMatch.item.id };
        qualify = productMatch.item.availability !== "out_of_stock";
      } else if (faqMatch) {
        reply = faqMatch.item.content;
        source = { type: "faq", label: faqMatch.item.title, refId: faqMatch.item.id };
      } else if (approvedProducts.length) {
        reply = `I couldn't find that in our current services. Here's what we offer: ${approvedProducts
          .slice(0, 5)
          .map((p) => p.name)
          .join(", ")}. Is one of these what you're looking for?`;
        source = { type: "product", label: "Service catalogue" };
        unknown = true;
      } else {
        reply = `I don't have confirmed details about that right now. ${teamOffer}`;
        source = { type: "fallback", label: "No services configured" };
        unknown = true;
      }
      break;
    case "purchase":
      reply = contextProduct
        ? `${friendly ? "Wonderful! " : ""}I can help you get started with ${contextProduct.name}.`
        : `${friendly ? "Wonderful! " : ""}I'd be glad to help you get started.`;
      source = contextProduct
        ? { type: "product", label: contextProduct.name, refId: contextProduct.id }
        : { type: "qualification", label: "Purchase interest" };
      qualify = true;
      break;
    case "faq":
      if (faqMatch) {
        reply = faqMatch.item.content;
        source = { type: "faq", label: faqMatch.item.title, refId: faqMatch.item.id };
        qualify = Boolean(lead);
      }
      break;
    case "hours":
      if (business.workingHours) {
        reply = `Our working hours are ${business.workingHours}. You can message us here anytime and we'll respond as soon as possible.`;
        source = { type: "faq", label: "Business profile — working hours" };
      } else {
        reply = `I don't have our working hours confirmed right now. ${teamOffer}`;
        source = { type: "fallback", label: "Working hours missing" };
      }
      break;
    case "contact": {
      const bits = [
        business.location && `we're based in ${business.location}`,
        business.phone && `you can call us on ${business.phone}`,
        business.email && `email ${business.email}`,
      ].filter(Boolean);
      if (bits.length) {
        reply = `Sure — ${bits.join(", ")}.`;
        source = { type: "faq", label: "Business profile — contact details" };
      } else {
        reply = `I don't have those details confirmed right now. ${teamOffer}`;
        source = { type: "fallback", label: "Contact details missing" };
      }
      break;
    }
    case "lead_info": {
      const noted: string[] = [];
      if (extracted.budget) noted.push(`budget of ${formatINR(extracted.budget)}`);
      if (extracted.timeline) noted.push(`timeline (${extracted.timeline.toLowerCase()})`);
      if (extracted.location) noted.push(`location (${extracted.location})`);
      if (extracted.contact) noted.push("contact details");
      reply = `Thanks for sharing that — I've noted your ${noted.join(", ").replace(/, ([^,]*)$/, " and $1")}.`;
      if (extracted.budget && contextProduct?.priceFrom && extracted.budget < contextProduct.priceFrom) {
        reply += ` Just so you know, ${contextProduct.name} starts at ${formatINR(contextProduct.priceFrom)}${contextProduct.priceUnit ? " " + contextProduct.priceUnit : ""}; our team can suggest options that fit.`;
      }
      source = { type: "qualification", label: "Lead details captured" };
      qualify = true;
      break;
    }
    case "greeting":
      reply = settings.welcomeMessage || `Hi! Thanks for messaging ${business.name}. How can I help you today?`;
      source = { type: "greeting", label: "Welcome message" };
      break;
    case "thanks":
      reply = "You're welcome! Let me know if there's anything else I can help with.";
      source = { type: "greeting", label: "Courtesy reply" };
      break;
    default: {
      // Last resort: an uploaded document whose extracted text overlaps the question.
      const docs = documents.filter((d) => d.status === "processed" && d.approval === "approved" && d.extractedText.trim());
      let docHit: { doc: DemoDocument; sentence: string; score: number } | null = null;
      const tset = new Set(tks);
      for (const d of docs) {
        for (const s of d.extractedText.split(/(?<=[.!?])\s+/)) {
          const sc = tokens(s).filter((w) => tset.has(w)).length;
          if (sc >= 2 && (!docHit || sc > docHit.score)) docHit = { doc: d, sentence: s, score: sc };
        }
      }
      if (docHit) {
        intent = "document";
        reply = docHit.sentence;
        source = { type: "document", label: docHit.doc.name, refId: docHit.doc.id };
        matches.push({ label: docHit.doc.name, type: "Document", score: docHit.score });
      } else {
        unknown = true;
        reply = `I want to make sure you get accurate information, and I don't have confirmed details on that right now. ${teamOffer}`;
        source = { type: "fallback", label: "No matching business information" };
      }
    }
  }

  if (concise) reply = firstSentences(reply, 2);

  // Lead qualification (stage 5): ask one relevant question that hasn't been answered or just asked.
  if (qualify && !needsHuman) {
    const asked = history.filter((m) => m.sender === "bot").map((m) => m.text).join(" \n ");
    const pq = productMatch?.item.qualifyingQuestion;
    if (pq && !asked.includes(pq)) {
      reply += ` ${pq}`;
    } else {
      const missing = missingFields(lead, extracted);
      const lastText = prevBot?.text ?? "";
      const q = settings.qualificationQuestions.find(
        (q) => q.enabled && missing.includes(q.field) && !lastText.includes(q.question),
      );
      if (q) reply += ` ${q.question}`;
      else if (!missing.length && intent === "lead_info")
        reply += " I've shared your details with our team and someone will be in touch with next steps.";
    }
  }

  return {
    intent,
    reply: reply.trim(),
    source,
    extracted,
    needsHuman,
    handoffReason,
    unknown,
    optOut: intent === "opt_out",
    purchaseIntent,
    matches,
  };
}

/** Preview helper for the Knowledge Base page — shows what would match without changing data. */
export function previewMatch(input: Omit<EngineInput, "lead" | "history">) {
  return respond({ ...input, lead: null, history: [] });
}
