export type ID = string;

export interface BusinessProfile {
  name: string;
  description: string;
  industry: string;
  location: string;
  email: string;
  phone: string;
  website: string;
  workingHours: string;
}

export type Availability = "available" | "limited" | "out_of_stock" | "on_request";
export type ItemStatus = "approved" | "inactive";

export interface Product {
  id: ID;
  kind: "service" | "product";
  name: string;
  description: string;
  priceFrom: number | null;
  priceTo: number | null;
  priceUnit: string; // e.g. "", "per month", "per view"
  availability: Availability;
  keywords: string[];
  qualifyingQuestion: string;
  status: ItemStatus;
  updatedAt: number;
}

export type KnowledgeType = "faq" | "offer" | "refund" | "cancellation" | "delivery" | "rule";

export interface KnowledgeItem {
  id: ID;
  type: KnowledgeType;
  title: string; // question or policy name
  content: string; // approved answer
  keywords: string[];
  status: ItemStatus;
  updatedAt: number;
}

export type DocStatus = "uploading" | "processing" | "processed" | "failed";

export interface DemoDocument {
  id: ID;
  name: string;
  size: number;
  mime: string;
  uploadedAt: number;
  status: DocStatus;
  extractedText: string;
  approval: ItemStatus;
}

export interface InstagramConnection {
  status: "connected" | "disconnected";
  handle: string;
  connectedAt: number | null;
  permissions: { messages: boolean; profile: boolean; insights: boolean };
}

export type LeadField = "interest" | "budget" | "location" | "timeline" | "contact";

export interface QualificationQuestion {
  field: LeadField;
  question: string;
  enabled: boolean;
}

export type Tone = "friendly" | "professional" | "concise";

export interface Settings {
  chatbotEnabled: boolean;
  welcomeMessage: string;
  tone: Tone;
  qualificationQuestions: QualificationQuestion[];
  handoff: {
    onHumanRequest: boolean;
    onHotLead: boolean;
    unknownThreshold: number; // 0 = disabled
    onSendFailure: boolean;
  };
  followUp: {
    customerFacingEnabled: boolean;
    defaultDelayHours: number;
    maxPerLead: number;
  };
  notifications: {
    newLead: boolean;
    hotLead: boolean;
    handoff: boolean;
    followUpDue: boolean;
    failedReply: boolean;
  };
  simulateSendFailure: boolean;
}

export interface TeamMember {
  id: ID;
  name: string;
  role: string;
}

export interface Customer {
  id: ID;
  name: string;
  username: string;
  color: string;
  optedOut: boolean;
  isSample: boolean;
}

export interface InternalNote {
  id: ID;
  text: string;
  author: string;
  at: number;
}

export interface Conversation {
  id: ID;
  customerId: ID;
  status: "open" | "closed";
  botPaused: boolean;
  handledBy: "bot" | "human";
  assignedTo: ID | null;
  unread: number;
  lastMessageAt: number;
  unknownCount: number;
  notes: InternalNote[];
}

export type MessageSender = "customer" | "bot" | "agent" | "system";
export type MessageStatus = "received" | "sent" | "delivered" | "seen" | "failed";

export type SourceType =
  | "product"
  | "pricing"
  | "faq"
  | "offer"
  | "policy"
  | "document"
  | "qualification"
  | "handoff"
  | "greeting"
  | "fallback"
  | "follow-up";

export interface ResponseSource {
  type: SourceType;
  label: string;
  refId?: ID;
}

export interface Message {
  id: ID;
  conversationId: ID;
  sender: MessageSender;
  text: string;
  at: number;
  status: MessageStatus;
  externalId?: string;
  source?: ResponseSource;
  agentId?: ID;
  responseMs?: number;
  /** How the simulated chatbot decided on this reply (shown under "Why this reply?"). */
  logic?: ReplyLogic;
}

export interface ReplyLogic {
  intent: string;
  matched: string[];
  captured: string[];
  outcome: string;
}

export type LeadCategory = "hot" | "warm" | "cold" | "unqualified" | "review";
export type PipelineStage = "new" | "qualified" | "contacted" | "proposal" | "won" | "lost";

export interface Lead {
  id: ID;
  customerId: ID;
  conversationId: ID;
  interest: string | null;
  productId: ID | null;
  budget: number | null;
  location: string | null;
  timeline: string | null;
  contact: string | null;
  purchaseIntent: boolean;
  reviewFlag: string | null;
  score: number;
  category: LeadCategory;
  categoryReason: string;
  categoryOverridden: boolean;
  stage: PipelineStage;
  assignedTo: ID | null;
  nextAction: string;
  createdAt: number;
  lastInteractionAt: number;
}

export type FollowUpReason = "more_info" | "quotation" | "no_response" | "call" | "other";
export type FollowUpStatus = "scheduled" | "completed" | "cancelled" | "stopped";

export interface FollowUp {
  id: ID;
  customerId: ID;
  conversationId: ID | null;
  leadId: ID | null;
  reason: FollowUpReason;
  kind: "internal" | "customer";
  message: string;
  dueAt: number;
  assignedTo: ID | null;
  status: FollowUpStatus;
  notes: string;
  createdAt: number;
  closedAt: number | null;
  closedReason: string | null;
  dueNotified?: boolean;
}

export type ActivityKind =
  | "message_in"
  | "bot_reply"
  | "reply_failed"
  | "duplicate"
  | "handoff"
  | "agent"
  | "lead"
  | "pipeline"
  | "followup"
  | "setup"
  | "knowledge"
  | "system";

export interface Activity {
  id: ID;
  at: number;
  kind: ActivityKind;
  stage: 1 | 2 | 3 | 4 | 5 | 6 | 7 | null;
  title: string;
  detail: string;
  conversationId?: ID;
  leadId?: ID;
}

export interface AppNotification {
  id: ID;
  at: number;
  title: string;
  body: string;
  href: string;
  read: boolean;
}

export interface Workspace {
  id: ID;
  isSample: boolean;
  createdAt: number;
  business: BusinessProfile;
  products: Product[];
  knowledge: KnowledgeItem[];
  documents: DemoDocument[];
  instagram: InstagramConnection;
  settings: Settings;
  team: TeamMember[];
  customers: Customer[];
  conversations: Conversation[];
  messages: Message[];
  leads: Lead[];
  followUps: FollowUp[];
  activities: Activity[];
  notifications: AppNotification[];
}

export interface DemoState {
  version: number;
  activeWorkspaceId: ID;
  profile: { name: string; role: string; email: string };
  workspaces: Workspace[];
}
