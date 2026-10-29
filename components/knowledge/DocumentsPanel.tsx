"use client";

import { FileText, FileUp, Loader2, Pencil, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { actions } from "@/lib/store";
import type { DemoDocument, Workspace } from "@/lib/types";
import { formatBytes, formatDateTime } from "@/lib/utils";
import { ConfirmDialog, Modal } from "../ui/Modal";
import { Badge, Button, DemoNotice, EmptyState, Field, IconButton, Textarea } from "../ui/primitives";
import { toast } from "../ui/toast";

const ACCEPT = [".pdf", ".txt", ".docx"];
const MAX = 10 * 1024 * 1024;

export function DocumentsPanel({ ws }: { ws: Workspace }) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [editing, setEditing] = useState<DemoDocument | null>(null);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState<DemoDocument | null>(null);

  const handle = (files: FileList | null) => {
    if (!files?.length) return;
    for (const f of Array.from(files)) {
      const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
      if (!ACCEPT.includes(ext)) {
        toast(`${f.name}: only PDF, TXT and DOCX files are supported.`, "error");
        continue;
      }
      if (f.size > MAX) {
        toast(`${f.name} is larger than 10 MB.`, "error");
        continue;
      }
      if (f.size === 0) {
        toast(`${f.name} is empty.`, "error");
        continue;
      }
      actions.addDocument({ name: f.name, size: f.size, mime: f.type || ext });
      toast(`${f.name} uploaded — simulating processing…`, "info");
    }
    if (input.current) input.current.value = "";
  };

  const statusBadge = (d: DemoDocument) =>
    d.status === "processed" ? (
      <Badge tone="green">Processed (simulated)</Badge>
    ) : d.status === "failed" ? (
      <Badge tone="red">Failed</Badge>
    ) : (
      <Badge tone="blue">
        <Loader2 className="size-3 animate-spin" aria-hidden /> {d.status === "uploading" ? "Uploading" : "Processing"}
      </Badge>
    );

  return (
    <div className="space-y-4">
      <DemoNotice>
        Document upload is simulated: only the file name and size are stored. Real text extraction and AI indexing are not connected — add sample extracted
        text manually to let the demo chatbot quote it.
      </DemoNotice>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handle(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors ${drag ? "border-brand-500 bg-brand-50" : "border-slate-300 bg-slate-50/50"}`}
      >
        <FileUp className="size-8 text-slate-400" aria-hidden />
        <p className="mt-2 text-sm font-medium text-slate-700">Drag & drop files here</p>
        <p className="text-xs text-slate-500">PDF, TXT or DOCX · up to 10 MB</p>
        <Button className="mt-3" variant="outline" size="sm" onClick={() => input.current?.click()}>
          Browse files
        </Button>
        <input ref={input} type="file" accept={ACCEPT.join(",")} multiple className="sr-only" onChange={(e) => handle(e.target.files)} aria-label="Upload documents" />
      </div>

      {ws.documents.length === 0 ? (
        <EmptyState icon={FileText} title="No documents uploaded" description="Upload brochures, price sheets or policy documents." />
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {ws.documents.map((d) => (
            <li key={d.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-xs font-bold uppercase text-red-600">
                {d.name.split(".").pop()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{d.name}</p>
                <p className="text-xs text-slate-500">
                  {formatBytes(d.size)} · uploaded {formatDateTime(d.uploadedAt)} · {d.extractedText ? `${d.extractedText.split(/\s+/).length} words of sample text` : "no sample text added"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {statusBadge(d)}
                <button
                  type="button"
                  onClick={() => {
                    actions.updateDocument(d.id, { approval: d.approval === "approved" ? "inactive" : "approved" });
                    toast(`${d.name} marked ${d.approval === "approved" ? "inactive" : "approved"}`);
                  }}
                  className="rounded-full"
                  aria-label={`Toggle approval for ${d.name}`}
                >
                  <Badge tone={d.approval === "approved" ? "green" : "slate"}>{d.approval === "approved" ? "Approved" : "Inactive"}</Badge>
                </button>
                <Button
                  size="sm"
                  variant="outline"
                  icon={Pencil}
                  disabled={d.status !== "processed"}
                  onClick={() => {
                    setEditing(d);
                    setText(d.extractedText);
                  }}
                >
                  {d.extractedText ? "Edit text" : "Add extracted text"}
                </Button>
                <IconButton icon={Trash2} label={`Delete ${d.name}`} onClick={() => setDeleting(d)} className="hover:bg-red-50 hover:text-red-600" />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Sample extracted content"
        description={editing?.name}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editing) actions.updateDocument(editing.id, { extractedText: text.trim() });
                toast("Sample content saved");
                setEditing(null);
              }}
            >
              Save content
            </Button>
          </>
        }
      >
        <Field label="Extracted text (entered manually for the demo)" htmlFor="doc-text" hint="The demo chatbot may quote a sentence from this text when no FAQ or policy matches.">
          <Textarea id="doc-text" value={text} onChange={(e) => setText(e.target.value)} className="min-h-[180px]" />
        </Field>
      </Modal>
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) actions.deleteDocument(deleting.id);
          toast("Document deleted");
        }}
        title="Delete document?"
        message={`“${deleting?.name}” and its sample text will be removed.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
