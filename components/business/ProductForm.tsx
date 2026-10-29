"use client";

import { useState } from "react";
import { actions } from "@/lib/store";
import type { Availability, Product } from "@/lib/types";
import { AVAILABILITY_LABEL, uid } from "@/lib/utils";
import { Modal } from "../ui/Modal";
import { Button, Field, Input, Select, Textarea } from "../ui/primitives";
import { toast } from "../ui/toast";

export function emptyProduct(): Product {
  return {
    id: uid("p"),
    kind: "service",
    name: "",
    description: "",
    priceFrom: null,
    priceTo: null,
    priceUnit: "",
    availability: "available",
    keywords: [],
    qualifyingQuestion: "",
    status: "approved",
    updatedAt: Date.now(),
  };
}

export function ProductForm({ product, onClose }: { product: Product | null; onClose: () => void }) {
  return product ? <ProductFormInner key={product.id} product={product} onClose={onClose} /> : null;
}

function ProductFormInner({ product, onClose }: { product: Product; onClose: () => void }) {
  const [p, setP] = useState(product);
  const [from, setFrom] = useState(product.priceFrom?.toString() ?? "");
  const [to, setTo] = useState(product.priceTo?.toString() ?? "");
  const [keywords, setKeywords] = useState(product.keywords.join(", "));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isNew = !product.name;

  const save = () => {
    const e: Record<string, string> = {};
    if (p.name.trim().length < 2) e.name = "Enter a name (at least 2 characters).";
    if (!p.description.trim()) e.description = "Add a short description the chatbot can use.";
    const f = from.trim() ? Number(from.replace(/[,₹\s]/g, "")) : null;
    const t = to.trim() ? Number(to.replace(/[,₹\s]/g, "")) : null;
    if (f !== null && (!Number.isFinite(f) || f <= 0)) e.from = "Enter a valid positive amount.";
    if (t !== null && (!Number.isFinite(t) || t <= 0)) e.to = "Enter a valid positive amount.";
    if (t !== null && f === null) e.from = "Enter a starting price for the range.";
    if (f !== null && t !== null && t < f) e.to = "Maximum must be greater than the starting price.";
    setErrors(e);
    if (Object.keys(e).length) return;
    actions.upsertProduct({
      ...p,
      name: p.name.trim(),
      description: p.description.trim(),
      priceFrom: f,
      priceTo: t,
      keywords: keywords
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean)
        .concat(isNew ? [p.name.trim().toLowerCase()] : []),
    });
    toast(`${p.name.trim()} ${isNew ? "added" : "updated"}`);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? "Add product or service" : `Edit ${product.name}`}
      description="The chatbot quotes only the prices and availability you enter here."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>{isNew ? "Add item" : "Save changes"}</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="pf-n" required error={errors.name} className="sm:col-span-2">
          <Input id="pf-n" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} aria-invalid={Boolean(errors.name)} placeholder="e.g. Business Website" />
        </Field>
        <Field label="Type" htmlFor="pf-k">
          <Select id="pf-k" value={p.kind} onChange={(e) => setP({ ...p, kind: e.target.value as Product["kind"] })}>
            <option value="service">Service</option>
            <option value="product">Product</option>
          </Select>
        </Field>
        <Field label="Availability" htmlFor="pf-a">
          <Select id="pf-a" value={p.availability} onChange={(e) => setP({ ...p, availability: e.target.value as Availability })}>
            {Object.entries(AVAILABILITY_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description" htmlFor="pf-d" required error={errors.description} className="sm:col-span-2">
          <Textarea id="pf-d" value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} aria-invalid={Boolean(errors.description)} />
        </Field>
        <Field label="Starting price (₹)" htmlFor="pf-f" error={errors.from} hint="Leave empty for “price on request”.">
          <Input id="pf-f" inputMode="numeric" value={from} onChange={(e) => setFrom(e.target.value)} aria-invalid={Boolean(errors.from)} placeholder="15000" />
        </Field>
        <Field label="Maximum price (₹, optional)" htmlFor="pf-t" error={errors.to} hint="Set to show a price range.">
          <Input id="pf-t" inputMode="numeric" value={to} onChange={(e) => setTo(e.target.value)} aria-invalid={Boolean(errors.to)} />
        </Field>
        <Field label="Price unit (optional)" htmlFor="pf-u" hint="e.g. per month, per view">
          <Input id="pf-u" value={p.priceUnit} onChange={(e) => setP({ ...p, priceUnit: e.target.value })} />
        </Field>
        <Field label="Status" htmlFor="pf-s">
          <Select id="pf-s" value={p.status} onChange={(e) => setP({ ...p, status: e.target.value as Product["status"] })}>
            <option value="approved">Approved — chatbot can use it</option>
            <option value="inactive">Inactive — hidden from chatbot</option>
          </Select>
        </Field>
        <Field label="Matching keywords" htmlFor="pf-kw" hint="Comma separated words customers might use." className="sm:col-span-2">
          <Input id="pf-kw" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="website, landing page, web development" />
        </Field>
        <Field label="Qualifying question (optional)" htmlFor="pf-q" hint="Asked once after the customer shows interest." className="sm:col-span-2">
          <Input id="pf-q" value={p.qualifyingQuestion} onChange={(e) => setP({ ...p, qualifyingQuestion: e.target.value })} placeholder="Could you tell me what type of website you need?" />
        </Field>
      </div>
    </Modal>
  );
}
