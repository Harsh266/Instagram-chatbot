import { ArrowUpRight, BookOpenCheck, CalendarClock, Handshake, MessageCircle, MessagesSquare, Target, Wrench, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { STAGES_INFO } from "../shell/WorkflowGuide";
import { Eyebrow } from "../ui/primitives";

const ICONS: LucideIcon[] = [Wrench, MessageCircle, BookOpenCheck, MessagesSquare, Target, Handshake, CalendarClock];

/** The 7 workflow stages as a numbered list on a dark section. */
export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-32 rounded-3xl bg-navy-800 px-5 py-10 text-white sm:px-10 sm:py-12">
      <Eyebrow dark>How it works</Eyebrow>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">From Instagram message to closed sale</h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
        Seven simple stages. The chatbot only answers from information the business approves, and hands over to people whenever they&apos;re needed.
      </p>
      <ol className="mt-8 divide-y divide-white/10 border-y border-white/10">
        {STAGES_INFO.map((s, i) => {
          const Icon = ICONS[i];
          return (
            <li key={s.n}>
              <Link href={s.href} className="group grid grid-cols-[2.5rem_2.5rem_1fr] items-center gap-x-4 gap-y-1 py-4 sm:grid-cols-[2.5rem_2.5rem_14rem_1fr_auto]">
                <span className="font-mono text-xs text-slate-400">{String(s.n).padStart(2, "0")}</span>
                <span className="flex size-9 items-center justify-center rounded-full border border-white/15 text-brand-400 transition-colors group-hover:border-brand-500">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="font-heading text-base font-semibold">{s.title}</span>
                <span className="col-span-3 text-sm leading-relaxed text-slate-300 sm:col-span-1">{s.text}</span>
                <ArrowUpRight className="hidden size-4 text-slate-500 transition-colors group-hover:text-brand-400 sm:block" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
