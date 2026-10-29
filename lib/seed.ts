import type {
  Activity,
  AppNotification,
  Conversation,
  Customer,
  FollowUp,
  KnowledgeItem,
  Lead,
  Message,
  MessageSender,
  PipelineStage,
  Product,
  ResponseSource,
  Settings,
  TeamMember,
  Workspace,
} from "./types";
import { classifyLead, nextActionFor } from "./leads";
import { AVATAR_COLORS, DAY, HOUR, MIN, SOURCE_LABEL } from "./utils";

export const STATE_VERSION = 2;

export const DEFAULT_SETTINGS: Settings = {
  chatbotEnabled: true,
  welcomeMessage: "Hi! Thanks for messaging us. I'm the virtual assistant — how can I help you today?",
  tone: "friendly",
  qualificationQuestions: [
    { field: "interest", question: "Which service are you interested in?", enabled: true },
    { field: "budget", question: "Do you have a budget range in mind for this?", enabled: true },
    { field: "timeline", question: "When would you like to get started?", enabled: true },
    { field: "location", question: "Which city are you based in?", enabled: true },
    { field: "contact", question: "Could you share a phone number or email so our team can reach you?", enabled: true },
  ],
  handoff: { onHumanRequest: true, onHotLead: true, unknownThreshold: 2, onSendFailure: true },
  followUp: { customerFacingEnabled: true, defaultDelayHours: 24, maxPerLead: 3 },
  notifications: { newLead: true, hotLead: true, handoff: true, followUpDue: true, failedReply: true },
  simulateSendFailure: false,
};

const TEAM: TeamMember[] = [
  { id: "tm_priya", name: "Priya Sharma", role: "Sales Lead" },
  { id: "tm_rahul", name: "Rahul Mehta", role: "Sales Executive" },
  { id: "tm_ananya", name: "Ananya Iyer", role: "Customer Success" },
  { id: "tm_vikram", name: "Vikram Nair", role: "Sales Executive" },
];

export function blankWorkspace(id: string, name: string, now = Date.now()): Workspace {
  return {
    id,
    isSample: false,
    createdAt: now,
    business: { name, description: "", industry: "", location: "", email: "", phone: "", website: "", workingHours: "" },
    products: [],
    knowledge: [],
    documents: [],
    instagram: {
      status: "disconnected",
      handle: "",
      connectedAt: null,
      permissions: { messages: false, profile: false, insights: false },
    },
    settings: { ...DEFAULT_SETTINGS, chatbotEnabled: false },
    team: TEAM,
    customers: [],
    conversations: [],
    messages: [],
    leads: [],
    followUps: [],
    activities: [],
    notifications: [],
  };
}

type Line = [MessageSender, string, number, { src?: ResponseSource; failed?: boolean; agent?: string }?];

export function createSampleWorkspace(now = Date.now()): Workspace {
  const ws = blankWorkspace("ws_sample", "Brightline Digital Studio", now);
  ws.isSample = true;
  ws.business = {
    name: "Brightline Digital Studio",
    description:
      "Sample digital services studio offering websites, Instagram automation, social media management, branding and 3D architectural visualisation for small and growing businesses.",
    industry: "Digital & Design Services",
    location: "Pune, Maharashtra",
    email: "hello@brightline-studio.example",
    phone: "+91 98765 43210",
    website: "https://brightline-studio.example",
    workingHours: "Mon–Sat, 10:00 AM – 7:00 PM IST",
  };
  ws.instagram = {
    status: "connected",
    handle: "@brightline.studio",
    connectedAt: now - 20 * DAY,
    permissions: { messages: true, profile: true, insights: true },
  };
  ws.settings = { ...DEFAULT_SETTINGS };

  const t = now - 10 * DAY;
  const P = (p: Omit<Product, "status" | "updatedAt"> & { status?: Product["status"] }): Product => ({
    status: "approved",
    updatedAt: t,
    ...p,
  });
  ws.products = [
    P({ id: "p_web", kind: "service", name: "Business Website", description: "A responsive 5–8 page business website with contact forms, WhatsApp integration and basic SEO setup.", priceFrom: 15000, priceTo: null, priceUnit: "", availability: "available", keywords: ["website", "web site", "business website", "website development", "landing page", "webpage", "site"], qualifyingQuestion: "Could you tell me what type of website you need?" }),
    P({ id: "p_ecom", kind: "service", name: "E-commerce Website", description: "Online store with product catalogue, cart, payment gateway and order management.", priceFrom: 45000, priceTo: 120000, priceUnit: "", availability: "limited", keywords: ["ecommerce", "e-commerce", "online store", "online shop", "shop", "sell online", "shopify"], qualifyingQuestion: "Roughly how many products do you plan to sell online?" }),
    P({ id: "p_bot", kind: "service", name: "Instagram Chatbot Setup", description: "Automated Instagram DM replies trained on your approved business information, with lead capture and team handoff.", priceFrom: 25000, priceTo: null, priceUnit: "", availability: "available", keywords: ["chatbot", "bot", "instagram automation", "dm automation", "auto reply", "automation"], qualifyingQuestion: "Roughly how many Instagram messages do you receive per day?" }),
    P({ id: "p_smm", kind: "service", name: "Social Media Management", description: "Content calendar, 12 posts and 4 reels per month, captions and monthly performance report.", priceFrom: 12000, priceTo: null, priceUnit: "per month", availability: "available", keywords: ["social media", "instagram management", "posts", "reels", "content", "smm", "manage my instagram"], qualifyingQuestion: "Which platforms would you like us to manage?" }),
    P({ id: "p_logo", kind: "service", name: "Logo & Brand Identity", description: "Logo design with 3 concepts, colour palette, typography and a brand guideline sheet.", priceFrom: 7500, priceTo: null, priceUnit: "", availability: "available", keywords: ["logo", "branding", "brand identity", "brand", "visiting card"], qualifyingQuestion: "Do you already have brand colours or a logo concept in mind?" }),
    P({ id: "p_3d", kind: "service", name: "3D Architectural Visualisation", description: "Photorealistic interior and exterior renders for architects, builders and interior designers.", priceFrom: 8000, priceTo: null, priceUnit: "per view", availability: "available", keywords: ["3d", "render", "rendering", "visualisation", "visualization", "walkthrough", "architectural", "interior view", "exterior view"], qualifyingQuestion: "Is this for an interior or exterior view?" }),
    P({ id: "p_app", kind: "service", name: "Mobile App Development", description: "Custom Android and iOS app development, scoped individually for each project.", priceFrom: null, priceTo: null, priceUnit: "", availability: "on_request", keywords: ["app", "mobile app", "android", "ios", "application"], qualifyingQuestion: "Is the app for Android, iOS, or both?" }),
    P({ id: "p_seo", kind: "service", name: "SEO Starter Package", description: "On-page SEO, Google Business Profile optimisation and monthly keyword report.", priceFrom: 9999, priceTo: null, priceUnit: "per month", availability: "available", keywords: ["seo", "google ranking", "search ranking", "google business"], qualifyingQuestion: "Do you already have a website we'd be optimising?" }),
    P({ id: "p_print", kind: "product", name: "Printed Brochure Pack", description: "Design and print of 500 tri-fold brochures.", priceFrom: 6500, priceTo: null, priceUnit: "", availability: "out_of_stock", keywords: ["brochure", "print", "flyer"], qualifyingQuestion: "", status: "inactive" }),
  ];

  const K = (k: Omit<KnowledgeItem, "status" | "updatedAt"> & { status?: KnowledgeItem["status"] }): KnowledgeItem => ({
    status: "approved",
    updatedAt: t,
    ...k,
  });
  ws.knowledge = [
    K({ id: "k_remote", type: "faq", title: "Do you work with clients outside Pune?", content: "Yes — we work with clients across India and overseas. Projects are managed remotely with video calls and shared progress updates.", keywords: ["outside", "other city", "remote", "overseas", "abroad", "different city"] }),
    K({ id: "k_pay", type: "faq", title: "What is the payment structure?", content: "We usually take a 50% advance to start and the remaining 50% before final handover. Monthly services are billed at the start of each month.", keywords: ["payment", "advance", "pay", "installment", "emi", "upi"] }),
    K({ id: "k_host", type: "faq", title: "Do you provide hosting and a domain?", content: "Yes. We can register your domain and set up hosting. These are billed at actual cost and are not included in website package prices.", keywords: ["hosting", "domain", "server"] }),
    K({ id: "k_cms", type: "faq", title: "Can I update the website myself?", content: "Yes. Every website comes with an easy admin panel and a 30-minute training session for your team.", keywords: ["update", "edit myself", "admin panel", "cms", "manage myself"] }),
    K({ id: "k_amc", type: "faq", title: "Do you offer maintenance after launch?", content: "Every website includes 1 month of free support after launch. After that, maintenance plans start at ₹1,500 per month.", keywords: ["maintenance", "support", "after launch", "amc"] }),
    K({ id: "k_rev", type: "faq", title: "How many revisions are included?", content: "Design packages include up to 2 rounds of revisions. Additional revisions are quoted separately.", keywords: ["revision", "revisions", "changes", "modify"] }),
    K({ id: "k_nda", type: "faq", title: "Do you sign an NDA?", content: "Yes, we're happy to sign an NDA before discussing confidential project details.", keywords: ["nda", "confidential", "non disclosure"] }),
    K({ id: "k_port", type: "faq", title: "Can I see samples of your work?", content: "Yes! Our team can share a portfolio of relevant past projects for the service you're interested in.", keywords: ["portfolio", "samples", "previous work", "examples", "past projects"] }),
    K({ id: "k_need", type: "faq", title: "What do you need from me to begin?", content: "We'll need your business details, a few reference designs you like, your logo and the content (text and images). Our team guides you through the rest.", keywords: ["what do you need", "requirements", "documents needed", "to begin"] }),
    K({ id: "k_offer", type: "offer", title: "Festive offer — 10% off website packages", content: "We currently have a festive offer: 10% off Business and E-commerce Website packages confirmed before 30 November. Our team will apply it to your quotation.", keywords: ["website", "festive", "diwali", "ecommerce"] }),
    K({ id: "k_bundle", type: "offer", title: "Website + Social Media bundle (expired)", content: "Get 1 month of Social Media Management free with any website package.", keywords: ["bundle", "free month"], status: "inactive" }),
    K({ id: "k_deliv", type: "delivery", title: "Project delivery timelines", content: "A Business Website is typically delivered in 7–10 working days, an E-commerce Website in 3–5 weeks, and logo designs in 5 working days. Timelines start once we receive your content and the advance payment.", keywords: ["delivery", "how long", "timeline", "turnaround", "days"] }),
    K({ id: "k_refund", type: "refund", title: "Refund policy", content: "The advance is refundable within 7 days of booking if design work has not started. Once work has begun, payments are non-refundable, but unused monthly services can be paused.", keywords: ["refund", "money back"] }),
    K({ id: "k_cancel", type: "cancellation", title: "Cancellation policy", content: "Monthly services can be cancelled with 15 days' notice before the next billing date. Project cancellations after work begins are charged for the work completed.", keywords: ["cancel", "cancellation", "stop service"] }),
    K({ id: "k_rush", type: "rule", title: "Urgent / priority projects", content: "Urgent delivery in under 5 working days is possible for Business Websites with a 20% priority charge, subject to team availability.", keywords: ["urgent delivery", "rush", "express", "priority", "faster delivery"] }),
  ];

  ws.documents = [
    {
      id: "d_brochure",
      name: "Brightline_Service_Brochure.pdf",
      size: 842_000,
      mime: "application/pdf",
      uploadedAt: now - 9 * DAY,
      status: "processed",
      extractedText:
        "Brightline Digital Studio has delivered over 120 websites for retail, hospitality and real estate clients. Our design team works on Figma and shares clickable previews before development. All websites are mobile-first and tested on major browsers.",
      approval: "approved",
    },
    {
      id: "d_price",
      name: "Pricing_Sheet_2026.docx",
      size: 56_300,
      mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      uploadedAt: now - 8 * DAY,
      status: "processed",
      extractedText: "",
      approval: "approved",
    },
  ];

  // ---- Customers & conversations -------------------------------------------------
  const custs: [string, string, string][] = [
    ["c_aarav", "Aarav Kapoor", "aarav.builds"],
    ["c_sneha", "Sneha Reddy", "sneha.styles"],
    ["c_rohan", "Rohan Das", "rohan.fitness"],
    ["c_meera", "Meera Joshi", "meera.bakes"],
    ["c_kabir", "Kabir Singh", "kabir.travels"],
    ["c_ishita", "Ishita Menon", "ishita.designs"],
    ["c_dev", "Dev Malhotra", "devmalhotra"],
    ["c_fatima", "Fatima Sheikh", "fatima.homedecor"],
    ["c_arjun", "Arjun Nair", "arjun.realty"],
    ["c_pooja", "Pooja Iyer", "pooja.yoga"],
    ["c_nikhil", "Nikhil Verma", "nikhil.v"],
    ["c_zara", "Zara Khan", "zarakhan.studio"],
  ];
  ws.customers = custs.map(([id, name, username], i): Customer => ({
    id,
    name,
    username,
    color: AVATAR_COLORS[i % AVATAR_COLORS.length],
    optedOut: id === "c_zara",
    isSample: true,
  }));

  const S = (type: ResponseSource["type"], label: string, refId?: string): ResponseSource => ({ type, label, refId });
  const scripts: Record<string, { start: number; lines: Line[] }> = {
    c_aarav: {
      start: now - 2 * DAY - 3 * HOUR,
      lines: [
        ["customer", "Hi, what is your website development price?", 0],
        ["bot", "Great question! Our Business Website packages start at ₹15,000. Could you tell me what type of website you need?", 1, { src: S("pricing", "Business Website — From ₹15,000", "p_web") }],
        ["customer", "A website for my construction company, around 6 pages", 9],
        ["bot", "Thanks! A 6-page company website fits our Business Website package. Do you have a budget range in mind for this?", 1, { src: S("product", "Business Website", "p_web") }],
        ["customer", "My budget is ₹30,000 and I need it this month. I'm in Pune.", 14],
        ["bot", "Thanks for sharing that — I've noted your budget of ₹30,000, timeline (this month) and location (Pune). Could you share a phone number or email so our team can reach you?", 1, { src: S("qualification", "Lead details captured") }],
        ["customer", "Sure, 98200 11223", 6],
        ["bot", "Thank you! I've shared your details with our team and someone will be in touch with next steps.", 1, { src: S("qualification", "Lead details captured") }],
        ["agent", "Hi Aarav, this is Priya from Brightline. I'll call you this afternoon to discuss your website.", 120, { agent: "tm_priya" }],
      ],
    },
    c_sneha: {
      start: now - 4 * DAY,
      lines: [
        ["customer", "Do you make online stores? I sell handmade clothes", 0],
        ["bot", "E-commerce Website is available, but we have limited slots at the moment. Online store with product catalogue, cart, payment gateway and order management. Roughly how many products do you plan to sell online?", 1, { src: S("product", "E-commerce Website — Limited availability", "p_ecom") }],
        ["customer", "Around 80 products. Budget is 80k, planning for next month", 25],
        ["bot", "Thanks for sharing that — I've noted your budget of ₹80,000 and timeline (next month). Which city are you based in?", 1, { src: S("qualification", "Lead details captured") }],
        ["customer", "Hyderabad", 40],
        ["bot", "Thanks for sharing that — I've noted your location (Hyderabad). Could you share a phone number or email so our team can reach you?", 1, { src: S("qualification", "Lead details captured") }],
      ],
    },
    c_rohan: {
      start: now - 1 * DAY - 5 * HOUR,
      lines: [
        ["customer", "Hey! How much for managing my gym's Instagram?", 0],
        ["bot", "Great question! Our Social Media Management packages start at ₹12,000 per month. Which platforms would you like us to manage?", 1, { src: S("pricing", "Social Media Management — From ₹12,000 per month", "p_smm") }],
        ["customer", "Only Instagram. Do you offer any discount?", 30],
        ["bot", "I'd be happy to check that for you. I don't have a confirmed offer available right now. Would you like our team to assist you?", 1, { src: S("fallback", "No approved offer for Social Media Management") }],
      ],
    },
    c_meera: {
      start: now - 3 * DAY - 2 * HOUR,
      lines: [
        ["customer", "Hello, can you integrate Swiggy and Zomato orders into my bakery POS?", 0],
        ["bot", "I want to make sure you get accurate information, and I don't have confirmed details on that right now. Would you like our team to assist you?", 1, { src: S("fallback", "No matching business information") }],
        ["customer", "Also do you handle FSSAI licence paperwork?", 12],
        ["bot", "I want to make sure you get accurate information, and I don't have confirmed details on that right now. Would you like our team to assist you?", 1, { src: S("fallback", "No matching business information") }],
        ["system", "Handed to the business team after 2 unanswered questions. Chatbot paused for this conversation.", 0],
        ["agent", "Hi Meera, Rahul here. POS integrations are custom work — could you share which POS software you use?", 50, { agent: "tm_rahul" }],
        ["customer", "We use Petpooja. I'm in Bengaluru.", 90],
      ],
    },
    c_kabir: {
      start: now - 6 * DAY,
      lines: [
        ["customer", "I want to buy the Instagram chatbot setup for my travel agency", 0],
        ["bot", "Wonderful! I can help you get started with Instagram Chatbot Setup. Roughly how many Instagram messages do you receive per day?", 1, { src: S("product", "Instagram Chatbot Setup", "p_bot") }],
        ["customer", "About 200 a day. Budget up to 1 lakh, need it ASAP. Call me on 99880 77665", 18],
        ["bot", "Of course. I've asked a member of our team to join this conversation — they'll reply here shortly (working hours: Mon–Sat, 10:00 AM – 7:00 PM IST).", 1, { src: S("handoff", "Human handoff request") }],
        ["agent", "Hi Kabir, Priya here. Thanks for the details — I've shared a proposal on email. Happy to walk you through it on a call.", 60, { agent: "tm_priya" }],
        ["customer", "Got it, reviewing with my partner. Will confirm by Friday.", 300],
      ],
    },
    c_ishita: {
      start: now - 5 * DAY,
      lines: [
        ["customer", "How much is a logo?", 0],
        ["bot", "Great question! Our Logo & Brand Identity packages start at ₹7,500. Do you already have brand colours or a logo concept in mind?", 1, { src: S("pricing", "Logo & Brand Identity — From ₹7,500", "p_logo") }],
        ["customer", "My budget is only ₹2,000", 20],
        ["bot", "Thanks for sharing that — I've noted your budget of ₹2,000. Just so you know, Logo & Brand Identity starts at ₹7,500; our team can suggest options that fit. When would you like to get started?", 1, { src: S("qualification", "Lead details captured") }],
      ],
    },
    c_dev: {
      start: now - 7 * DAY,
      lines: [
        ["customer", "What does your SEO package include?", 0],
        ["bot", "Great question! Our SEO Starter Package packages start at ₹9,999 per month. Do you already have a website we'd be optimising?", 1, { src: S("pricing", "SEO Starter Package — From ₹9,999 per month", "p_seo") }],
        ["customer", "Yes. Just exploring options for now", 240],
        ["bot", "Thanks for sharing that — I've noted your timeline (exploring (no fixed timeline)). Do you have a budget range in mind for this?", 1, { src: S("qualification", "Lead details captured") }],
      ],
    },
    c_fatima: {
      start: now - 12 * DAY,
      lines: [
        ["customer", "Do you do 3D interior renders? Need 4 views for a client in Mumbai", 0],
        ["bot", "Yes, 3D Architectural Visualisation is available. Photorealistic interior and exterior renders for architects, builders and interior designers. Is this for an interior or exterior view?", 1, { src: S("product", "3D Architectural Visualisation — Available", "p_3d") }],
        ["customer", "Interior. Budget 40000, needed within 2 weeks. fatima@homedecor.example", 35],
        ["bot", "Thanks for sharing that — I've noted your budget of ₹40,000, timeline (within 2 weeks) and contact details. I've shared your details with our team and someone will be in touch with next steps.", 1, { src: S("qualification", "Lead details captured") }],
        ["agent", "Hi Fatima, Ananya here — we've received the advance. Renders will be shared by next Thursday!", 2 * 24 * 60, { agent: "tm_ananya" }],
        ["customer", "Thank you so much, the renders look great!", 8 * 24 * 60],
        ["bot", "You're welcome! Let me know if there's anything else I can help with.", 1, { src: S("greeting", "Courtesy reply") }],
      ],
    },
    c_arjun: {
      start: now - 11 * DAY,
      lines: [
        ["customer", "Price for real estate e-commerce style property listing site?", 0],
        ["bot", "Great question! Our E-commerce Website packages range from ₹45,000 to ₹1,20,000, depending on scope. Roughly how many products do you plan to sell online?", 1, { src: S("pricing", "E-commerce Website — ₹45,000 – ₹1,20,000", "p_ecom") }],
        ["customer", "About 50 listings. Budget 50k, next month. Based in Thane", 60],
        ["bot", "Thanks for sharing that — I've noted your budget of ₹50,000, timeline (next month) and location (Thane). Could you share a phone number or email so our team can reach you?", 1, { src: S("qualification", "Lead details captured") }],
        ["agent", "Hi Arjun, Vikram here. I've emailed a proposal for the listings website.", 24 * 60, { agent: "tm_vikram" }],
        ["customer", "Thanks, we've decided to go with another agency.", 4 * 24 * 60],
      ],
    },
    c_pooja: {
      start: now - 20 * HOUR,
      lines: [
        ["customer", "How long does delivery take for a website?", 0],
        ["bot", "A Business Website is typically delivered in 7–10 working days, an E-commerce Website in 3–5 weeks, and logo designs in 5 working days. Timelines start once we receive your content and the advance payment.", 1, { src: S("policy", "Project delivery timelines", "k_deliv"), failed: true }],
        ["system", "Reply could not be delivered after a safe retry. Business team alerted and chatbot paused for this conversation.", 1],
      ],
    },
    c_nikhil: {
      start: now - 9 * DAY,
      lines: [
        ["customer", "Do you provide GST filing services?", 0],
        ["bot", "I want to make sure you get accurate information, and I don't have confirmed details on that right now. Would you like our team to assist you?", 1, { src: S("fallback", "No matching business information") }],
        ["customer", "No that's fine, thanks", 30],
        ["bot", "You're welcome! Let me know if there's anything else I can help with.", 1, { src: S("greeting", "Courtesy reply") }],
      ],
    },
    c_zara: {
      start: now - 8 * DAY,
      lines: [
        ["customer", "Hi, I'm interested in branding for my studio", 0],
        ["bot", "Wonderful! I can help you get started with Logo & Brand Identity. Do you already have brand colours or a logo concept in mind?", 1, { src: S("product", "Logo & Brand Identity", "p_logo") }],
        ["customer", "Please stop messaging me, not interested anymore", 3 * 24 * 60],
        ["bot", "Understood — we won't send you any further follow-up messages. If you need anything in the future, just message us here.", 1, { src: S("policy", "Opt-out rule") }],
      ],
    },
  };

  const convMeta: Record<string, Partial<Conversation>> = {
    c_aarav: { assignedTo: "tm_priya" },
    c_sneha: { unread: 1, assignedTo: "tm_vikram" },
    c_rohan: { unread: 1 },
    c_meera: { botPaused: true, handledBy: "human", assignedTo: "tm_rahul", unread: 1, unknownCount: 2 },
    c_kabir: { botPaused: true, handledBy: "human", assignedTo: "tm_priya", unread: 1 },
    c_ishita: {},
    c_dev: {},
    c_fatima: { status: "closed", assignedTo: "tm_ananya" },
    c_arjun: { status: "closed", assignedTo: "tm_vikram", unread: 1 },
    c_pooja: { botPaused: true, handledBy: "human", assignedTo: "tm_ananya", unread: 1 },
    c_nikhil: { status: "closed", unknownCount: 1 },
    c_zara: { status: "closed" },
  };

  const messages: Message[] = [];
  const activities: Activity[] = [];
  let mi = 0;
  ws.conversations = ws.customers.map((c) => {
    const convId = `conv_${c.id.slice(2)}`;
    const sc = scripts[c.id];
    let at = sc.start;
    sc.lines.forEach(([sender, text, gap, opt], idx) => {
      const responseMs = 1100 + ((idx * 370) % 1300);
      at += sender === "bot" ? responseMs : gap * MIN;
      const id = `m_seed_${++mi}`;
      const failed = opt?.failed;
      messages.push({
        id,
        conversationId: convId,
        sender,
        text,
        at,
        status: sender === "customer" ? "received" : sender === "system" ? "sent" : failed ? "failed" : "seen",
        externalId: sender === "customer" ? `ig_mid_${id}` : undefined,
        source: opt?.src,
        agentId: opt?.agent,
        responseMs: sender === "bot" ? responseMs : undefined,
      });
      const base = { id: `a_seed_${mi}`, at, conversationId: convId };
      if (sender === "customer")
        activities.push({ ...base, kind: "message_in", stage: 2, title: `New message from ${c.name}`, detail: text });
      else if (sender === "bot" && failed)
        activities.push({ ...base, kind: "reply_failed", stage: 4, title: `Reply to ${c.name} failed after retry`, detail: "Team alerted · conversation handed to business team" });
      else if (sender === "bot")
        activities.push({ ...base, kind: "bot_reply", stage: 4, title: `Simulated reply sent to ${c.name}`, detail: `Source: ${SOURCE_LABEL[opt!.src!.type]} — ${opt!.src!.label}` });
      else if (sender === "agent")
        activities.push({ ...base, kind: "agent", stage: 6, title: `${TEAM.find((m) => m.id === opt?.agent)?.name} replied to ${c.name}`, detail: text });
      else activities.push({ ...base, kind: "handoff", stage: 6, title: `Conversation with ${c.name} handed to team`, detail: text });
    });
    const last = at;
    return {
      id: convId,
      customerId: c.id,
      status: "open",
      botPaused: false,
      handledBy: "bot",
      assignedTo: null,
      unread: 0,
      lastMessageAt: last,
      unknownCount: 0,
      notes: [],
      ...convMeta[c.id],
    } as Conversation;
  });
  ws.messages = messages;
  ws.conversations.find((c) => c.id === "conv_meera")!.notes.push({
    id: "n_seed_1",
    text: "Custom integration request — check with dev team before quoting.",
    author: "Rahul Mehta",
    at: now - 2 * DAY,
  });

  // ---- Leads ------------------------------------------------------------------------
  type LeadSeed = Partial<Lead> & { customerId: string; stage: PipelineStage };
  const leadSeeds: LeadSeed[] = [
    { customerId: "c_aarav", interest: "Business Website", productId: "p_web", budget: 30000, timeline: "This month", location: "Pune", contact: "98200 11223", purchaseIntent: true, stage: "contacted", assignedTo: "tm_priya" },
    { customerId: "c_sneha", interest: "E-commerce Website", productId: "p_ecom", budget: 80000, timeline: "Next month", location: "Hyderabad", stage: "qualified", assignedTo: "tm_vikram" },
    { customerId: "c_rohan", interest: "Social Media Management", productId: "p_smm", stage: "new" },
    { customerId: "c_meera", interest: null, location: "Bengaluru", reviewFlag: "2 questions the chatbot could not answer", stage: "new", assignedTo: "tm_rahul" },
    { customerId: "c_kabir", interest: "Instagram Chatbot Setup", productId: "p_bot", budget: 100000, timeline: "Urgent (ASAP)", contact: "99880 77665", purchaseIntent: true, stage: "proposal", assignedTo: "tm_priya" },
    { customerId: "c_ishita", interest: "Logo & Brand Identity", productId: "p_logo", budget: 2000, stage: "new" },
    { customerId: "c_dev", interest: "SEO Starter Package", productId: "p_seo", timeline: "Exploring (no fixed timeline)", stage: "new" },
    { customerId: "c_fatima", interest: "3D Architectural Visualisation", productId: "p_3d", budget: 40000, timeline: "Within 2 weeks", location: "Mumbai", contact: "fatima@homedecor.example", stage: "won", assignedTo: "tm_ananya" },
    { customerId: "c_arjun", interest: "E-commerce Website", productId: "p_ecom", budget: 50000, timeline: "Next month", location: "Thane", stage: "lost", assignedTo: "tm_vikram" },
    { customerId: "c_pooja", interest: null, reviewFlag: "Reply delivery failed — needs team follow-up", stage: "new", assignedTo: "tm_ananya" },
    { customerId: "c_zara", interest: "Logo & Brand Identity", productId: "p_logo", stage: "lost" },
  ];
  ws.leads = leadSeeds.map((s, i) => {
    const conv = ws.conversations.find((c) => c.customerId === s.customerId)!;
    const firstMsg = messages.find((m) => m.conversationId === conv.id)!;
    const lead: Lead = {
      id: `lead_${s.customerId.slice(2)}`,
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
      assignedTo: null,
      nextAction: "",
      createdAt: firstMsg.at,
      lastInteractionAt: conv.lastMessageAt,
      ...s,
    };
    const r = classifyLead(
      lead,
      ws.products.find((p) => p.id === lead.productId) ?? null,
      ws.customers.find((c) => c.id === lead.customerId) ?? null,
    );
    Object.assign(lead, { score: r.score, category: r.category, categoryReason: r.reason });
    lead.nextAction = nextActionFor(lead);
    activities.push({
      id: `a_lead_${i}`,
      at: firstMsg.at + 2000,
      kind: "lead",
      stage: 5,
      title: `Lead created for ${ws.customers.find((c) => c.id === s.customerId)!.name}`,
      detail: `Category: ${r.category} · score ${r.score}`,
      conversationId: conv.id,
      leadId: lead.id,
    });
    return lead;
  });

  // ---- Follow-ups --------------------------------------------------------------------
  const F = (f: Partial<FollowUp> & Pick<FollowUp, "id" | "customerId" | "reason" | "kind" | "dueAt">): FollowUp => ({
    conversationId: `conv_${f.customerId.slice(2)}`,
    leadId: `lead_${f.customerId.slice(2)}`,
    message: "",
    assignedTo: null,
    status: "scheduled",
    notes: "",
    createdAt: now - 2 * DAY,
    closedAt: null,
    closedReason: null,
    ...f,
  });
  ws.followUps = [
    F({ id: "f_1", customerId: "c_aarav", reason: "quotation", kind: "internal", dueAt: now + 20 * HOUR, assignedTo: "tm_priya", notes: "Prepare 6-page website quotation with festive discount." }),
    F({ id: "f_2", customerId: "c_sneha", reason: "more_info", kind: "customer", dueAt: now - 3 * HOUR, assignedTo: "tm_vikram", message: "Hi Sneha, just checking in — would you like us to share a few e-commerce store samples from our portfolio?" }),
    F({ id: "f_3", customerId: "c_kabir", reason: "call", kind: "internal", dueAt: now - 1 * DAY, assignedTo: "tm_priya", status: "completed", closedAt: now - 22 * HOUR, closedReason: "Completed", notes: "Walked through proposal; awaiting partner decision." }),
    F({ id: "f_4", customerId: "c_rohan", reason: "no_response", kind: "customer", dueAt: now + 2 * DAY, assignedTo: "tm_vikram", message: "Hi Rohan, following up on Social Media Management for your gym. Would you like a sample content plan?" }),
    F({ id: "f_5", customerId: "c_fatima", reason: "other", kind: "internal", dueAt: now - 4 * DAY, assignedTo: "tm_ananya", status: "completed", closedAt: now - 4 * DAY, closedReason: "Completed", notes: "Collect final payment and testimonial." }),
    F({ id: "f_6", customerId: "c_arjun", reason: "no_response", kind: "customer", dueAt: now + 1 * DAY, assignedTo: "tm_vikram", status: "stopped", closedAt: now - 2 * DAY, closedReason: "Lead marked Lost — sales follow-ups stopped", message: "Hi Arjun, any update on the listings website?" }),
    F({ id: "f_7", customerId: "c_zara", reason: "no_response", kind: "customer", dueAt: now - 1 * DAY, status: "stopped", closedAt: now - 5 * DAY, closedReason: "Customer opted out — follow-up messages stopped", message: "Hi Zara, still interested in branding for your studio?" }),
    F({ id: "f_8", customerId: "c_meera", reason: "call", kind: "internal", dueAt: now - 2 * HOUR, assignedTo: "tm_rahul", notes: "Call to understand Petpooja integration scope." }),
    F({ id: "f_9", customerId: "c_dev", reason: "no_response", kind: "customer", dueAt: now + 3 * DAY, status: "cancelled", closedAt: now - 1 * DAY, closedReason: "Cancelled by Priya Sharma", message: "Hi Dev, would you like a free SEO audit of your website?" }),
  ];

  activities.push(
    { id: "a_setup_1", at: now - 20 * DAY, kind: "setup", stage: 1, title: "Instagram account connected (simulated)", detail: "@brightline.studio" },
    { id: "a_setup_2", at: now - 20 * DAY + HOUR, kind: "setup", stage: 1, title: "Chatbot activated", detail: "Setup complete — chatbot is ready" },
    { id: "a_dup_1", at: now - 2 * DAY - 3 * HOUR + 30_000, kind: "duplicate", stage: 2, title: "Duplicate delivery skipped", detail: "Message from Aarav Kapoor was already handled", conversationId: "conv_aarav" },
    { id: "a_pipe_1", at: now - 1 * DAY, kind: "pipeline", stage: 7, title: "Arjun Nair moved to Lost", detail: "Sales follow-ups stopped", conversationId: "conv_arjun", leadId: "lead_arjun" },
    { id: "a_pipe_2", at: now - 4 * DAY, kind: "pipeline", stage: 7, title: "Fatima Sheikh moved to Won", detail: "Sale recorded", conversationId: "conv_fatima", leadId: "lead_fatima" },
  );
  ws.activities = activities.sort((a, b) => b.at - a.at);

  const notifications: AppNotification[] = [
    { id: "nt_1", at: now - 20 * HOUR + 2 * MIN, title: "Reply failed to send", body: "Simulated reply to Pooja Iyer failed after retry. Conversation handed to team.", href: "/inbox?c=conv_pooja", read: false },
    { id: "nt_3", at: now - 2 * DAY, title: "Hot lead assigned", body: "Aarav Kapoor (Business Website) assigned to Priya Sharma.", href: "/leads?lead=lead_aarav", read: true },
    { id: "nt_4", at: now - 3 * DAY, title: "Human handoff", body: "Meera Joshi's conversation needs the team (2 unanswered questions).", href: "/inbox?c=conv_meera", read: true },
  ];
  ws.notifications = notifications;
  return ws;
}
