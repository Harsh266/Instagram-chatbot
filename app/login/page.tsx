"use client";

import { ArrowRight, Bot, CheckCircle2, KanbanSquare, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { InstagramGlyph } from "@/components/ui/icons";
import { Button } from "@/components/ui/primitives";
import { login } from "@/lib/session";

export default function LoginPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const signIn = () => {
    setBusy(true);
    login();
    router.replace("/");
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-navy-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-brand-500/15 blur-3xl" aria-hidden />
        <div className="absolute -bottom-32 -left-16 size-96 rounded-full bg-[#dd2a7b]/10 blur-3xl" aria-hidden />
        <div className="relative flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand-500 text-navy-950">
            <Bot className="size-5" aria-hidden />
          </span>
          <span className="text-sm font-semibold">Instagram AI Chatbot Demo</span>
        </div>
        <div className="relative max-w-md">
          <h1 className="text-3xl font-semibold leading-tight">Turn Instagram conversations into qualified leads.</h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-300">
            Walk through the complete workflow — business setup, automated replies from approved information, lead qualification, sales handoff and
            follow-ups.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-slate-200">
            {(
              [
                [InstagramGlyph, "Simulated Instagram inbox with realistic conversations"],
                [MessageCircle, "Replies generated only from approved business data"],
                [KanbanSquare, "Lead scoring, pipeline and follow-up automation"],
              ] as const
            ).map(([Icon, text]) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="size-4" aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-slate-400">Sample data only · runs locally in your browser</p>
      </section>

      <section className="flex items-center justify-center bg-[#f4f6fa] px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex size-10 items-center justify-center rounded-xl bg-brand-500 text-navy-950">
              <Bot className="size-5" aria-hidden />
            </span>
            <span className="text-sm font-semibold text-navy-900">Instagram AI Chatbot Demo</span>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
              <span className="size-1.5 rounded-full bg-amber-500" aria-hidden /> Demo Mode
            </span>
            <h2 className="mt-4 text-xl font-semibold text-navy-900">Welcome</h2>
            <p className="mt-1 text-sm text-slate-500">Sign in to the demo workspace. No email or password is needed.</p>
            <Button className="mt-6 w-full" onClick={signIn} loading={busy} autoFocus>
              Login <ArrowRight className="size-4" aria-hidden />
            </Button>
            <ul className="mt-6 space-y-2 border-t border-slate-100 pt-5 text-xs text-slate-500">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden /> Signed in as Demo Admin
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden /> No real Instagram account is connected
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
