"use client";

import { Package, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { actions } from "@/lib/store";
import type { Product, Workspace } from "@/lib/types";
import { AVAILABILITY_LABEL, priceLabel } from "@/lib/utils";
import { emptyProduct, ProductForm } from "../business/ProductForm";
import { ConfirmDialog } from "../ui/Modal";
import { Badge, Button, EmptyState, IconButton } from "../ui/primitives";
import { toast } from "../ui/toast";

export function CatalogueStep({ ws }: { ws: Workspace }) {
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-600">{ws.products.length} item(s). Inactive items are never mentioned by the chatbot.</p>
        <Button icon={Plus} onClick={() => setEditing(emptyProduct())}>
          Add product or service
        </Button>
      </div>
      {ws.products.length === 0 ? (
        <EmptyState icon={Package} title="No products or services yet" description="Add at least one approved item so the chatbot can answer price and availability questions." className="rounded-xl border border-dashed border-slate-300" />
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {ws.products.map((p) => (
            <li key={p.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                  <Badge tone={p.kind === "service" ? "blue" : "violet"}>{p.kind === "service" ? "Service" : "Product"}</Badge>
                  <Badge tone={p.status === "approved" ? "green" : "slate"}>{p.status === "approved" ? "Approved" : "Inactive"}</Badge>
                </div>
                <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{p.description}</p>
              </div>
              <div className="flex items-center gap-3 sm:text-right">
                <div>
                  <p className="text-sm font-semibold text-navy-900">{priceLabel(p)}</p>
                  <p className="text-[11px] text-slate-500">{AVAILABILITY_LABEL[p.availability]}</p>
                </div>
                <IconButton icon={Pencil} label={`Edit ${p.name}`} onClick={() => setEditing(p)} />
                <IconButton icon={Trash2} label={`Delete ${p.name}`} onClick={() => setDeleting(p)} className="hover:bg-red-50 hover:text-red-600" />
              </div>
            </li>
          ))}
        </ul>
      )}
      <ProductForm product={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) actions.deleteProduct(deleting.id);
          toast(`${deleting?.name} deleted`);
        }}
        title="Delete item?"
        message={`“${deleting?.name}” will be removed and the chatbot will no longer mention it.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
