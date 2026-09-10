# AI-First Agentic Logistics App — Case Study POC

## What this is

A case study assessing PM + Engineering capability: scope and build a POC for an
AI-first, **agentic** logistics app. This repo is empty — everything below is the design
to build from scratch. Required deliverables:

1. Product roadmap
2. Top 3 agentic functions (defined below — don't re-derive, build these)
3. A scoping pack in **PPTX** format
4. An interactive prototype (this repo)
5. A public GitHub repo (create under the `platonv1` GitHub account — `gh` CLI should
   already be authenticated as `platonv1`; if not, ask the user to run `gh auth login`)

## Decisions already made (do not re-litigate these)

- **Vertical: last-mile delivery** (dispatch, routing, ETA, exceptions, customer comms).
  Chosen over freight brokerage / warehouse / fleet ops because it's visual and easy to
  demo interactively (map/board + chat).
- **Prototype stack: Next.js (App Router) + TypeScript + Tailwind.** Chosen over a static
  HTML/JS artifact specifically to signal real engineering, not just a mockup.
- **Agent logic: real LLM calls, not scripted/mocked reasoning** — using an **open**
  provider (Gemini and/or Ollama), explicitly **not Claude/Anthropic**, per the user's
  request. Must still have a zero-setup fallback (see `lib/llm.ts` below) so a reviewer
  with no API key and no local model can still click through the whole demo.
- **No database.** In-memory/seeded mock data is enough for a POC and avoids infra a
  reviewer would need to stand up.
- **Local-only demo.** The app is run via `npm run dev` (or `npm run build` + `npm
  start`) on the reviewer's own machine — not deployed to a serverless platform. This is
  what makes the module-level in-memory store safe: it would not survive serverless
  cold starts or multiple instances, so if deployment is ever needed, the store needs
  to move to something persistent first.
- **No agent framework** (no LangChain etc.). Each of the 3 agentic functions is a direct
  LLM API call with a role-specific system prompt and a small JSON output contract —
  that's all a 3-function POC needs. Don't add abstraction beyond this.
- **Repo will be public**, created via `gh repo create` under the working name
  `ai-agentic-logistics-poc` — reconfirm the exact repo name with the user right before
  creating/pushing (repo creation + push are actions the user should explicitly approve).

## Top 3 agentic functions (the product core)

1. **Exception Resolution Agent** — watches for delivery exceptions (failed attempt,
   address issue, traffic/weather delay, recipient no-show) and autonomously decides +
   applies the next best action (reschedule, reroute, notify customer, reassign driver),
   escalating to a human only when confidence is below a threshold (default **0.7**,
   defined as a named constant in `app/api/agents/exceptions/route.ts` so it's easy to
   tune).
2. **Dynamic Dispatch & Route Optimization Agent** — continuously re-optimizes driver
   assignments/routes as new orders, cancellations, or delays land, balancing SLA, cost,
   and driver load.
3. **Proactive Customer Communication Agent** — monitors shipment state, autonomously
   drafts/sends ETA updates and delay notices, and answers customer questions in a chat
   surface using live order context — reducing inbound support volume.

## Roadmap (Now / Next / Later) — for the PPT and the README

- **Now (this POC):** simulated fleet/orders, dispatcher dashboard with the 3 agents
  running live LLM reasoning against mock data, customer chat surface.
- **Next (0–3 mo, MVP):** real order/webhook ingestion, persistent store, human-in-the-loop
  approval queue for agent actions, basic analytics on agent accuracy/override rate.
- **Later (3–6 mo):** confidence-tiered autonomy with guardrails, multi-agent
  orchestration (planner + specialists), TMS/WMS integrations, SLA-based escalation.
- **Later+ (6–12 mo):** predictive agents (pre-empt exceptions from weather/traffic
  signals), fleet-wide optimization agent, feedback-driven self-improvement, pluggable
  LLM-provider marketplace.

## Prototype architecture to build

```
lib/data.ts       — seed data: drivers, orders/shipments, event log; simple in-memory
                     store (module-level array) mutated by API routes.
lib/llm.ts        — provider-agnostic LLM client. LLM_PROVIDER env var:
                     gemini | ollama | mock (default: mock).
                       - gemini: Google Generative Language API, GEMINI_API_KEY.
                       - ollama: local http://localhost:11434/api/generate.
                       - mock: deterministic-but-scenario-aware canned reasoning so the
                         app is fully interactive with zero setup. Document this
                         honestly in the README/PPT — it's a fallback, not hidden.
                     All three return: { reasoning: string, action: string, confidence: number }.

app/api/agents/exceptions/route.ts  — Exception Resolution Agent
app/api/agents/dispatch/route.ts    — Dispatch & Route Optimization Agent
app/api/agents/chat/route.ts        — Proactive Customer Communication Agent
  Each route builds a prompt from current mock state + a JSON-schema instruction,
  calls lib/llm.ts, applies the returned action to the in-memory store, and returns
  the reasoning trace to the client.

app/dispatch/page.tsx        — ops dashboard: shipment list/board, a "Simulate
                                exception" control, a live "Agent activity log" panel
                                rendering each agent's reasoning + action as it happens.
app/track/[orderId]/page.tsx — customer-facing tracking + chat widget backed by the
                                Proactive Communication Agent.

.env.example — LLM_PROVIDER, GEMINI_API_KEY, OLLAMA_BASE_URL
README.md    — setup, architecture, how the agent logic works, how to switch providers.
```

## Scoping pack (PPTX)

~10–12 slides: Title → Problem/Opportunity → Product Vision → Target users/personas →
Top 3 Agentic Functions (one slide each, with an example reasoning trace) → Architecture
diagram → Roadmap (Now/Next/Later) → POC scope & demo walkthrough → Tech stack & LLM
integration approach (incl. why the mock fallback exists) → Success metrics → Risks &
mitigations → Next steps/ask.

Use the `pptx` skill if available in the session building this. If it isn't available,
fall back to another method (e.g. a `python-pptx` script, or exporting from Google
Slides/Markdown) — decide the specific method at build time.

## Build order

1. Scaffold Next.js + TS + Tailwind app in this directory.
2. Build `lib/data.ts` and `lib/llm.ts` (gemini/ollama/mock).
3. Build the 3 agent API routes + dispatch dashboard + tracking/chat page.
4. Run it (`npm run dev`), exercise the golden path (simulate an exception, watch the
   dispatch agent react, chat with the tracking-page agent); fix issues found.
5. Write README + `.env.example`.
6. `git init`, commit, then `gh repo create` (public, under `platonv1`, working name
   `ai-agentic-logistics-poc`) and push — reconfirm the exact repo name with the user
   first.
7. Build the PPTX scoping pack referencing the live repo.

## Verification

- `npm run build` succeeds with no type errors.
- Manually drive the app: trigger a simulated exception on `/dispatch` and confirm the
  Exception Resolution Agent logs reasoning + an action; confirm the Dispatch agent
  reacts to a new order; open `/track/[orderId]` and chat with the Communication Agent
  and confirm it uses real order context.
- Confirm the `mock` provider works with zero env vars (true zero-setup demo), and that
  setting `LLM_PROVIDER=gemini` (with a key) or `LLM_PROVIDER=ollama` (with a local
  server running) swaps in real model calls without code changes.
