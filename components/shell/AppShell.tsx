"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useSession } from "@/lib/session";
import { actions, takeLoadNotice, useWorkspace } from "@/lib/store";
import { LoadingScreen } from "../ui/primitives";
import { toast, Toaster } from "../ui/toast";
import { Topbar } from "./Topbar";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();
  const isLogin = pathname === "/login";

  useEffect(() => {
    if (session === false && !isLogin) router.replace("/login");
    if (session === true && isLogin) router.replace("/");
  }, [session, isLogin, router]);

  if (isLogin)
    return (
      <>
        {children}
        <Toaster />
      </>
    );
  if (!session)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingScreen />
      </div>
    );
  return <Shell>{children}</Shell>;
}

function Shell({ children }: { children: ReactNode }) {
  const ws = useWorkspace();

  useEffect(() => {
    if (!ws) return;
    const n = takeLoadNotice();
    if (n) toast(n, "error");
  }, [ws]);

  useEffect(() => {
    actions.scanDueFollowUps();
    const t = setInterval(() => actions.scanDueFollowUps(), 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <Topbar ws={ws} />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-8 sm:px-6 lg:px-8">{ws ? children : <LoadingScreen />}</main>
      <footer className="bg-navy-900 text-slate-300">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-2 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p className="flex items-center gap-2 font-heading text-sm font-semibold text-white">
            <span className="size-1.5 rounded-full bg-brand-500" aria-hidden /> Instagram AI Chatbot Demo
          </p>
          <p className="text-xs text-slate-400">Sample data simulated locally in your browser · No real Instagram messages are sent or received</p>
        </div>
      </footer>
      <Toaster />
    </div>
  );
}
