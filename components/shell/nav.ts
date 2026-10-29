import {
  BarChart3,
  BookOpen,
  CalendarClock,
  KanbanSquare,
  LayoutDashboard,
  MessageCircle,
  Settings,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const NAV: NavItem[] = [
  { href: "/", label: "Overview", icon: LayoutDashboard, description: "Chatbot status, key metrics and recent activity" },
  { href: "/setup", label: "Business Setup", icon: Wrench, description: "Configure the business, catalogue, policies and connection" },
  { href: "/knowledge", label: "Knowledge Base", icon: BookOpen, description: "Approved information the chatbot is allowed to use" },
  { href: "/inbox", label: "Instagram Inbox", icon: MessageCircle, description: "Simulated conversations, replies and handoffs" },
  { href: "/leads", label: "Leads & Pipeline", icon: KanbanSquare, description: "Qualified leads and the sales pipeline" },
  { href: "/follow-ups", label: "Follow-Up Center", icon: CalendarClock, description: "Reminders and simulated customer follow-ups" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, description: "Metrics calculated from the demo dataset" },
  { href: "/settings", label: "Settings", icon: Settings, description: "Chatbot behaviour, handoff rules and demo controls" },
];

export function navFor(pathname: string) {
  return NAV.find((n) => (n.href === "/" ? pathname === "/" : pathname.startsWith(n.href))) ?? NAV[0];
}
