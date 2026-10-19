# 🕊️ God's Virtue — WhatsApp Bot Worker

This is the persistent background worker for **God's Virtue**, built with `@whiskeysockets/baileys` and Google Gemini AI.

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
cd gods-virtue-worker
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Populate:
- `SUPABASE_URL`: Your Supabase Project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (enables database sync with dashboard).
- `GROQ_API_KEY`: **Recommended primary.** Free key from [Groq Console](https://console.groq.com/keys) — large daily quota plus Whisper speech-to-text for voice notes.
- `GEMINI_API_KEY`: Your Google Gemini API key from [Google AI Studio](https://aistudio.google.com/). Best vision/native audio; used as the second provider.
- `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN`: Optional final backstop from [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/) (token needs *Workers AI: Read*).
- `ENABLE_SEARCH_GROUNDING` *(optional, default `true`)*: set to `false` on the **free** tier — Search grounding is not available there and each attempt wastes a request. The worker also disables it automatically if grounded calls keep failing.

> **🧠 Multi-provider routing.** Every reply walks **Groq → Gemini → Cloudflare** and each provider has its own model list. A model that 404s is retired for the process; a model that runs out of quota is parked using the provider's own retry hint. The bot only says "quota reached" when *every* configured provider is genuinely exhausted — otherwise it stays silent rather than sending a canned line.
>
> **🎙️ Media.** Voice notes are transcribed with Whisper (Groq, then Cloudflare) and answered like text; images and stickers go to a vision-capable model; video/PDF fall back to Gemini. A voice note is only answered in a group when the bot is tagged, matching normal group behaviour.
>
> **⚠️ Free tier still has hard caps.** Groq's free tier is far larger than Gemini's 20/day/model, and Cloudflare adds a daily neuron pool, but a very busy community can exhaust all three. Billing on any one provider removes that ceiling.

### 3. Start the Bot Worker
```bash
npm run dev
```

### 4. Link WhatsApp Account
1. Open your web dashboard at: `http://localhost:3000/admin/gods-virtue` (or in production on `gloryadeniran.cv/admin/gods-virtue`).
2. Enter your bot's WhatsApp phone number with country code (e.g. `2348012345678`).
3. Click **"Request Code"**.
4. The worker terminal and web dashboard will display your **8-Digit Pairing Code** (e.g. `ABCD-EFGH`).
5. Open WhatsApp on your phone &rarr; **Settings** &rarr; **Linked Devices** &rarr; **Link a Device** &rarr; **Link with phone number instead** &rarr; Enter the code.
6. The session will sync automatically to Supabase.

---

## ☁️ 24/7 Cloud Deployment (Railway / Render)

### Deploy to Railway (Recommended)
1. Push your repo to GitHub.
2. In [Railway.app](https://railway.app), create a new project and select your GitHub repository.
3. Select the `gods-virtue-worker` directory as the root.
4. Add the environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GROQ_API_KEY`
   - `GEMINI_API_KEY`
   - `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` *(optional backstop)*
   - `ENABLE_SEARCH_GROUNDING` *(optional, set `false` on the free tier)*
5. Railway will automatically build using the included `Dockerfile` and keep the bot running 24/7!

---

## 🔐 Admin Access (WhatsApp DM Commands)

Send any dot command (e.g. `.help`) in a private chat with the bot. Access is granted by either:

1. **Environment (recommended):** set `ADMIN_PHONE` / `OWNER_PHONE` in `.env` — those numbers are authorized automatically on boot.
2. **`.claim <PIN>`:** uses `ADMIN_PIN` from `.env`. If `ADMIN_PIN` is not set, the worker generates a random 8-character PIN on every boot and prints it to the worker logs.

> ⚠️ The old default PIN (`1290`) was published in this repository, so it is no longer accepted. Set a fresh `ADMIN_PIN` (or `ADMIN_PHONE`) before granting access to anyone.

Common commands: `.help`, `.status`, `.groups`, `.sync`, `.lock <n>`, `.open <n>`, `.whitelist <n> on|off`, `.schedule <n> on|off`, `.timetable <n> ...`, `.pause` / `.resume`, `.dms on|off`, `.vcf`, `.meme`, `.tagall <msg>`, `.broadcast <n> <msg>`, `.instruct <rule>`, `.ask <prompt>`.

New in this release:

- `.kb add Title | Content | tags` — teach the bot an owner-approved fact (global in DM, group-scoped when used in a group). Also `.kb list`, `.kb search <query>`, `.kb del <id>`.
- `.poll Question | Option 1 | Option 2` — send a native WhatsApp poll.
- `.remind 30m Message` / `.remind 18:30 Message` / `.remind tomorrow 09:00 Message` — then `.reminders` and `.cancelremind <id>`.
- `.imagine <prompt>` — generate an image with Cloudflare FLUX.
- `.voice [text]` — test the Cloudflare TTS voice reply.
- `.providers` (aliases `.usage`, `.features`) — live provider request/quota counters, parked models, KB size, reminders and feature flags.

> **First deploy?** Apply `supabase/gods-virtue-schema.sql` to your database first (it lives in the dashboard repo), otherwise admin authorizations cannot be persisted.
>
> **Upgrading an existing deployment?** Run `supabase/gods-virtue-security.sql` once. It is idempotent and adds the knowledge/reminder/poll tables plus the new service-role-only RLS policies. Re-applying `supabase/gods-virtue-schema.sql` is also safe (`CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`). Without the new migration the worker still runs; knowledge/reminders fall back to memory and do not survive restarts, and the dashboard can still read with the service-role key.

---

## 🧠 Built-In Brain Features

- **Nightly community recap** — posted automatically as the group locks: real date, real new members, and a plain-words summary of the day's actual discussions.
- **Reliable welcomes** — new members are detected from live group metadata (reconciled every ~5 minutes against a durable roster), so joins are noticed even across worker restarts.
- **Conversation Starter** — when a group goes silent for an hour between 08:00–22:00 (Lagos), the bot drops one grounded line: a callback to something earlier, light banter, or a fresh discussion idea — sometimes tagging 1–2 people. Per-group toggle on the dashboard; `SILENCE_ENGAGEMENT=off` kills it globally.
- **Long-term memory** — durable facts (names, preferences, plans) are learned from conversations and injected into future replies.
- **Self-improvement** — at 03:30 Lagos daily, the bot reviews its own replies (and whether members replied back) and writes itself up to 3 style rules. Max 10 active, style-only, visible via `.learned`, clearable via `.learned clear`. Disable with `SELF_IMPROVEMENT=off`.
- **Lecture timetables** — upload a class timetable PDF from the dashboard (Groups tab). God's Virtue parses it with Gemini, then announces **tomorrow's lectures** with the nightly lock recap and **today's lectures** with the 06:00 good-morning greeting (free days get a short "no lectures" note). It rides the group's own lock/open schedule automatically, or fires at 21:00 / 06:00 for groups without one. Inside that group, members can ask *"Virtue, which courses are we having today?"* and it answers from the schedule only. Re-uploading the PDF posts a change-diff of what moved. Per-group toggle, semester (Harmattan/Rain) and reminder times are in the dashboard; `.timetable` views and edits it from WhatsApp.
- **Knowledge base (lightweight RAG)** — owner-approved facts are retrieved by keyword overlap and injected into the prompt as trusted context, so the bot answers from the truth instead of guessing. No embedding API is needed.
- **Smart moderation 2.0** — conservative flood, duplicate-message, mass-mention and join-raid detection. Only confirmed non-admins are actioned; admins are never punished, and an unverifiable admin status means "do nothing". Strikes share the existing anti-link violations table. Thresholds and optional raid auto-lock are env-tunable.
- **Language-aware replies** — detects Nigerian Pidgin, Yoruba, Hausa and Igbo and quietly instructs the model to reply in the member's language (English is the default and adds no prompt tokens).
- **Voice replies (TTS)** — a voice note gets a spoken reply through Cloudflare MeloTTS when it succeeds; otherwise the bot sends the text. Disable with `VOICE_REPLIES_ENABLED=false`.
- **Image generation** — `.imagine <prompt>` uses Cloudflare FLUX. Disable with `IMAGE_GENERATION_ENABLED=false`.
- **Polls & reminders** — native WhatsApp polls, plus durable reminders delivered by the background loop (with an in-memory fallback before the migration is applied).

---

## 🩺 Health & Diagnostics Endpoints

The worker binds an HTTP server on `$PORT` (default `8080`):

| Endpoint | Purpose |
|---|---|
| `GET /health` | Liveness probe (used by Railway / Render) |
| `GET /diag` | Runtime diagnostics: provider health (configured/dead/cooling models + request/quota counters), model errors, cached groups, schedules, announcements, KB/reminder/moderation/media stats |
| `GET /models` | Raw Gemini model registry for the configured API key |
| `GET /test-ai` | Sends one sample prompt through the AI router |

> **These endpoints are protected.** Set `ADMIN_DIAG_TOKEN` on the worker and send it as `x-diag-token: <token>` (or `?token=<token>`). In production they fail closed when the token is unset. The dashboard's `/api/gods-virtue/diagnostics` proxy adds the header server-side, so the token never reaches the browser.
