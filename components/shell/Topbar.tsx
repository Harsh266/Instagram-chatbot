"use client";

import { Bell, Bot, Building2, Check, ChevronDown, CircleHelp, LogOut, MessageCircle, Plus, RotateCcw, Settings, Trash2, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { logout } from "@/lib/session";
import { actions, useDemoState } from "@/lib/store";
import type { Workspace } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";
import { ConfirmDialog, Modal } from "../ui/Modal";
import { Popover } from "../ui/Popover";
import { Avatar, Button, Field, Input } from "../ui/primitives";
import { toast } from "../ui/toast";
import { GlobalSearch } from "./GlobalSearch";
import { NavBar } from "./NavBar";
import { WorkflowGuide } from "./WorkflowGuide";

export function Topbar({ ws }: { ws: Workspace | null }) {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Instagram AI Chatbot Demo — Overview">
          <span className="flex size-9 items-center justify-center rounded-xl bg-navy-900 text-brand-500">
            <Bot className="size-5" aria-hidden />
          </span>
          <span className="hidden leading-tight sm:block">
            <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Instagram</span>
            <span className="block font-heading text-sm font-bold tracking-wide text-navy-900">
              AI CHATBOT <span className="text-brand-600">DEMO</span>
            </span>
          </span>
        </Link>
        <div className="flex min-w-0 flex-1 justify-center px-2">
          <GlobalSearch ws={ws} />
        </div>
        <span
          className="hidden items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.15em] text-brand-700 xl:inline-flex"
          title="All data is simulated locally in your browser"
        >
          <span className="size-1.5 rounded-full bg-brand-500" aria-hidden /> Demo mode
        </span>
        <BusinessSelector />
        <Notifications ws={ws} />
        <ProfileMenu />
        {!pathname.startsWith("/inbox") && (
          <Link href="/inbox" className="hidden h-10 shrink-0 items-center gap-2 rounded-full bg-navy-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-navy-700 md:inline-flex">
            <MessageCircle className="size-4 text-brand-500" aria-hidden /> Try the chatbot
          </Link>
        )}
      </div>
      <NavBar ws={ws} />
    </header>
  );
}

function BusinessSelector() {
  const state = useDemoState();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const router = useRouter();
  if (!state) return null;
  const active = state.workspaces.find((w) => w.id === state.activeWorkspaceId);

  return (
    <>
      <Popover
        className="w-72 p-1.5"
        trigger={({ toggle, open }) => (
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-haspopup="menu"
            className="hidden h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50 md:flex"
          >
            <Building2 className="size-4 text-slate-400" aria-hidden />
            <span className="max-w-[150px] truncate font-medium">{active?.business.name || "Untitled business"}</span>
            <ChevronDown className="size-4 text-slate-400" aria-hidden />
          </button>
        )}
      >
        {(close) => (
          <div role="menu">
            <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Demo businesses</p>
            {state.workspaces.map((w) => (
              <div key={w.id} className="group flex items-center rounded-lg hover:bg-slate-50">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    actions.switchWorkspace(w.id);
                    toast(`Switched to ${w.business.name || "Untitled business"}`, "info");
                    close();
                  }}
                  className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-sm"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-slate-800">{w.business.name || "Untitled business"}</span>
                    <span className="block text-[11px] text-slate-500">{w.isSample ? "Sample data" : "Blank demo business"}</span>
                  </span>
                  {w.id === state.activeWorkspaceId && <Check className="size-4 text-brand-700" aria-label="Active" />}
                </button>
                {!w.isSample && (
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteId(w.id);
                      close();
                    }}
                    className="mr-1 rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    aria-label={`Delete ${w.business.name}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            ))}
            <div className="my-1 border-t border-slate-100" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setCreateOpen(true);
                setName("");
                setError(null);
                close();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-brand-700 hover:bg-brand-50"
            >
              <Plus className="size-4" aria-hidden /> Create blank demo business
            </button>
          </div>
        )}
      </Popover>
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create a blank demo business"
        description="Start from an empty setup to walk the client through onboarding. The sample business stays available."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (name.trim().length < 2) return setError("Enter a business name (at least 2 characters).");
                actions.createWorkspace(name.trim());
                setCreateOpen(false);
                toast(`${name.trim()} created — complete the setup wizard to activate the chatbot.`);
                router.push("/setup");
              }}
            >
              Create business
            </Button>
          </>
        }
      >
        <Field label="Business name" htmlFor="ws-name" error={error} required>
          <Input id="ws-name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={Boolean(error)} placeholder="e.g. Sunrise Interiors" />
        </Field>
      </Modal>
      <ConfirmDialog
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) actions.deleteWorkspace(deleteId);
          toast("Demo business deleted");
        }}
        title="Delete demo business?"
        message="This removes the business and all of its local demo data. The sample business cannot be deleted."
        confirmLabel="Delete"
      />
    </>
  );
}

function Notifications({ ws }: { ws: Workspace | null }) {
  const router = useRouter();
  const list = ws?.notifications ?? [];
  const unread = list.filter((n) => !n.read).length;
  return (
    <Popover
      className="w-[340px] max-w-[calc(100vw-2rem)]"
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
          className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
        >
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{unread}</span>
          )}
        </button>
      )}
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-navy-900">Notifications</p>
            <button type="button" disabled={!unread} onClick={() => actions.markAllNotificationsRead()} className="text-xs font-medium text-brand-700 hover:underline disabled:text-slate-300 disabled:no-underline">
              Mark all read
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {list.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-slate-500">You&apos;re all caught up.</p>
            ) : (
              list.slice(0, 15).map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    actions.markNotificationRead(n.id);
                    router.push(n.href);
                    close();
                  }}
                  className={cn("flex w-full gap-3 border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50", !n.read && "bg-brand-50/40")}
                >
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-brand-500")} aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-800">{n.title}</span>
                    <span className="block text-xs text-slate-500">{n.body}</span>
                    <span className="mt-0.5 block text-[11px] text-slate-400">{timeAgo(n.at)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </Popover>
  );
}

function ProfileMenu() {
  const state = useDemoState();
  const [editOpen, setEditOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [form, setForm] = useState({ name: "", role: "", email: "" });
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  if (!state) return null;
  const p = state.profile;
  return (
    <>
      <Popover
        className="w-64 p-1.5"
        trigger={({ toggle, open }) => (
          <button type="button" onClick={toggle} aria-expanded={open} aria-label="Profile menu" className="flex items-center gap-2 rounded-lg p-1 hover:bg-slate-100">
            <Avatar name={p.name} color="#2c2c2c" />
          </button>
        )}
      >
        {(close) => (
          <div role="menu">
            <div className="border-b border-slate-100 px-3 pb-3 pt-2">
              <p className="text-sm font-semibold text-navy-900">{p.name}</p>
              <p className="text-xs text-slate-500">
                {p.role} · {p.email}
              </p>
            </div>
            {[
              { icon: UserRound, label: "Edit profile", run: () => { setForm(p); setError(null); setEditOpen(true); } },
              { icon: CircleHelp, label: "How this demo works", run: () => setGuideOpen(true) },
              { icon: Settings, label: "Settings", run: () => router.push("/settings") },
              { icon: RotateCcw, label: "Reset demo data", run: () => router.push("/settings#reset") },
            ].map((it) => (
              <button
                key={it.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  it.run();
                  close();
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <it.icon className="size-4 text-slate-400" aria-hidden /> {it.label}
              </button>
            ))}
            <div className="mt-1 border-t border-slate-100 pt-1">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  close();
                  logout();
                  router.replace("/login");
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut className="size-4" aria-hidden /> Sign out
              </button>
            </div>
          </div>
        )}
      </Popover>
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit profile"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!form.name.trim()) return setError("Name is required.");
                if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError("Enter a valid email address.");
                actions.updateProfile({ name: form.name.trim(), role: form.role.trim(), email: form.email.trim() });
                setEditOpen(false);
                toast("Profile updated");
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Name" htmlFor="pf-name" required>
            <Input id="pf-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Role" htmlFor="pf-role">
            <Input id="pf-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
          </Field>
          <Field label="Email" htmlFor="pf-email" required error={error}>
            <Input id="pf-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
        </div>
      </Modal>
      <WorkflowGuide open={guideOpen} onClose={() => setGuideOpen(false)} />
    </>
  );
}
