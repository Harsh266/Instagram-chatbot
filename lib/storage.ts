import type { DemoState, Workspace } from "./types";
import { createSampleWorkspace, STATE_VERSION } from "./seed";

const KEY = "ig-ai-chatbot-demo:v1";

export function freshState(): DemoState {
  const ws = createSampleWorkspace();
  return {
    version: STATE_VERSION,
    activeWorkspaceId: ws.id,
    profile: { name: "Demo Admin", role: "Business Owner", email: "admin@brightline-studio.example" },
    workspaces: [ws],
  };
}

const ARRAYS: (keyof Workspace)[] = [
  "products",
  "knowledge",
  "documents",
  "customers",
  "conversations",
  "messages",
  "leads",
  "followUps",
  "activities",
  "notifications",
  "team",
];

function isValid(s: unknown): s is DemoState {
  if (!s || typeof s !== "object") return false;
  const st = s as DemoState;
  if (st.version !== STATE_VERSION || !Array.isArray(st.workspaces) || !st.workspaces.length) return false;
  if (!st.profile || typeof st.activeWorkspaceId !== "string") return false;
  return st.workspaces.every(
    (w) => w && w.business && w.settings && w.instagram && ARRAYS.every((k) => Array.isArray(w[k])),
  );
}

export interface LoadResult {
  state: DemoState;
  notice: string | null;
}

export function loadState(): LoadResult {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return { state: freshState(), notice: "Browser storage is unavailable — changes will not persist after a refresh." };
  }
  if (!raw) return { state: freshState(), notice: null };
  try {
    const parsed = JSON.parse(raw);
    // Data saved by an older version of the demo is replaced by the current sample data.
    if (parsed?.version !== STATE_VERSION) return { state: freshState(), notice: null };
    if (!isValid(parsed)) throw new Error("invalid");
    if (!parsed.workspaces.some((w) => w.id === parsed.activeWorkspaceId)) parsed.activeWorkspaceId = parsed.workspaces[0].id;
    // Simulated document processing is timer-based; finish any that were interrupted by a refresh.
    for (const w of parsed.workspaces)
      for (const d of w.documents) if (d.status === "uploading" || d.status === "processing") d.status = "processed";
    return { state: parsed, notice: null };
  } catch {
    return { state: freshState(), notice: "Saved demo data could not be read, so the original sample data was restored." };
  }
}

export function saveState(state: DemoState) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Quota or privacy mode — the demo keeps working in memory.
  }
}

export function clearState() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
