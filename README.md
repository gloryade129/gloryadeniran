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
- `GEMINI_API_KEY`: Your free Google Gemini API key from [Google AI Studio](https://aistudio.google.com/).

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
   - `GEMINI_API_KEY`
5. Railway will automatically build using the included `Dockerfile` and keep the bot running 24/7!

---

## 🔐 Admin Access (WhatsApp DM Commands)

Send any dot command (e.g. `.help`) in a private chat with the bot. Access is granted by either:

1. **Environment (recommended):** set `ADMIN_PHONE` / `OWNER_PHONE` in `.env` — those numbers are authorized automatically on boot.
2. **`.claim <PIN>`:** uses `ADMIN_PIN` from `.env`. If `ADMIN_PIN` is not set, the worker generates a random 8-character PIN on every boot and prints it to the worker logs.

> ⚠️ The old default PIN (`1290`) was published in this repository, so it is no longer accepted. Set a fresh `ADMIN_PIN` (or `ADMIN_PHONE`) before granting access to anyone.

Common commands: `.help`, `.status`, `.groups`, `.sync`, `.lock <n>`, `.open <n>`, `.whitelist <n> on|off`, `.schedule <n> on|off`, `.pause` / `.resume`, `.dms on|off`, `.vcf`, `.meme`, `.tagall <msg>`, `.broadcast <n> <msg>`, `.instruct <rule>`, `.ask <prompt>`.

> **First deploy?** Apply `supabase/gods-virtue-schema.sql` to your database first (it lives in the dashboard repo), otherwise admin authorizations cannot be persisted.

---

## 🩺 Health & Diagnostics Endpoints

The worker binds an HTTP server on `$PORT` (default `8080`):

| Endpoint | Purpose |
|---|---|
| `GET /health` | Liveness probe (used by Railway / Render) |
| `GET /diag` | Runtime diagnostics: model errors, cached groups, announcements |
| `GET /models` | Raw Gemini model registry for the configured API key |
| `GET /test-ai` | Sends one sample prompt through the AI engine |

> These endpoints are unauthenticated — if your deployment URL is public, restrict them at the platform level so strangers cannot consume your Gemini quota.
