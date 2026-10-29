"use client";

import { CheckCircle2, Link2Off, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { InstagramGlyph } from "@/components/ui/icons";
import { useState } from "react";
import { actions } from "@/lib/store";
import type { Workspace } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { ConfirmDialog } from "../ui/Modal";
import { Badge, Button, Card, DemoNotice, Field, Input } from "../ui/primitives";
import { toast } from "../ui/toast";

export function InstagramCard({ ws }: { ws: Workspace }) {
  const ig = ws.instagram;
  const connected = ig.status === "connected";
  const suggested = "@" + (ws.business.name || "demo.business").toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
  const [handle, setHandle] = useState(ig.handle || suggested);
  const [busy, setBusy] = useState<null | "connect" | "reconnect">(null);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = (mode: "connect" | "reconnect") => {
    const h = handle.trim().replace(/^@?/, "@");
    if (!/^@[a-z0-9._]{3,30}$/i.test(h)) return setError("Use 3–30 letters, numbers, dots or underscores.");
    setError(null);
    setBusy(mode);
    setTimeout(() => {
      actions.connectInstagram(h);
      setBusy(null);
      toast(mode === "connect" ? `Simulated connection to ${h} successful` : "Simulated reconnection successful");
    }, 1500);
  };

  const perms: [keyof typeof ig.permissions, string][] = [
    ["messages", "Read and reply to direct messages"],
    ["profile", "Access basic profile information"],
    ["insights", "Read conversation insights"],
  ];

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-4 bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] px-5 py-4 text-white">
        <span className="flex size-11 items-center justify-center rounded-xl bg-white/20">
          <InstagramGlyph className="size-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Instagram Business Account</p>
          <p className="text-xs text-white/80">{connected ? ig.handle : "Not connected"}</p>
        </div>
        <Badge tone={connected ? "green" : "slate"} dot>
          {connected ? "Connected (simulated)" : "Disconnected"}
        </Badge>
      </div>
      <div className="space-y-4 p-5">
        <DemoNotice>This is a simulation. No real Instagram or Meta account is connected, and no data leaves your browser.</DemoNotice>
        {connected ? (
          <>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-slate-500">Account handle</dt>
                <dd className="font-medium text-slate-800">{ig.handle}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Connected</dt>
                <dd className="font-medium text-slate-800">{ig.connectedAt ? formatDateTime(ig.connectedAt) : "—"}</dd>
              </div>
            </dl>
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <ShieldCheck className="size-3.5" aria-hidden /> Simulated permissions
              </p>
              <ul className="space-y-1.5">
                {perms.map(([k, l]) => (
                  <li key={k} className="flex items-center gap-2 text-xs text-slate-600">
                    {ig.permissions[k] ? <CheckCircle2 className="size-4 text-emerald-600" aria-label="Granted" /> : <XCircle className="size-4 text-slate-300" aria-label="Not granted" />}
                    {l}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" icon={RefreshCw} loading={busy === "reconnect"} onClick={() => connect("reconnect")}>
                Reconnect
              </Button>
              <Button variant="ghost" icon={Link2Off} className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setConfirm(true)}>
                Disconnect
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field label="Example account handle" htmlFor="ig-handle" error={error} className="flex-1">
              <Input id="ig-handle" value={handle} onChange={(e) => setHandle(e.target.value)} aria-invalid={Boolean(error)} />
            </Field>
            <Button icon={InstagramGlyph} loading={busy === "connect"} onClick={() => connect("connect")} className="bg-gradient-to-r from-[#dd2a7b] to-[#8134af] hover:opacity-90">
              {busy ? "Connecting…" : "Connect Instagram"}
            </Button>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          actions.disconnectInstagram();
          toast("Instagram disconnected (simulated). The chatbot was deactivated.", "info");
        }}
        title="Disconnect Instagram?"
        message="The simulated chatbot will be deactivated and new customer messages can't be simulated until you reconnect. Existing conversations are kept."
        confirmLabel="Disconnect"
      />
    </Card>
  );
}
