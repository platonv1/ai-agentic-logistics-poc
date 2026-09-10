# Tech Stack

What's used in this project, what it is, and where it shows up in the codebase.

## Framework & language

**Next.js 16 (App Router)**
The web framework this whole app is built on — handles routing, server rendering,
and API endpoints in one project.
- Pages/routing: `app/page.tsx`, `app/dispatch/page.tsx`, `app/track/[orderId]/page.tsx`
- API route handlers: `app/api/agents/exceptions/route.ts`,
  `app/api/agents/dispatch/route.ts`, `app/api/agents/chat/route.ts`

**React 19**
The UI library Next.js is built on; every `.tsx` file is a React component.
- Server components: `app/dispatch/page.tsx`, `app/track/[orderId]/page.tsx` (read
  data directly, no client-side fetch needed on load)
- Client components (interactive, `"use client"`): `app/dispatch/DispatchBoard.tsx`,
  `app/track/[orderId]/TrackingChat.tsx`

**TypeScript**
Typed superset of JavaScript — used for every source file in the project.
- Shared domain types (`Order`, `Driver`, `EventLogEntry`, `ChatMessage`,
  `ExceptionType`, etc.) are defined once in `lib/data.ts` and imported everywhere
  else that needs them.

## Styling

**Tailwind CSS v4**
Utility-class CSS framework — all styling in this app is done with inline Tailwind
classes, no separate stylesheet per component.
- Used throughout every page and component under `app/`
- Configured via `postcss.config.mjs` and the base styles in `app/globals.css`

## LLM integration

**Google Gemini API**
One of two real LLM backends the agents can call — Google's hosted model API
(`generateContent` endpoint), used with a JSON response schema so output is
parsed directly into the agent contract.
- `lib/llm.ts` (`callGemini` function)
- Enabled by setting `LLM_PROVIDER=gemini` (see `.env.example`)

**Ollama**
The other real LLM backend — a local model server running on the developer's own
machine, called over HTTP.
- `lib/llm.ts` (`callOllama` function), hits `/api/generate` on the configured
  `OLLAMA_BASE_URL`
- Enabled by setting `LLM_PROVIDER=ollama` (see `.env.example`)

**Mock provider**
Not a third-party tool — a deterministic, scenario-aware fallback built into the
app itself so it's fully interactive with zero setup (no API key, no local model).
- Computed per-agent in each route's `buildMockResult` function:
  `app/api/agents/exceptions/route.ts`, `app/api/agents/dispatch/route.ts`,
  `app/api/agents/chat/route.ts`
- Used as the default (`LLM_PROVIDER=mock`) and as the automatic fallback in
  `lib/llm.ts` if a real Gemini/Ollama call throws

## Data / state

**In-memory store (`globalThis` singleton)**
Stands in for a database in this POC — plain JS objects/arrays holding drivers,
orders, the event log, and chat messages, seeded on first access and mutated
directly by the agent routes. No ORM, no external DB.
- Defined and exported from `lib/data.ts`
- Read and mutated by all three files under `app/api/agents/`, and read directly
  by the two page server components for initial render

## Tooling

**ESLint**
Lints the codebase against Next.js's recommended rules.
- Config: `eslint.config.mjs` (extends `eslint-config-next`)
- Run via `npm run lint`

**npm**
Package manager for installing dependencies and running project scripts.
- `package.json` (scripts: `dev`, `build`, `start`, `lint`) and `package-lock.json`

**Node.js**
The JavaScript runtime everything above executes on (Next.js dev/build/start all
run on Node).

## Hosting / infra

**Git + GitHub (`gh` CLI)**
Version control and where the code is published.
- Public repo: [github.com/platonv1/ai-agentic-logistics-poc](https://github.com/platonv1/ai-agentic-logistics-poc)
- Explicitly **not deployed anywhere** — this is a local-only demo
  (`npm run dev` / `npm run build && npm start`). See `CLAUDE.md` and
  `README.md` for why the in-memory store makes serverless deployment
  unsuitable as-is.
