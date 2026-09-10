# AI-First Agentic Logistics — POC

A last-mile delivery dispatch prototype built around three **agentic** functions —
each one a direct LLM call that reasons over live mock data and takes autonomous
action, not a scripted demo. Built as a case-study POC (see [`CLAUDE.md`](./CLAUDE.md)
for the full product/scoping brief this implements).

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No environment variables are
required — the app runs fully interactively out of the box using the built-in mock
LLM provider (see [Mock provider](#mock-provider-and-why-it-exists) below).

- `/dispatch` — the ops dashboard: shipment board, a "Simulate exception" control, an
  "Add new order & dispatch" control, and a live agent activity log.
- `/track/[orderId]` — the customer-facing tracking page and support chat, e.g.
  `/track/ord-1001`.

## The three agents

| Agent | Route | Trigger | Decides |
|---|---|---|---|
| Exception Resolution | `app/api/agents/exceptions/route.ts` | "Simulate exception" on `/dispatch` | reschedule / reroute / notify customer / reassign driver — or escalate to a human if confidence < **0.7** |
| Dynamic Dispatch & Route Optimization | `app/api/agents/dispatch/route.ts` | "Add new order & dispatch" on `/dispatch` | assign the best available driver, or queue the order if the fleet is at capacity |
| Proactive Customer Communication | `app/api/agents/chat/route.ts` | sending a message on `/track/[orderId]` | a live, order-context-aware reply to the customer |

Each route builds a role-specific system prompt from the current in-memory state,
calls `lib/llm.ts`, applies the returned decision to the store, and returns the full
reasoning trace to the client — nothing is scripted client-side. There's
intentionally no agent framework (LangChain, etc.) here: three agents each making one
structured LLM call don't need one.

## Architecture

```
lib/data.ts   — seed data (drivers, orders, event log, chat) + an in-memory store
lib/llm.ts    — provider-agnostic LLM client (gemini | ollama | mock)
app/api/agents/{exceptions,dispatch,chat}/route.ts — the three agents
app/dispatch/page.tsx + DispatchBoard.tsx          — ops dashboard
app/track/[orderId]/page.tsx + TrackingChat.tsx    — customer tracking + chat
```

**No database.** State lives in a plain in-memory store, seeded on first access and
mutated directly by the agent routes — enough for a POC, and it avoids infra a
reviewer would need to stand up. This is a **local-only demo**: run it with
`npm run dev` (or `npm run build && npm start`) on your own machine. It is not meant
to be deployed to a serverless platform — a per-invocation runtime (e.g. Vercel)
would give each function its own memory and the store wouldn't persist across
requests. If persistence-across-deploys is ever needed, this store is the first
thing to swap for a real database.

One non-obvious detail in `lib/data.ts`: the store is stashed on `globalThis` rather
than being a plain module-level array. Next.js compiles Route Handlers
(`app/api/**/route.ts`) and Server Components (`app/**/page.tsx`) as separate module
graphs, so a plain `export const orders = [...]` is **not** guaranteed to be the same
array instance in both places — confirmed while building this, where the three agent
routes shared state with each other but not with the dashboard page. `globalThis` is
the standard fix (the same pattern used for Prisma-client singletons in Next.js
apps): it guarantees exactly one store per Node process regardless of which bundle
touched it first.

## How the agent logic works

Every agent call goes through `runAgent()` in `lib/llm.ts`, which always returns the
same shape:

```ts
{ reasoning: string, action: string, confidence: number }
```

`LLM_PROVIDER` (see `.env.example`) picks the backend:

- **`mock`** (default) — deterministic-but-scenario-aware canned reasoning. It isn't
  hidden: this is the honest zero-setup path so anyone can click through the whole
  demo with no API key and no local model. See [below](#mock-provider-and-why-it-exists).
- **`gemini`** — calls the Google Generative Language API (`generateContent`) with
  `responseMimeType: "application/json"` and a JSON schema, so the model's output is
  parsed directly into the `{reasoning, action, confidence}` contract. Requires
  `GEMINI_API_KEY`.
- **`ollama`** — calls a local Ollama server's `/api/generate` with `format: "json"`.
  Requires Ollama running locally with a model pulled (defaults to `llama3`).

Switching providers is just an env var — no code changes. If a real provider call
throws (missing key, unreachable server, malformed JSON back from the model),
`runAgent()` logs the error and falls back to the mock result rather than crashing
the request, so a flaky local Ollama server or an expired key degrades gracefully
instead of breaking the demo mid-session.

### Mock provider, and why it exists

The mock isn't a random canned string — each route computes it from the actual
scenario (which exception type, which driver has capacity, what the customer asked),
so the "reasoning" you see is genuinely derived from the current mock state, just
without a live model call. It exists purely so a reviewer with no `GEMINI_API_KEY`
and no local Ollama install can still exercise the full agentic loop. Point
`LLM_PROVIDER` at `gemini` or `ollama` to see the same contract filled in by a real
model instead.

## Confidence threshold and escalation

The Exception Resolution Agent escalates to a human instead of acting autonomously
when the model's reported confidence is below `CONFIDENCE_THRESHOLD` (0.7, defined in
`app/api/agents/exceptions/route.ts`). Escalated orders are flagged with
`order.escalated = true` and show a "needs review" badge on the dashboard instead of
having the proposed action applied.

## Environment variables

See `.env.example`. Copy it to `.env.local` and fill in only what you need for the
provider you're testing:

```bash
cp .env.example .env.local
```
