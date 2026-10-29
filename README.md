# Instagram AI Chatbot Demo

A fully interactive, client-presentable demo of an Instagram AI chatbot and lead-automation workflow, built with Next.js (App Router), React, TypeScript, Tailwind CSS and Lucide icons.

> **Demo only.** Nothing connects to Instagram, Meta, Firebase or any AI API. Customer messages are simulated, replies come from a deterministic local rules engine that only uses the business information you configure, and all data lives in your browser's `localStorage`.

## Run the demo (no install needed)

```bash
npm run dev        # http://localhost:3000   (other port: npm run dev -- -p 3001)
```

Open the app and click **Login**. No email or password is required.

The demo is a static site: `out/` contains the prebuilt app. When dependencies aren't installed, `npm run dev` and `npm start` serve `out/` with a zero-dependency Node server (`scripts/serve.mjs`). Only Node.js is required. **Do not run `npm install` on a drive with large clusters** (see below).

## Change the code

Editing and rebuilding needs the dependencies, on a drive with a normal 4 KB NTFS allocation unit:

```bash
npm install
npm run dev        # Next.js dev server with hot reload
npm run build      # regenerates out/ — copy it back into this folder if you built elsewhere
```

> **Windows drive note:** on a drive formatted with large clusters (this project's D: drive uses 2 MB), every small file takes at least one cluster, so `node_modules` (~16,000 files) needs ~30 GB and `npm install` fails. That's why `'next' is not recognized` appeared. Check a drive with PowerShell: `Get-Volume D | Select AllocationUnitSize`. Build on another drive (e.g. copy the folder to `C:\`), then copy `out/` back here.
>
> The npm scripts run Next.js through `scripts/next.mjs`, which starts it from the folder's real path, so the project also works when opened through a junction.

## What's inside

| Page | What you can do |
| --- | --- |
| **Login** | One-click demo sign-in; sign out from the profile menu |
| **Overview** | Live metrics, 14-day activity chart, lead categories, pipeline summary, pending tasks, automation log, chatbot/connection status |
| **Business Setup** | 5-step wizard: profile → products & services → FAQs & policies → simulated Instagram connection → review & activate (missing items are listed) |
| **Knowledge Base** | Search/filter, add/edit/delete, approve/inactivate, pricing table, "test a customer question" preview, simulated document upload with manual sample text |
| **Instagram Inbox** | 3-panel inbox, filters and sorting, **Simulate Customer Message** (9 scenarios or custom text), typing state, reply sources, duplicate detection, failed-reply retry, take over / pause / resume / resolve / reopen, assignment, internal notes, follow-ups |
| **Leads & Pipeline** | Drag-and-drop Kanban (plus move controls), table view, transparent scoring with reasons, manual category override, editable lead details |
| **Follow-Up Center** | Create/edit/complete/reschedule/cancel, filters, overdue view, "Run due follow-ups"; internal reminders vs simulated customer messages; won/lost/opt-out stop follow-ups |
| **Analytics** | Date presets and custom range; every metric calculated from the demo data |
| **Settings** | Chatbot on/off, welcome message, tone, hours, qualification questions, handoff rules, follow-up and notification preferences, simulated delivery failures, reset demo |

The top bar includes global search, notifications, a demo business selector (create a blank business to show onboarding from scratch), and the profile menu with a "How this demo works" guide mapping the 7 workflow stages.

## Suggested presentation script

1. Log in, review the Overview.
2. Business Setup: edit the profile, add a service with a price, and add an FAQ.
3. Instagram Inbox → **Simulate Customer Message** → "Asking about service prices". The reply quotes the configured price and shows its source.
4. Send "My budget is ₹30,000 and I need it this month". The lead's budget and timeline update and it is re-scored.
5. Leads & Pipeline: drag the lead to **Contacted**.
6. Inbox: assign a salesperson, then **Take over**. The chatbot pauses and new messages get no automatic reply.
7. Follow-Up Center: create a follow-up and mark it complete.
8. Check Overview and Analytics, refresh the browser to show persistence, then Settings → **Reset demo**.

## Project structure

```
app/                 routes (overview, setup, knowledge, inbox, leads, follow-ups, analytics, settings, login)
components/
  shell/             sidebar, top bar, search, workflow guide, auth guard
  ui/                buttons, inputs, modal, popover, toast, icons
  setup/ business/   setup wizard steps, product & knowledge forms
  knowledge/         document upload simulation, answer preview
  inbox/             conversation list, chat panel, customer panel, simulate modal
  leads/ followups/  pipeline badges and detail, follow-up form
  charts/            dependency-free SVG/CSS charts
lib/
  types.ts           all domain types
  seed.ts            "Brightline Digital Studio" sample dataset (generated relative to now)
  engine.ts          local response engine (intent rules, knowledge matching, lead extraction)
  leads.ts           transparent lead scoring and next actions
  store.ts           central typed store + all actions (useSyncExternalStore, localStorage)
  storage.ts         load/validate/save/reset persistence
  analytics.ts       metric calculations
  setup.ts           setup completeness checks
```

## Limitations

- No real Instagram/Meta integration, AI model, document text extraction or background scheduler. These are simulated and labelled as such in the UI.
- The response engine uses keyword rules, so phrasing far from the configured keywords falls back to the safe "connect you with our team" reply.
- Data is per-browser (`localStorage`). Clearing site data or using another browser starts from the sample dataset.
- Login is a demo convenience with no authentication.
