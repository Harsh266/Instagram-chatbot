"use client";

import { useSyncExternalStore } from "react";
import { bumpNow } from "./clock";
import { respond } from "./engine";
import { classifyLead, nextActionFor } from "./leads";
import { blankWorkspace } from "./seed";
import { isSetupComplete } from "./setup";
import { clearState, freshState, loadState, saveState } from "./storage";
import type {
  Activity,
  BusinessProfile,
  Conversation,
  DemoDocument,
  DemoState,
  FollowUp,
  KnowledgeItem,
  Lead,
  LeadCategory,
  Message,
  PipelineStage,
  Product,
  Settings,
  Workspace,
} from "./types";
import { AVATAR_COLORS, CATEGORY_LABEL, HOUR, MIN, SOURCE_LABEL, STAGE_LABEL, uid } from "./utils";

// ---------------------------------------------------------------------------------------
// Tiny external store (browser only). The server snapshot is null so pages render a
// loading state during SSR/hydration and never touch localStorage on the server.
// ---------------------------------------------------------------------------------------

type Listener = () => void;

function createStore<T>(initial: T) {
  let value = initial;
  const listeners = new Set<Listener>();
  return {
    get: () => value,
    set(next: T) {
      value = next;
      listeners.forEach((l) => l());
    },
    subscribe(l: Listener) {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
  };
}

let loaded = false;
let loadNotice: string | null = null;
const demo = createStore<DemoState | null>(null);

function ensureLoaded() {
  if (!loaded && typeof window !== "undefined") {
    loaded = true;
    const r = loadState();
    loadNotice = r.notice;
    demo.set(r.state);
  }
  return demo.get();
}

export function takeLoadNotice() {
  const n = loadNotice;
  loadNotice = null;
  return n;
}

function commitState(next: DemoState) {
  saveState(next);
  bumpNow();
  demo.set(next);
}

/** Apply a mutation to a deep copy of the active workspace and persist it. */
function mutate(recipe: (ws: Workspace) => void) {
  const cur = ensureLoaded();
  if (!cur) return;
  const next: DemoState = structuredClone(cur);
  const ws = next.workspaces.find((w) => w.id === next.activeWorkspaceId)!;
  recipe(ws);
  ws.activities = ws.activities.slice(0, 400);
  ws.notifications = ws.notifications.slice(0, 60);
  commitState(next);
}

function activeWs() {
  const s = ensureLoaded();
  return s ? (s.workspaces.find((w) => w.id === s.activeWorkspaceId) ?? null) : null;
}

export function useDemoState() {
  return useSyncExternalStore(demo.subscribe, ensureLoaded, () => null);
}

export function useWorkspace(): Workspace | null {
  const s = useDemoState();
  return s ? (s.workspaces.find((w) => w.id === s.activeWorkspaceId) ?? s.workspaces[0]) : null;
}

// Transient UI state: conversations with a simulated reply in progress.
const typing = createStore<string[]>([]);
const noTyping: string[] = [];
export function useTyping() {
  return useSyncExternalStore(typing.subscribe, typing.get, () => noTyping);
}
let activeConversationId: string | null = null;
export function setActiveConversation(id: string | null) {
  activeConversationId = id;
}

// ---------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------

function log(ws: Workspace, a: Omit<Activity, "id" | "at">) {
  ws.activities.unshift({ id: uid("a"), at: Date.now(), ...a });
}

function notify(ws: Workspace, kind: keyof Settings["notifications"], title: string, body: string, href: string) {
  if (!ws.settings.notifications[kind]) return;
  ws.notifications.unshift({ id: uid("nt"), at: Date.now(), title, body, href, read: false });
}

const customerName = (ws: Workspace, id: string) => ws.customers.find((c) => c.id === id)?.name ?? "Customer";
const memberName = (ws: Workspace, id: string | null) => ws.team.find((m) => m.id === id)?.name ?? "Unassigned";

function pickSalesperson(ws: Workspace) {
  const sales = ws.team.filter((m) => /sales/i.test(m.role));
  const pool = sales.length ? sales : ws.team;
  const load = (id: string) =>
    ws.leads.filter((l) => l.assignedTo === id && l.stage !== "won" && l.stage !== "lost").length;
  return [...pool].sort((a, b) => load(a.id) - load(b.id))[0]?.id ?? null;
}

function reclassify(ws: Workspace, lead: Lead) {
  if (!lead.categoryOverridden) {
    const r = classifyLead(
      lead,
      ws.products.find((p) => p.id === lead.productId) ?? null,
      ws.customers.find((c) => c.id === lead.customerId) ?? null,
    );
    lead.score = r.score;
    lead.category = r.category;
    lead.categoryReason = r.reason;
  }
  lead.nextAction = nextActionFor(lead);
}

function stopFollowUps(ws: Workspace, pred: (f: FollowUp) => boolean, reason: string) {
  let n = 0;
  for (const f of ws.followUps) {
    if (f.status === "scheduled" && pred(f)) {
      f.status = "stopped";
      f.closedAt = Date.now();
      f.closedReason = reason;
      n++;
    }
  }
  return n;
}

function systemMessage(ws: Workspace, conversationId: string, text: string) {
  ws.messages.push({ id: uid("m"), conversationId, sender: "system", text, at: Date.now(), status: "sent" });
}

/** Workflow stage 6: assign to the sales team, notify, and pause the chatbot. */
function handoff(ws: Workspace, conv: Conversation, reason: string) {
  if (conv.handledBy === "human" && conv.botPaused) return;
  conv.botPaused = true;
  conv.handledBy = "human";
  conv.assignedTo ??= pickSalesperson(ws);
  const lead = ws.leads.find((l) => l.conversationId === conv.id);
  if (lead && !lead.assignedTo) lead.assignedTo = conv.assignedTo;
  const name = customerName(ws, conv.customerId);
  log(ws, {
    kind: "handoff",
    stage: 6,
    title: `Conversation with ${name} handed to ${memberName(ws, conv.assignedTo)}`,
    detail: `${reason} · chatbot paused for this conversation`,
    conversationId: conv.id,
  });
  systemMessage(ws, conv.id, `${reason}. Assigned to ${memberName(ws, conv.assignedTo)} — chatbot paused for this conversation.`);
  notify(ws, "handoff", "Human handoff", `${name}: ${reason}.`, `/inbox?c=${conv.id}`);
}

/** Why a customer-facing follow-up may not be sent (null when permitted). */
export function followUpBlocker(ws: Workspace, f: FollowUp): string | null {
  if (f.kind === "internal") return "internal task";
  const customer = ws.customers.find((c) => c.id === f.customerId);
  const lead = ws.leads.find((l) => l.id === f.leadId);
  const conv = ws.conversations.find((c) => c.id === f.conversationId);
  if (!ws.settings.followUp.customerFacingEnabled) return "customer-facing follow-ups are disabled in Settings";
  if (customer?.optedOut) return "customer opted out";
  if (lead && (lead.stage === "won" || lead.stage === "lost")) return `lead is ${STAGE_LABEL[lead.stage]}`;
  if (!conv) return "no conversation linked";
  if (!f.message.trim()) return "no message written";
  return null;
}

export function newFollowUp(ws: Workspace, partial: Partial<FollowUp> = {}): FollowUp {
  return {
    id: uid("fu"),
    customerId: ws.customers[0]?.id ?? "",
    conversationId: null,
    leadId: null,
    reason: "more_info",
    kind: "internal",
    message: "",
    dueAt: Date.now() + ws.settings.followUp.defaultDelayHours * HOUR,
    assignedTo: null,
    status: "scheduled",
    notes: "",
    createdAt: Date.now(),
    closedAt: null,
    closedReason: null,
    ...partial,
  };
}

export type IncomingResult = {
  ok: boolean;
  status: "delivered" | "duplicate" | "blocked" | "queued";
  message: string;
  conversationId?: string;
};

// ---------------------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------------------

export const actions = {
  // ---- Workspace / profile -----------------------------------------------------------
  switchWorkspace(id: string) {
    const cur = ensureLoaded();
    if (cur) commitState({ ...cur, activeWorkspaceId: id });
  },
  createWorkspace(name: string) {
    const cur = ensureLoaded();
    if (!cur) return;
    const ws = blankWorkspace(uid("ws"), name);
    ws.activities.push({ id: uid("a"), at: Date.now(), kind: "setup", stage: 1, title: "Business owner started setup", detail: name });
    commitState({ ...cur, workspaces: [...cur.workspaces, ws], activeWorkspaceId: ws.id });
  },
  deleteWorkspace(id: string) {
    const cur = ensureLoaded();
    if (!cur || cur.workspaces.length < 2) return;
    const workspaces = cur.workspaces.filter((w) => w.id !== id);
    commitState({
      ...cur,
      workspaces,
      activeWorkspaceId: cur.activeWorkspaceId === id ? workspaces[0].id : cur.activeWorkspaceId,
    });
  },
  resetDemo() {
    clearState();
    typing.set([]);
    commitState(freshState());
  },
  updateProfile(p: DemoState["profile"]) {
    const cur = ensureLoaded();
    if (cur) commitState({ ...cur, profile: p });
  },

  // ---- Business setup & knowledge ----------------------------------------------------
  updateBusiness(b: BusinessProfile) {
    mutate((ws) => {
      ws.business = b;
      log(ws, { kind: "setup", stage: 1, title: "Business profile updated", detail: b.name });
    });
  },
  upsertProduct(p: Product) {
    mutate((ws) => {
      const i = ws.products.findIndex((x) => x.id === p.id);
      const item = { ...p, updatedAt: Date.now() };
      if (i >= 0) ws.products[i] = item;
      else ws.products.push(item);
      log(ws, { kind: "knowledge", stage: 1, title: `${i >= 0 ? "Updated" : "Added"} ${p.kind}: ${p.name}`, detail: "" });
    });
  },
  deleteProduct(id: string) {
    mutate((ws) => {
      const p = ws.products.find((x) => x.id === id);
      ws.products = ws.products.filter((x) => x.id !== id);
      if (p) log(ws, { kind: "knowledge", stage: 1, title: `Deleted ${p.kind}: ${p.name}`, detail: "" });
    });
  },
  upsertKnowledge(k: KnowledgeItem) {
    mutate((ws) => {
      const i = ws.knowledge.findIndex((x) => x.id === k.id);
      const item = { ...k, updatedAt: Date.now() };
      if (i >= 0) ws.knowledge[i] = item;
      else ws.knowledge.push(item);
      log(ws, { kind: "knowledge", stage: 1, title: `${i >= 0 ? "Updated" : "Added"} knowledge: ${k.title}`, detail: "" });
    });
  },
  deleteKnowledge(id: string) {
    mutate((ws) => {
      const k = ws.knowledge.find((x) => x.id === id);
      ws.knowledge = ws.knowledge.filter((x) => x.id !== id);
      if (k) log(ws, { kind: "knowledge", stage: 1, title: `Deleted knowledge: ${k.title}`, detail: "" });
    });
  },
  addDocument(file: { name: string; size: number; mime: string }) {
    const id = uid("doc");
    const wsId = activeWs()?.id;
    mutate((ws) => {
      ws.documents.unshift({ id, ...file, uploadedAt: Date.now(), status: "uploading", extractedText: "", approval: "approved" });
      log(ws, { kind: "knowledge", stage: 1, title: `Document uploaded: ${file.name}`, detail: "Simulated upload — no real text extraction" });
    });
    const step = (status: DemoDocument["status"], delay: number) =>
      setTimeout(() => {
        if (activeWs()?.id !== wsId) return;
        mutate((ws) => {
          const d = ws.documents.find((x) => x.id === id);
          if (d && d.status !== "processed") d.status = status;
        });
      }, delay);
    step("processing", 900);
    step("processed", 2600);
    return id;
  },
  updateDocument(id: string, patch: Partial<DemoDocument>) {
    mutate((ws) => {
      const d = ws.documents.find((x) => x.id === id);
      if (d) Object.assign(d, patch);
    });
  },
  deleteDocument(id: string) {
    mutate((ws) => {
      const d = ws.documents.find((x) => x.id === id);
      ws.documents = ws.documents.filter((x) => x.id !== id);
      if (d) log(ws, { kind: "knowledge", stage: 1, title: `Document removed: ${d.name}`, detail: "" });
    });
  },
  connectInstagram(handle: string) {
    mutate((ws) => {
      ws.instagram = {
        status: "connected",
        handle: handle.startsWith("@") ? handle : `@${handle}`,
        connectedAt: Date.now(),
        permissions: { messages: true, profile: true, insights: true },
      };
      log(ws, { kind: "setup", stage: 1, title: "Instagram account connected (simulated)", detail: ws.instagram.handle });
    });
  },
  disconnectInstagram() {
    mutate((ws) => {
      ws.instagram = {
        ...ws.instagram,
        status: "disconnected",
        connectedAt: null,
        permissions: { messages: false, profile: false, insights: false },
      };
      ws.settings.chatbotEnabled = false;
      log(ws, { kind: "setup", stage: 1, title: "Instagram disconnected (simulated)", detail: "Chatbot deactivated" });
    });
  },
  /** Returns false when setup is incomplete (activation blocked). */
  setChatbotEnabled(enabled: boolean) {
    const ws = activeWs();
    if (!ws) return false;
    if (enabled && !isSetupComplete(ws)) return false;
    mutate((w) => {
      w.settings.chatbotEnabled = enabled;
      log(w, {
        kind: "setup",
        stage: 1,
        title: enabled ? "Chatbot activated" : "Chatbot deactivated",
        detail: enabled ? "Setup complete — chatbot is ready" : "Simulated replies are off",
      });
    });
    return true;
  },
  /** Returns false if the chatbot could not be enabled because setup is incomplete. */
  updateSettings(s: Settings) {
    const ws0 = activeWs();
    const blocked = Boolean(ws0 && s.chatbotEnabled && !ws0.settings.chatbotEnabled && !isSetupComplete(ws0));
    mutate((ws) => {
      ws.settings = { ...s, chatbotEnabled: blocked ? false : s.chatbotEnabled };
      log(ws, { kind: "system", stage: null, title: "Settings saved", detail: "" });
    });
    return !blocked;
  },

  // ---- Inbox -------------------------------------------------------------------------
  /** Workflow stage 2: a simulated Instagram message arrives. */
  simulateIncoming(input: {
    customerId?: string;
    newCustomer?: { name: string; username: string };
    text: string;
    externalId?: string;
  }): IncomingResult {
    const ws0 = activeWs();
    if (!ws0) return { ok: false, status: "blocked", message: "Demo data is still loading." };
    if (ws0.instagram.status !== "connected")
      return { ok: false, status: "blocked", message: "Connect the demo Instagram account in Business Setup before simulating messages." };
    const text = input.text.trim();
    if (!text) return { ok: false, status: "blocked", message: "Enter a message to send." };

    let result: IncomingResult = { ok: false, status: "blocked", message: "Select a customer." };
    let willReply = false;
    let convId = "";
    let msgId = "";
    mutate((ws) => {
      let customer = input.customerId ? ws.customers.find((c) => c.id === input.customerId) : undefined;
      if (!customer && input.newCustomer) {
        customer = {
          id: uid("cust"),
          name: input.newCustomer.name.trim(),
          username: input.newCustomer.username.replace(/^@/, "").trim(),
          color: AVATAR_COLORS[ws.customers.length % AVATAR_COLORS.length],
          optedOut: false,
          isSample: true,
        };
        ws.customers.push(customer);
      }
      if (!customer) return;
      let conv = ws.conversations.find((c) => c.customerId === customer.id);
      if (!conv) {
        conv = {
          id: uid("conv"),
          customerId: customer.id,
          status: "open",
          botPaused: false,
          handledBy: "bot",
          assignedTo: null,
          unread: 0,
          lastMessageAt: Date.now(),
          unknownCount: 0,
          notes: [],
        };
        ws.conversations.push(conv);
      }
      convId = conv.id;

      // "Is this a new message?" — same delivery id, or identical text within 2 minutes.
      const lastIn = ws.messages.findLast((m) => m.conversationId === convId && m.sender === "customer");
      const dup =
        (input.externalId && ws.messages.some((m) => m.externalId === input.externalId)) ||
        (lastIn && lastIn.text.trim().toLowerCase() === text.toLowerCase() && Date.now() - lastIn.at < 2 * MIN);
      if (dup) {
        log(ws, { kind: "duplicate", stage: 2, title: "Duplicate delivery skipped", detail: `Message from ${customer.name} was already handled`, conversationId: convId });
        result = { ok: true, status: "duplicate", message: "Duplicate message detected — skipped because it was already handled.", conversationId: convId };
        return;
      }

      msgId = uid("m");
      ws.messages.push({ id: msgId, conversationId: convId, sender: "customer", text, at: Date.now(), status: "received", externalId: input.externalId ?? `ig_mid_${msgId}` });
      conv.lastMessageAt = Date.now();
      if (conv.status === "closed") conv.status = "open";
      if (activeConversationId !== convId) conv.unread += 1;
      log(ws, { kind: "message_in", stage: 2, title: `New message from ${customer.name}`, detail: text, conversationId: convId });

      if (!ws.settings.chatbotEnabled) {
        log(ws, { kind: "system", stage: 4, title: "Chatbot inactive — left for the team", detail: "Activate the chatbot to send simulated replies", conversationId: convId });
        result = { ok: true, status: "queued", message: "Message received. The chatbot is inactive, so it was left for the team.", conversationId: convId };
      } else if (conv.botPaused) {
        log(ws, { kind: "system", stage: 4, title: "Chatbot paused — no automatic reply", detail: `Waiting for ${memberName(ws, conv.assignedTo)}`, conversationId: convId });
        notify(ws, "handoff", "New message in team conversation", `${customer.name}: ${text.slice(0, 80)}`, `/inbox?c=${convId}`);
        result = { ok: true, status: "queued", message: "Message received. The chatbot is paused for this conversation, so no automatic reply was sent.", conversationId: convId };
      } else {
        willReply = true;
        result = { ok: true, status: "delivered", message: "Message received — the simulated chatbot is replying.", conversationId: convId };
      }
    });

    if (willReply) {
      const delay = 900 + Math.min(text.length * 12, 1200);
      typing.set([...typing.get(), convId]);
      setTimeout(() => {
        typing.set(typing.get().filter((id) => id !== convId));
        actions.generateReply(convId, msgId, delay);
      }, delay);
    }
    return result;
  },

  /** Workflow stages 3–6 for one incoming message. */
  generateReply(conversationId: string, messageId: string, responseMs: number) {
    mutate((ws) => {
      const conv = ws.conversations.find((c) => c.id === conversationId);
      const incoming = ws.messages.find((m) => m.id === messageId);
      if (!conv || !incoming) return;
      // A person may have taken over while the reply was being prepared.
      if (conv.botPaused || !ws.settings.chatbotEnabled) return;
      const customer = ws.customers.find((c) => c.id === conv.customerId)!;
      let lead = ws.leads.find((l) => l.conversationId === conv.id) ?? null;
      const history = ws.messages.filter((m) => m.conversationId === conv.id && m.id !== messageId);

      const r = respond({
        text: incoming.text,
        business: ws.business,
        products: ws.products,
        knowledge: ws.knowledge,
        documents: ws.documents,
        settings: ws.settings,
        lead,
        history,
      });

      // ---- Stage 5: lead capture & qualification
      const ex = r.extracted;
      const hasLeadSignal =
        Boolean(ex.interest || ex.budget || ex.timeline || ex.contact || ex.location) ||
        r.purchaseIntent ||
        ["pricing", "availability", "discount", "purchase"].includes(r.intent);
      const prevCategory = lead?.category;
      if (!lead && hasLeadSignal && !r.optOut) {
        lead = {
          id: uid("lead"),
          customerId: customer.id,
          conversationId: conv.id,
          interest: null,
          productId: null,
          budget: null,
          location: null,
          timeline: null,
          contact: null,
          purchaseIntent: false,
          reviewFlag: null,
          score: 0,
          category: "cold",
          categoryReason: "",
          categoryOverridden: false,
          stage: "new",
          assignedTo: conv.assignedTo,
          nextAction: "",
          createdAt: Date.now(),
          lastInteractionAt: Date.now(),
        };
        ws.leads.push(lead);
        log(ws, { kind: "lead", stage: 5, title: `New lead: ${customer.name}`, detail: ex.interest ? `Interested in ${ex.interest}` : "Captured from conversation", conversationId: conv.id, leadId: lead.id });
        notify(ws, "newLead", "New lead captured", `${customer.name}${ex.interest ? ` — ${ex.interest}` : ""}`, `/leads?lead=${lead.id}`);
      }

      if (r.optOut) {
        customer.optedOut = true;
        const n = stopFollowUps(ws, (f) => f.customerId === customer.id && f.kind === "customer", "Customer opted out — follow-up messages stopped");
        log(ws, { kind: "followup", stage: 7, title: `${customer.name} opted out`, detail: `${n} pending customer follow-up(s) stopped`, conversationId: conv.id });
      }
      if (r.unknown) conv.unknownCount += 1;

      const captured: string[] = [];
      if (lead) {
        // Never overwrite known values with empty information.
        if (ex.interest && ex.interest !== lead.interest) {
          lead.interest = ex.interest;
          captured.push(`interest: ${ex.interest}`);
        }
        if (ex.productId) lead.productId = ex.productId;
        if (ex.budget && ex.budget !== lead.budget) {
          lead.budget = ex.budget;
          captured.push(`budget: ₹${ex.budget.toLocaleString("en-IN")}`);
        }
        if (ex.timeline && ex.timeline !== lead.timeline) {
          lead.timeline = ex.timeline;
          captured.push(`timeline: ${ex.timeline}`);
        }
        if (ex.location && ex.location !== lead.location) {
          lead.location = ex.location;
          captured.push(`location: ${ex.location}`);
        }
        if (ex.contact && ex.contact !== lead.contact) {
          lead.contact = ex.contact;
          captured.push("contact details");
        }
        if (r.purchaseIntent) lead.purchaseIntent = true;
        if (r.unknown && conv.unknownCount >= 2) lead.reviewFlag = `${conv.unknownCount} questions the chatbot could not answer`;
        lead.lastInteractionAt = Date.now();
        reclassify(ws, lead);
        if (captured.length)
          log(ws, {
            kind: "lead",
            stage: 5,
            title: `Lead updated: ${customer.name}`,
            detail: `Captured ${captured.join(", ")} · ${CATEGORY_LABEL[lead.category]} (${lead.score})`,
            conversationId: conv.id,
            leadId: lead.id,
          });
        if (lead.stage === "new" && lead.interest && lead.budget && lead.timeline) {
          lead.stage = "qualified";
          lead.nextAction = nextActionFor(lead);
          log(ws, { kind: "pipeline", stage: 5, title: `${customer.name} moved to Qualified`, detail: "Interest, budget and timeline captured", leadId: lead.id, conversationId: conv.id });
        }
      }

      // ---- Stage 4: send the reply (optionally simulate a delivery failure)
      const failed = ws.settings.simulateSendFailure;
      const botMsg: Message = {
        id: uid("m"),
        conversationId: conv.id,
        sender: "bot",
        text: r.reply,
        at: Date.now(),
        status: failed ? "failed" : "delivered",
        source: r.source,
        responseMs,
      };
      ws.messages.push(botMsg);
      conv.lastMessageAt = Date.now();
      if (failed) {
        log(ws, { kind: "reply_failed", stage: 4, title: `Reply to ${customer.name} failed after a safe retry`, detail: "Simulated delivery failure (Settings › Demo controls)", conversationId: conv.id });
        notify(ws, "failedReply", "Reply failed to send", `Simulated reply to ${customer.name} could not be delivered.`, `/inbox?c=${conv.id}`);
        if (ws.settings.handoff.onSendFailure) handoff(ws, conv, "Reply could not be delivered");
      } else {
        log(ws, {
          kind: "bot_reply",
          stage: 4,
          title: `Simulated reply sent to ${customer.name}`,
          detail: `Intent: ${r.intent} · Source: ${SOURCE_LABEL[r.source.type]} — ${r.source.label}`,
          conversationId: conv.id,
        });
      }

      // ---- Stage 6: does the lead need human attention?
      if (r.needsHuman && ws.settings.handoff.onHumanRequest) handoff(ws, conv, r.handoffReason ?? "Customer asked for a person");
      else if (r.unknown && ws.settings.handoff.unknownThreshold > 0 && conv.unknownCount >= ws.settings.handoff.unknownThreshold)
        handoff(ws, conv, `${conv.unknownCount} questions the chatbot could not answer`);

      if (lead && lead.category === "hot" && prevCategory !== "hot") {
        if (ws.settings.handoff.onHotLead && !lead.assignedTo) {
          lead.assignedTo = pickSalesperson(ws);
          conv.assignedTo ??= lead.assignedTo;
          log(ws, { kind: "handoff", stage: 6, title: `Hot lead assigned to ${memberName(ws, lead.assignedTo)}`, detail: `${customer.name} · chatbot continues assisting`, conversationId: conv.id, leadId: lead.id });
        }
        notify(ws, "hotLead", "Hot lead", `${customer.name} is now a hot lead (score ${lead.score}).`, `/leads?lead=${lead.id}`);
      }

      const outcome = [
        r.source.type === "fallback" ? "Required information not available — asked to clarify / offered the team" : "Answered from approved business information",
        r.optOut && "Customer opted out — follow-up messages stopped",
        lead && `Lead ${CATEGORY_LABEL[lead.category]} (score ${lead.score}) · stage ${STAGE_LABEL[lead.stage]}`,
        conv.botPaused && `Handed to ${memberName(ws, conv.assignedTo)} — chatbot paused`,
        failed && "Delivery failed after retry — team alerted",
      ].filter(Boolean);
      botMsg.logic = {
        intent: r.intent,
        matched: r.matches.map((m) => `${m.type}: ${m.label}`),
        captured,
        outcome: outcome.join(" · "),
      };
    });
  },

  retryMessage(messageId: string) {
    mutate((ws) => {
      const m = ws.messages.find((x) => x.id === messageId);
      if (!m || m.status !== "failed") return;
      m.status = "delivered";
      log(ws, { kind: "bot_reply", stage: 4, title: "Failed reply re-sent manually", detail: m.text.slice(0, 80), conversationId: m.conversationId });
    });
  },
  sendAgentMessage(conversationId: string, text: string, agentId: string) {
    mutate((ws) => {
      const conv = ws.conversations.find((c) => c.id === conversationId);
      if (!conv) return;
      ws.messages.push({ id: uid("m"), conversationId, sender: "agent", text, at: Date.now(), status: "delivered", agentId });
      conv.lastMessageAt = Date.now();
      if (conv.status === "closed") conv.status = "open";
      const lead = ws.leads.find((l) => l.conversationId === conversationId);
      if (lead) lead.lastInteractionAt = Date.now();
      log(ws, { kind: "agent", stage: 6, title: `${memberName(ws, agentId)} replied to ${customerName(ws, conv.customerId)}`, detail: text, conversationId });
    });
  },
  markRead(conversationId: string) {
    if (!activeWs()?.conversations.find((c) => c.id === conversationId)?.unread) return;
    mutate((ws) => {
      const c = ws.conversations.find((x) => x.id === conversationId);
      if (c) c.unread = 0;
    });
  },
  assignConversation(conversationId: string, memberId: string | null) {
    mutate((ws) => {
      const conv = ws.conversations.find((c) => c.id === conversationId);
      if (!conv) return;
      conv.assignedTo = memberId;
      const lead = ws.leads.find((l) => l.conversationId === conversationId);
      if (lead) lead.assignedTo = memberId;
      log(ws, { kind: "handoff", stage: 6, title: `Conversation assigned to ${memberName(ws, memberId)}`, detail: customerName(ws, conv.customerId), conversationId });
      if (memberId) notify(ws, "handoff", "Conversation assigned", `${customerName(ws, conv.customerId)} assigned to ${memberName(ws, memberId)}.`, `/inbox?c=${conversationId}`);
    });
  },
  takeOver(conversationId: string, agentId: string) {
    mutate((ws) => {
      const conv = ws.conversations.find((c) => c.id === conversationId);
      if (!conv) return;
      conv.assignedTo = agentId;
      conv.handledBy = "human";
      conv.botPaused = true;
      if (conv.status === "closed") conv.status = "open";
      const lead = ws.leads.find((l) => l.conversationId === conversationId);
      if (lead) lead.assignedTo = agentId;
      systemMessage(ws, conversationId, `${memberName(ws, agentId)} took over this conversation. Chatbot paused.`);
      log(ws, { kind: "handoff", stage: 6, title: `${memberName(ws, agentId)} took over the conversation`, detail: `${customerName(ws, conv.customerId)} · chatbot paused`, conversationId });
    });
  },
  setBotPaused(conversationId: string, paused: boolean) {
    mutate((ws) => {
      const conv = ws.conversations.find((c) => c.id === conversationId);
      if (!conv) return;
      conv.botPaused = paused;
      if (!paused) {
        conv.handledBy = "bot";
        conv.unknownCount = 0;
      }
      systemMessage(ws, conversationId, paused ? "Chatbot paused for this conversation." : "Chatbot resumed — automatic replies are on.");
      log(ws, { kind: "handoff", stage: 6, title: paused ? "Chatbot paused" : "Chatbot resumed", detail: customerName(ws, conv.customerId), conversationId });
    });
  },
  setConversationStatus(conversationId: string, status: "open" | "closed") {
    mutate((ws) => {
      const conv = ws.conversations.find((c) => c.id === conversationId);
      if (!conv) return;
      conv.status = status;
      if (status === "closed") conv.unread = 0;
      systemMessage(ws, conversationId, status === "closed" ? "Conversation marked as resolved." : "Conversation reopened.");
      log(ws, { kind: "system", stage: null, title: status === "closed" ? "Conversation resolved" : "Conversation reopened", detail: customerName(ws, conv.customerId), conversationId });
    });
  },
  addNote(conversationId: string, text: string, author: string) {
    mutate((ws) => {
      const conv = ws.conversations.find((c) => c.id === conversationId);
      if (!conv) return;
      conv.notes.unshift({ id: uid("n"), text, author, at: Date.now() });
      log(ws, { kind: "agent", stage: 6, title: "Internal note added", detail: text, conversationId });
    });
  },

  // ---- Leads -------------------------------------------------------------------------
  updateLead(id: string, patch: Partial<Lead>) {
    mutate((ws) => {
      const lead = ws.leads.find((l) => l.id === id);
      if (!lead) return;
      Object.assign(lead, patch);
      if (patch.assignedTo !== undefined) {
        const conv = ws.conversations.find((c) => c.id === lead.conversationId);
        if (conv) conv.assignedTo = patch.assignedTo;
      }
      reclassify(ws, lead);
      log(ws, { kind: "lead", stage: 5, title: `Lead edited: ${customerName(ws, lead.customerId)}`, detail: `${CATEGORY_LABEL[lead.category]} (${lead.score})`, leadId: id, conversationId: lead.conversationId });
    });
  },
  setLeadCategory(id: string, category: LeadCategory | null) {
    mutate((ws) => {
      const lead = ws.leads.find((l) => l.id === id);
      if (!lead) return;
      if (category === null) {
        lead.categoryOverridden = false;
        reclassify(ws, lead);
      } else {
        lead.category = category;
        lead.categoryOverridden = true;
        lead.categoryReason = `Manually set to ${CATEGORY_LABEL[category]} by the team.`;
        lead.nextAction = nextActionFor(lead);
      }
      log(ws, { kind: "lead", stage: 5, title: `${customerName(ws, lead.customerId)} is now ${CATEGORY_LABEL[lead.category]}`, detail: lead.categoryReason, leadId: id });
    });
  },
  moveLead(id: string, stage: PipelineStage) {
    mutate((ws) => {
      const lead = ws.leads.find((l) => l.id === id);
      if (!lead || lead.stage === stage) return;
      lead.stage = stage;
      lead.lastInteractionAt = Date.now();
      lead.nextAction = nextActionFor(lead);
      const name = customerName(ws, lead.customerId);
      let detail = `Moved to ${STAGE_LABEL[stage]}`;
      const final = stage === "won" || stage === "lost";
      if (final) {
        const n = stopFollowUps(ws, (f) => f.leadId === id || f.customerId === lead.customerId, `Lead marked ${STAGE_LABEL[stage]} — sales follow-ups stopped`);
        detail = `${stage === "won" ? "Sale recorded" : "Outcome recorded"} · ${n} pending follow-up(s) stopped`;
      }
      log(ws, { kind: "pipeline", stage: final ? 7 : 6, title: `${name} moved to ${STAGE_LABEL[stage]}`, detail, leadId: id, conversationId: lead.conversationId });
    });
  },

  // ---- Follow-ups --------------------------------------------------------------------
  upsertFollowUp(f: FollowUp) {
    mutate((ws) => {
      const i = ws.followUps.findIndex((x) => x.id === f.id);
      if (i >= 0) ws.followUps[i] = f;
      else ws.followUps.unshift(f);
      log(ws, {
        kind: "followup",
        stage: 7,
        title: `Follow-up ${i >= 0 ? "updated" : "created"} for ${customerName(ws, f.customerId)}`,
        detail: f.kind === "customer" ? "Simulated customer-facing follow-up" : "Internal reminder",
        conversationId: f.conversationId ?? undefined,
        leadId: f.leadId ?? undefined,
      });
    });
  },
  setFollowUpStatus(id: string, status: FollowUp["status"], reason: string) {
    mutate((ws) => {
      const f = ws.followUps.find((x) => x.id === id);
      if (!f) return;
      f.status = status;
      f.closedAt = status === "scheduled" ? null : Date.now();
      f.closedReason = status === "scheduled" ? null : reason;
      log(ws, { kind: "followup", stage: 7, title: `Follow-up ${status} — ${customerName(ws, f.customerId)}`, detail: reason, conversationId: f.conversationId ?? undefined });
    });
  },
  rescheduleFollowUp(id: string, dueAt: number) {
    mutate((ws) => {
      const f = ws.followUps.find((x) => x.id === id);
      if (!f) return;
      f.dueAt = dueAt;
      f.status = "scheduled";
      f.closedAt = null;
      f.closedReason = null;
      log(ws, { kind: "followup", stage: 7, title: `Follow-up rescheduled — ${customerName(ws, f.customerId)}`, detail: new Date(dueAt).toLocaleString("en-IN"), conversationId: f.conversationId ?? undefined });
    });
  },
  /**
   * Workflow stage 7: "Is a follow-up appropriate & permitted?"
   * Yes → the simulated message is added to the conversation. No → internal reminder only.
   */
  runFollowUp(id: string): { sent: boolean; reason: string } {
    const ws0 = activeWs();
    const f0 = ws0?.followUps.find((x) => x.id === id);
    if (!ws0 || !f0 || f0.status !== "scheduled") return { sent: false, reason: "Follow-up is not scheduled." };
    const blocked = followUpBlocker(ws0, f0);
    mutate((ws) => {
      const f = ws.followUps.find((x) => x.id === id)!;
      f.status = "completed";
      f.closedAt = Date.now();
      if (blocked) {
        f.closedReason = f.kind === "internal" ? "Completed" : `Internal reminder only — no message sent (${blocked})`;
      } else {
        f.closedReason = "Simulated follow-up message sent";
        const conv = ws.conversations.find((c) => c.id === f.conversationId)!;
        ws.messages.push({
          id: uid("m"),
          conversationId: conv.id,
          sender: "bot",
          text: f.message,
          at: Date.now(),
          status: "delivered",
          source: { type: "follow-up", label: "Scheduled follow-up" },
        });
        conv.lastMessageAt = Date.now();
      }
      log(ws, {
        kind: "followup",
        stage: 7,
        title: blocked ? `Follow-up completed — ${customerName(ws, f.customerId)}` : `Simulated follow-up sent to ${customerName(ws, f.customerId)}`,
        detail: f.closedReason,
        conversationId: f.conversationId ?? undefined,
      });
    });
    return blocked ? { sent: false, reason: blocked } : { sent: true, reason: "" };
  },

  /** Local stand-in for a scheduler: raise one notification when a follow-up becomes due. */
  scanDueFollowUps() {
    const ws0 = activeWs();
    const now = Date.now();
    if (!ws0?.followUps.some((f) => f.status === "scheduled" && f.dueAt <= now && !f.dueNotified)) return;
    mutate((ws) => {
      for (const f of ws.followUps) {
        if (f.status !== "scheduled" || f.dueAt > now || f.dueNotified) continue;
        f.dueNotified = true;
        notify(ws, "followUpDue", "Follow-up due", `${f.kind === "internal" ? "Reminder" : "Customer follow-up"} for ${customerName(ws, f.customerId)} is due.`, "/follow-ups");
      }
    });
  },

  // ---- Notifications -----------------------------------------------------------------
  markNotificationRead(id: string) {
    mutate((ws) => {
      const n = ws.notifications.find((x) => x.id === id);
      if (n) n.read = true;
    });
  },
  markAllNotificationsRead() {
    mutate((ws) => ws.notifications.forEach((n) => (n.read = true)));
  },
};
