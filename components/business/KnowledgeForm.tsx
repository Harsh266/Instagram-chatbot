"use client";

import { useState } from "react";
import { actions } from "@/lib/store";
import type { KnowledgeItem, KnowledgeType } from "@/lib/types";
import { KNOWLEDGE_LABEL, uid } from "@/lib/utils";
import { Modal } from "../ui/Modal";
import { Button, Field, Input, Select, Textarea } from "../ui/primitives";
import { toast } from "../ui/toast";

export function emptyKnowledge(type: KnowledgeType = "faq"): KnowledgeItem {
  return { id: uid("k"), type, title: "", content: "", keywords: [], status: "approved", updatedAt: Date.now() };
}

export function KnowledgeForm({ item, onClose }: { item: KnowledgeItem | null; onClose: () => void }) {
  return item ? <Inner key={item.id} item={item} onClose={onClose} /> : null;
}

function Inner({ item, onClose }: { item: KnowledgeItem; onClose: () => void }) {
  const [k, setK] = useState(item);
  const [keywords, setKeywords] = useState(item.keywords.join(", "));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isNew = !item.title;
  const isFaq = k.type === "faq";

  const save = () => {
    const e: Record<string, string> = {};
    if (k.title.trim().length < 3) e.title = isFaq ? "Enter the customer question." : "Enter a title.";
    if (k.content.trim().length < 5) e.content = "Enter the approved answer the chatbot may use.";
    setErrors(e);
    if (Object.keys(e).length) return;
    actions.upsertKnowledge({
      ...k,
      title: k.title.trim(),
      content: k.content.trim(),
      keywords: keywords
        .split(",")
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean),
    });
    toast(`${KNOWLEDGE_LABEL[k.type]} ${isNew ? "added" : "updated"}`);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? "Add knowledge" : "Edit knowledge"}
      description="Only approved entries are used in simulated replies."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>{isNew ? "Add entry" : "Save changes"}</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Type" htmlFor="kf-t">
          <Select id="kf-t" value={k.type} onChange={(e) => setK({ ...k, type: e.target.value as KnowledgeType })}>
            {Object.entries(KNOWLEDGE_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status" htmlFor="kf-s">
          <Select id="kf-s" value={k.status} onChange={(e) => setK({ ...k, status: e.target.value as KnowledgeItem["status"] })}>
            <option value="approved">Approved</option>
            <option value="inactive">Inactive</option>
          </Select>
        </Field>
        <Field label={isFaq ? "Customer question" : "Title"} htmlFor="kf-q" required error={errors.title} className="sm:col-span-2">
          <Input id="kf-q" value={k.title} onChange={(e) => setK({ ...k, title: e.target.value })} aria-invalid={Boolean(errors.title)} placeholder={isFaq ? "Do you offer EMI?" : "Delivery information"} />
        </Field>
        <Field label="Approved answer" htmlFor="kf-a" required error={errors.content} className="sm:col-span-2">
          <Textarea id="kf-a" value={k.content} onChange={(e) => setK({ ...k, content: e.target.value })} aria-invalid={Boolean(errors.content)} className="min-h-[110px]" />
        </Field>
        <Field label="Matching keywords" htmlFor="kf-k" hint="Comma separated. Phrases customers are likely to use." className="sm:col-span-2">
          <Input id="kf-k" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="emi, installments, pay later" />
        </Field>
      </div>
    </Modal>
  );
}
