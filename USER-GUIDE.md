# User Guide

Step-by-step instructions to get this project running on your own machine, from
cloning the repo to seeing real Gemini responses in the dispatch dashboard. If you
just want the short version, see the README's Quick Start — this guide is the
detailed, nothing-assumed walkthrough, including the setup gotchas we actually hit
while building this.

## What you'll need

- **Node.js 20.9 or newer** (required by Next.js 16 — check with `node --version`;
  if you're on an older version, install from [nodejs.org](https://nodejs.org))
- **npm** (comes with Node)
- **git** (or just download the repo as a ZIP from GitHub — see Step 1)
- A **Google account**, only if you want real Gemini responses instead of the
  built-in mock (covered in Step 4 — entirely optional)

## Step 1 — Get the code

```bash
git clone https://github.com/platonv1/ai-agentic-logistics-poc.git
cd ai-agentic-logistics-poc
```

No `git`? On the repo's GitHub page, click **Code → Download ZIP**, unzip it, and
`cd` into the extracted folder instead.

## Step 2 — Install dependencies

```bash
npm install
```

This installs Next.js, React, Tailwind, and TypeScript — no other services, no
database, nothing else to stand up.

## Step 3 — Run it (zero setup)

```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)**. That's it — no API key,
no config file, no signup. The app defaults to a built-in mock LLM provider, so all
three agents (exception resolution, dispatch, customer chat) are fully interactive
immediately:

- **`/track/ord-1001`** (or any seeded order id, `ord-1001`–`ord-1005`) — chat with
  the customer support agent. Fully public, no login.
- **`/dispatch`** — the ops/dispatch staff console. This one needs a one-time setup
  step (Step 4 below) before you can sign in — see that step for why.

> If port 3000 is already in use, Next.js will automatically try 3001, 3002, etc.,
> and print the actual URL it picked — check your terminal output.

The customer tracking page above is enough to fully evaluate that half of the app
with zero setup. Everything below is either required once (Step 4, for the
dispatch console) or optional (Steps 5–6, for real model responses instead of the
mock).

## Step 4 — Sign in to the dispatch console (required for that page)

The dispatch console is gated behind a real login (JWT-based), not just a label —
this is on purpose, so it can't be confused with the public customer tracking
page. That means, unlike the rest of the app, it needs one thing set up before you
can use it at all.

### 4a. Create your local config file (if you haven't already)

```bash
cp .env.example .env.local
```

### 4b. Generate a session-signing secret

This is **not** a third-party API key — no account, no website, just a random
string you generate yourself:

```bash
openssl rand -base64 48
```

Paste the output into `.env.local`:

```
JWT_SECRET=paste-the-random-string-here
```

Don't have `openssl`? Any long random string works — for a demo, even
`node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`
does the same thing.

### 4c. Restart the dev server

```bash
npm run dev
```

### 4d. Sign in

Go to `/dispatch` and use one of the built-in prototype accounts:

| Username | Password | Role |
|---|---|---|
| `staff` | `staff123` | Dispatch staff |
| `driver` | `driver123` | Driver |

These are hardcoded demo accounts (see `lib/auth.ts`) — there's no real user
database, matching the rest of this POC's "no database" design. Don't reuse a
real password here.

If you forget this step, the login form will show
`Server is missing JWT_SECRET` instead of crashing — that error message is your
cue to come back and do 4a–4c.

## Step 5 — Turn on real Gemini responses (optional)

The mock provider is intentionally honest, not a cheat: each response is computed
from live scenario data, just without an actual model call. To see a real LLM
reasoning through the same decisions, do this:

### 4a. Create your own Gemini API key

1. Go to **[aistudio.google.com/apikey](https://aistudio.google.com/apikey)**
2. Sign in with your Google account
3. Click **Create API key** (pick or create a Google Cloud project if prompted —
   the free tier is enough for this app)
4. Copy the key that's generated — you'll paste it in the next step

Keep this key private. Treat it like a password: don't paste it into chat with
anyone (including an AI assistant), commit it to git, or share a screenshot that
shows it.

### 4b. Create your local config file

In the project root, copy the example env file:

```bash
cp .env.example .env.local
```

`.env.local` is listed in `.gitignore` — it will never be committed or pushed, so
your key stays only on your machine.

### 4c. Paste your key into the right spot

Open **`.env.local`** in your editor and find this line:

```
GEMINI_API_KEY=
```

Paste your key right after the `=`, no quotes, no spaces:

```
GEMINI_API_KEY=your-key-here
```

While you're there, set the provider to Gemini (also in `.env.local`):

```
LLM_PROVIDER=gemini
```

Leave `GEMINI_MODEL=` blank unless you want to override the default
(`gemini-3.6-flash`).

### 4d. Restart the dev server

Env files are only read on startup, so stop the running server (`Ctrl+C` in the
terminal it's running in) and start it again:

```bash
npm run dev
```

You should see `- Environments: .env.local` in the startup output — that confirms
Next.js picked up your file.

### 4e. Verify it's actually using Gemini (not silently falling back)

This matters: if the Gemini call fails for any reason (bad key, rate limit,
deprecated model name), the app **silently falls back to the mock provider** so the
demo never breaks — but that also means a broken key can look like it's "working"
when it's actually still mocked. Two ways to check:

- **Watch your terminal.** If a real call fails, you'll see a line like
  `[llm] gemini call failed, falling back to mock: ...` with the actual error.
  No such line after triggering an agent = it worked.
- **Look at the response itself.** Real Gemini reasoning reads differently each
  time and takes a visible second or more; the mock's wording is fixed and
  responds instantly. Trigger "Simulate exception" on `/dispatch` a couple of
  times with the same exception type — if the reasoning text is byte-for-byte
  identical every time, you're still on mock.

### Gemini troubleshooting

| Error you see | What it means | Fix |
|---|---|---|
| `GEMINI_API_KEY is not set` | `.env.local` is missing, or the key line is empty | Redo step 4b/4c, then restart the server |
| `Gemini API error 404 ... no longer available` | The model name in `GEMINI_MODEL` (or the default) has been deprecated by Google | Set `GEMINI_MODEL` to whatever model name the error message recommends |
| `Gemini API error 503 ... high demand` | Temporary rate limiting on Google's side | Wait a few seconds and try again — the app already falls back to mock automatically so the demo isn't blocked either way |
| `Gemini API error 400` | Malformed request or an invalid/revoked key | Double-check you copied the whole key with no extra characters |

## Step 6 — Use a local model instead (optional)

If you'd rather not use a cloud API at all, you can point the app at a local
[Ollama](https://ollama.com) server:

```bash
ollama pull llama3       # one-time download
ollama serve              # starts the local server
```

Then in `.env.local`:

```
LLM_PROVIDER=ollama
```

`OLLAMA_BASE_URL` defaults to `http://localhost:11434` and `OLLAMA_MODEL` defaults
to `llama3` — only change these if you're running Ollama elsewhere or pulled a
different model. Restart `npm run dev` after editing.

## Stopping the app

Press `Ctrl+C` in the terminal where `npm run dev` is running.

## Quick reference

```bash
git clone https://github.com/platonv1/ai-agentic-logistics-poc.git
cd ai-agentic-logistics-poc
npm install
npm run dev                    # zero-setup, mock provider — /track works immediately

# required, but only for /dispatch:
cp .env.example .env.local
openssl rand -base64 48        # paste the output as JWT_SECRET= in .env.local
npm run dev                    # restart, then sign in at /dispatch with staff/staff123

# optional: real Gemini instead of mock
# edit LLM_PROVIDER and GEMINI_API_KEY in .env.local, then restart again
```
