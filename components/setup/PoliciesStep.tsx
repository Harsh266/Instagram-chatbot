"use client";

import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { actions } from "@/lib/store";
import type { KnowledgeItem, KnowledgeType, Workspace } from "@/lib/types";
import { KNOWLEDGE_LABEL } from "@/lib/utils";
import { emptyKnowledge, KnowledgeForm } from "../business/KnowledgeForm";
import { ConfirmDialog } from "../ui/Modal";
import { Badge, Button, EmptyState, IconButton } from "../ui/primitives";
import { toast } from "../ui/toast";

const ORDER: KnowledgeType[] = ["faq", "offer", "refund", "cancellation", "delivery", "rule"];

export function PoliciesStep({ ws }: { ws: Workspace }) {
  const [editing, setEditing] = useState<KnowledgeItem | null>(null);
  const [deleting, setDeleting] = useState<KnowledgeItem | null>(null);

  return (
    <div className="space-y-5">
      {ORDER.map((type) => {
        const items = ws.knowledge.filter((k) => k.type === type);
        return (
          <section key={type} aria-labelledby={`sec-${type}`}>
            <div className="mb-2 flex items-center justify-between">
              <h3 id={`sec-${type}`} className="text-sm font-semibold text-navy-900">
                {KNOWLEDGE_LABEL[type]}
                {type === "faq" ? "s" : ""} <span className="font-normal text-slate-400">({items.length})</span>
              </h3>
              <Button size="sm" variant="outline" icon={Plus} onClick={() => setEditing(emptyKnowledge(type))}>
                Add
              </Button>
            </div>
            {items.length === 0 ? (
              <EmptyState icon={FileText} title={`No ${KNOWLEDGE_LABEL[type].toLowerCase()} yet`} description="Without it, the chatbot will offer to connect the customer with your team instead of guessing." className="rounded-xl border border-dashed border-slate-300 py-6" />
            ) : (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {items.map((k) => (
                  <li key={k.id} className="flex items-start gap-3 p-3.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-slate-800">{k.title}</p>
                        {k.status === "inactive" && <Badge>Inactive</Badge>}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{k.content}</p>
                    </div>
                    <IconButton icon={Pencil} label={`Edit ${k.title}`} onClick={() => setEditing(k)} />
                    <IconButton icon={Trash2} label={`Delete ${k.title}`} onClick={() => setDeleting(k)} className="hover:bg-red-50 hover:text-red-600" />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
      <KnowledgeForm item={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) actions.deleteKnowledge(deleting.id);
          toast("Entry deleted");
        }}
        title="Delete entry?"
        message={`“${deleting?.title}” will be removed from the approved knowledge.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
