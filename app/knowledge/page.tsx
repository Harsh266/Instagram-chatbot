"use client";

import { BookOpen, CircleCheck, CircleOff, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { emptyKnowledge, KnowledgeForm } from "@/components/business/KnowledgeForm";
import { emptyProduct, ProductForm } from "@/components/business/ProductForm";
import { AnswerPreview } from "@/components/knowledge/AnswerPreview";
import { DocumentsPanel } from "@/components/knowledge/DocumentsPanel";
import { ConfirmDialog } from "@/components/ui/Modal";
import { Popover } from "@/components/ui/Popover";
import { Badge, Button, Card, EmptyState, IconButton, Input, PageHeader, Select, Tabs } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { actions, useWorkspace } from "@/lib/store";
import type { KnowledgeItem, Product } from "@/lib/types";
import { AVAILABILITY_LABEL, KNOWLEDGE_LABEL, formatDateTime, priceLabel } from "@/lib/utils";

type Tab = "all" | "services" | "pricing" | "faq" | "offers" | "policies" | "documents";

type Entry =
  | { kind: "product"; item: Product; title: string; body: string; status: Product["status"]; label: string; updatedAt: number }
  | { kind: "knowledge"; item: KnowledgeItem; title: string; body: string; status: KnowledgeItem["status"]; label: string; updatedAt: number };

export default function KnowledgePage() {
  return (
    <Suspense>
      <Knowledge />
    </Suspense>
  );
}

function Knowledge() {
  const ws = useWorkspace()!;
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState(params.get("q") ?? "");
  const [status, setStatus] = useState<"all" | "approved" | "inactive">("all");
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editKnowledge, setEditKnowledge] = useState<KnowledgeItem | null>(null);
  const [deleting, setDeleting] = useState<Entry | null>(null);

  const productEntries: Entry[] = ws.products.map((p) => ({
    kind: "product",
    item: p,
    title: p.name,
    body: p.description,
    status: p.status,
    label: p.kind === "service" ? "Service" : "Product",
    updatedAt: p.updatedAt,
  }));
  const kEntries: Entry[] = ws.knowledge.map((k) => ({ kind: "knowledge", item: k, title: k.title, body: k.content, status: k.status, label: KNOWLEDGE_LABEL[k.type], updatedAt: k.updatedAt }));
  const isPolicy = (e: Entry) => e.kind === "knowledge" && !["faq", "offer"].includes(e.item.type);
  const byTab: Record<Exclude<Tab, "documents">, Entry[]> = {
    all: [...productEntries, ...kEntries],
    services: productEntries,
    pricing: productEntries,
    faq: kEntries.filter((e) => e.kind === "knowledge" && e.item.type === "faq"),
    offers: kEntries.filter((e) => e.kind === "knowledge" && e.item.type === "offer"),
    policies: kEntries.filter(isPolicy),
  };
  const s = q.trim().toLowerCase();
  const list =
    tab === "documents"
      ? []
      : byTab[tab].filter((e) => (status === "all" || e.status === status) && (!s || e.title.toLowerCase().includes(s) || e.body.toLowerCase().includes(s)));

  const toggleStatus = (e: Entry) => {
    const next = e.status === "approved" ? "inactive" : "approved";
    if (e.kind === "product") actions.upsertProduct({ ...e.item, status: next });
    else actions.upsertKnowledge({ ...e.item, status: next });
    toast(`${e.title} marked ${next}`);
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader eyebrow="Stage 3 · What the chatbot knows"
        title="Knowledge Base"
        description="Everything the chatbot is allowed to say: services, prices, FAQs, offers and policies. If something is not here, the chatbot will not make it up — it offers to connect the customer with the team."
        actions={
          <Popover
            className="w-56 p-1.5"
            trigger={({ toggle, open }) => (
              <Button icon={Plus} onClick={toggle} aria-expanded={open}>
                Add knowledge
              </Button>
            )}
          >
            {(close) => (
              <div role="menu">
                {[
                  ["Service or product", () => setEditProduct(emptyProduct())],
                  ["FAQ", () => setEditKnowledge(emptyKnowledge("faq"))],
                  ["Offer", () => setEditKnowledge(emptyKnowledge("offer"))],
                  ["Policy or rule", () => setEditKnowledge(emptyKnowledge("delivery"))],
                  ["Upload document", () => setTab("documents")],
                ].map(([l, fn]) => (
                  <button
                    key={l as string}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      (fn as () => void)();
                      close();
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    {l as string}
                  </button>
                ))}
              </div>
            )}
          </Popover>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-4">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: "all", label: "All", count: byTab.all.length },
              { value: "services", label: "Services & Products", count: productEntries.length },
              { value: "pricing", label: "Pricing" },
              { value: "faq", label: "FAQs", count: byTab.faq.length },
              { value: "offers", label: "Offers", count: byTab.offers.length },
              { value: "policies", label: "Policies", count: byTab.policies.length },
              { value: "documents", label: "Documents", count: ws.documents.length },
            ]}
          />

          {tab === "documents" ? (
            <DocumentsPanel ws={ws} />
          ) : (
            <>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
                  <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search knowledge…" className="pl-9" aria-label="Search knowledge" />
                </div>
                <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="sm:w-44" aria-label="Filter by status">
                  <option value="all">All statuses</option>
                  <option value="approved">Approved</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </div>

              {tab === "pricing" ? (
                <Card className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead className="bg-slate-50 text-left text-xs text-slate-500">
                      <tr>
                        <th className="px-4 py-2.5 font-medium">Service / product</th>
                        <th className="px-4 py-2.5 font-medium">Approved price</th>
                        <th className="px-4 py-2.5 font-medium">Availability</th>
                        <th className="px-4 py-2.5 font-medium">Status</th>
                        <th className="px-4 py-2.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {list.map((e) =>
                        e.kind === "product" ? (
                          <tr key={e.item.id}>
                            <td className="px-4 py-3 font-medium text-slate-800">{e.title}</td>
                            <td className="px-4 py-3 text-slate-700">{priceLabel(e.item)}</td>
                            <td className="px-4 py-3 text-slate-600">{AVAILABILITY_LABEL[e.item.availability]}</td>
                            <td className="px-4 py-3">
                              <Badge tone={e.status === "approved" ? "green" : "slate"}>{e.status === "approved" ? "Approved" : "Inactive"}</Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <IconButton icon={Pencil} label={`Edit ${e.title}`} onClick={() => setEditProduct(e.item)} />
                            </td>
                          </tr>
                        ) : null,
                      )}
                    </tbody>
                  </table>
                  {!list.length && <EmptyState icon={BookOpen} title="No pricing found" />}
                </Card>
              ) : list.length ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {list.map((e) => (
                    <Card key={e.item.id} className={`flex flex-col p-4 ${e.status === "inactive" ? "opacity-70" : ""}`}>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={e.kind === "product" ? "blue" : e.label === "Offer" ? "pink" : e.label === "FAQ" ? "violet" : "slate"}>{e.label}</Badge>
                        <Badge tone={e.status === "approved" ? "green" : "slate"} dot>
                          {e.status === "approved" ? "Approved" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-navy-900">{e.title}</p>
                      {e.kind === "product" && <p className="text-xs font-medium text-brand-700">{priceLabel(e.item)} · {AVAILABILITY_LABEL[e.item.availability]}</p>}
                      <p className="mt-1 line-clamp-3 flex-1 text-xs leading-relaxed text-slate-600">{e.body}</p>
                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                        <span className="text-[11px] text-slate-400">Updated {formatDateTime(e.updatedAt)}</span>
                        <div className="flex">
                          <IconButton
                            icon={e.status === "approved" ? CircleOff : CircleCheck}
                            label={e.status === "approved" ? `Mark ${e.title} inactive` : `Approve ${e.title}`}
                            onClick={() => toggleStatus(e)}
                          />
                          <IconButton icon={Pencil} label={`Edit ${e.title}`} onClick={() => (e.kind === "product" ? setEditProduct(e.item) : setEditKnowledge(e.item))} />
                          <IconButton icon={Trash2} label={`Delete ${e.title}`} onClick={() => setDeleting(e)} className="hover:bg-red-50 hover:text-red-600" />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <EmptyState
                    icon={BookOpen}
                    title={s || status !== "all" ? "No entries match your filters" : "Nothing here yet"}
                    description={s || status !== "all" ? "Try a different search or status filter." : "Add approved information for the chatbot to use."}
                    action={
                      s || status !== "all" ? (
                        <Button variant="outline" size="sm" onClick={() => { setQ(""); setStatus("all"); }}>
                          Clear filters
                        </Button>
                      ) : undefined
                    }
                  />
                </Card>
              )}
            </>
          )}
        </div>
        <div className="xl:sticky xl:top-24 xl:self-start">
          <AnswerPreview ws={ws} />
        </div>
      </div>

      <ProductForm product={editProduct} onClose={() => setEditProduct(null)} />
      <KnowledgeForm item={editKnowledge} onClose={() => setEditKnowledge(null)} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          if (deleting.kind === "product") actions.deleteProduct(deleting.item.id);
          else actions.deleteKnowledge(deleting.item.id);
          toast(`${deleting.title} deleted`);
        }}
        title="Delete knowledge entry?"
        message={`“${deleting?.title}” will be permanently removed from this demo business.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
