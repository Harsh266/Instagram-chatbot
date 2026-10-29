"use client";

import { Bot, FlaskConical } from "lucide-react";
import { useState } from "react";
import { previewMatch, type EngineResult } from "@/lib/engine";
import type { Workspace } from "@/lib/types";
import { SOURCE_LABEL } from "@/lib/utils";
import { Badge, Button, Card, CardHeader, Input } from "../ui/primitives";

const EXAMPLES = ["What is your website development price?", "Do you offer any discount?", "How long does delivery take?", "Do you sign an NDA?", "Can you do GST filing?"];

export function AnswerPreview({ ws }: { ws: Workspace }) {
  const [q, setQ] = useState("");
  const [result, setResult] = useState<EngineResult | null>(null);

  const run = (text: string) => {
    if (!text.trim()) return;
    setQ(text);
    setResult(previewMatch({ text, business: ws.business, products: ws.products, knowledge: ws.knowledge, documents: ws.documents, settings: ws.settings }));
  };

  return (
    <Card>
      <CardHeader title="Test a customer question" description="Preview how a question matches approved knowledge. Nothing is sent or saved." icon={FlaskConical} />
      <div className="space-y-3 p-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(q);
          }}
          className="flex gap-2"
        >
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a customer question…" aria-label="Customer question" />
          <Button type="submit" disabled={!q.trim()}>
            Preview
          </Button>
        </form>
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((e) => (
            <button key={e} type="button" onClick={() => run(e)} className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] text-slate-600 hover:border-brand-300 hover:text-brand-700">
              {e}
            </button>
          ))}
        </div>
        {result && (
          <div className="animate-fade-in space-y-3 rounded-xl bg-slate-50 p-4">
            <div className="flex flex-wrap gap-2">
              <Badge tone="navy">Intent: {result.intent}</Badge>
              <Badge tone={result.source.type === "fallback" ? "amber" : "green"}>
                {SOURCE_LABEL[result.source.type]}: {result.source.label}
              </Badge>
              {result.needsHuman && <Badge tone="violet">Would hand off to team</Badge>}
            </div>
            <div className="flex gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-navy-900 text-brand-400">
                <Bot className="size-3.5" aria-hidden />
              </span>
              <p className="rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">{result.reply}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Matched knowledge</p>
              {result.matches.length ? (
                <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
                  {result.matches.map((m) => (
                    <li key={m.type + m.label}>
                      {m.type}: <span className="font-medium">{m.label}</span> <span className="text-slate-400">(score {m.score.toFixed(1)})</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-xs text-slate-500">No approved entry matched — the safe fallback would be used.</p>
              )}
            </div>
            <p className="text-[11px] text-slate-400">Simulated chatbot response using local keyword rules — not a real AI model.</p>
          </div>
        )}
      </div>
    </Card>
  );
}
