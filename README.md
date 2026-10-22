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

## 🎙️ Voice Training (answer like a person, not like a provider)

Left alone, the underlying model answers in its default register — *"Certainly! Here's a
breakdown… I hope this helps!"*. That is the same voice a million other assistants use, so
it reads as generic no matter which provider is behind it.

This worker supports a **voice-training pipeline** that measures how *you* actually text and
locks the bot to that voice. It is a grounding/in-context approach, not a fine-tune: Gemini
and Groq expose no open fine-tuning endpoint, and a fine-tune would still hallucinate. Instead
we measure your real history and inject those measurements as hard rules plus real exchange
examples on every reply.

### How it works

```
WhatsApp export (.txt)  ──►  parse_whatsapp.py   ──►  parsed_chat.jsonl
   or crypt14 + key         (encoding-safe parser)         │
                                                           ▼
                                                   style_profile.py
                                                           │
                        ┌──────────────────────────────────┴────────────────────┐
                        ▼                                                   ▼
              src/data/style_profile.json                      src/data/fewshot.json
              (measured voice rules)                           (real exchange pairs)
                        └───────────────────┬───────────────────────────────────┘
                                            ▼
                              src/voice-profile.js  →  extraContext on every reply
                                            │
                                            ▼
                              src/response-check.js  →  post-reply enforcement
```

1. **Parse** — `tools/wa_export/parse_whatsapp.py` reads the export (UTF-8, UTF-16 and
   CP1252 all handled), rejoins multi-line messages, drops system notices and media
   placeholders, and records who spoke.
2. **Profile** — `tools/wa_export/style_profile.py` measures your side of the conversation:
   reply length distribution, line count, emoji rate, end-punctuation habits, casing,
   contractions, openers/closers, local register markers — and turns them into a `voice_brief`
   of hard rules, plus a handful of real `incoming → your reply` exemplars.
3. **Inject** — `src/voice-profile.js` builds that into a prompt block that sits in
   `extraContext`, right after the owner profile, so it outranks the provider's default voice.
4. **Enforce** — `src/response-check.js` audits the finished reply for provider tells
   (`As an AI…`, `I hope this helps`, `Let me know if you need…`, markdown headings, bullet
   essays, "Great question!", LLM vocabulary), strips them, and enforces the length/emoji
   budget. If nothing human is left, the bot stays silent rather than sending filler.

### Running it

```powershell
# 1. Export the chat from WhatsApp (Chat → ⋮ → More → Export chat → Without media)
#    and drop the .txt into src/data/chat_export.txt

# 2. Parse + profile in one step
npm run train

# 3. Audit the result (no API key needed)
npm run voice:check
npm test
```

`--me "You"` in `train:parse` is the label your own messages carry in the export. Change it
in `package.json` if your export uses your name instead of `You`.

Point it at a whole folder of exports at once:

```powershell
py -3 tools/wa_export/parse_whatsapp.py --input "$env:USERPROFILE\Downloads" --me "You" --out src/data/parsed_chat.jsonl
py -3 tools/wa_export/style_profile.py --input src/data/parsed_chat.jsonl --out-dir src/data
```

### Encrypted backups (`msgstore.db.crypt14`)

`tools/wa_export/decrypt_crypt14.py` decrypts a local WhatsApp backup and dumps its message
table. The format is **AES-256-CBC**, and the key is a separate 158-byte file that lives inside
WhatsApp's private app storage (`/data/data/com.whatsapp.w4b/files/key`). Verified against a real
backup:

| Field | Offset | Notes |
|---|---|---|
| protobuf header | `0`  | variable length; carries the WhatsApp version string |
| AES-CBC IV | `67` | 16 bytes — **not** the first 16 bytes of the file |
| ciphertext | `190` | `(filesize − 190) % 16 == 0` |

A naive decryptor that assumes "IV = first 16 bytes" produces garbage even with the correct key.
`npm run test:decrypt` round-trips a synthetic file to prove the offsets stay correct.

**The key cannot be bypassed.** AES-256 has no known weakness here, no tool on the internet
recovers the key from the ciphertext, and searching for one is wasted time. Your options:

1. **Rooted device** — pull `key` and decrypt. Exact and instant, but requires root.
2. **Export chat from WhatsApp** (Chat → ⋮ → More → Export chat → Without media). No key, no
   root; capped around 10,000 messages per chat. This is the recommended path.
3. **Rooted emulator** — restore a Google Drive backup inside BlueStacks with root enabled, then
   pull that emulator's own `key` + `msgstore.db`. You never touch your phone's system, but the
   account moves to the emulator while you do it.

`npm run train:harvest` automates option 2 over USB with no share sheet and no cloud upload — see
below.

```powershell
py -3 -m pip install pycryptodome
py -3 tools/wa_export/decrypt_crypt14.py --input backup.db.crypt14 --key key `
    --out src/data/msgstore.db --dump-messages --me "2348012345678"
```

### Harvesting without root (`train:harvest`)

`tools/wa_export/harvest_from_device.mjs` reads messages straight off a USB-connected phone
through the accessibility tree: it opens chats, scrolls, and scrapes the message bubbles that
WhatsApp renders on screen. No root, no share sheet, no third-party service — the text never
leaves the two machines involved.

```powershell
adb devices                                  # confirm the phone is authorised
npm run train:harvest                        # 8 chats x 60 screens -> src/data/harvest.jsonl
npm run train:merge                          # merge with the export and re-profile
npm run policy:check
```

`is_me` is decided by the **right edge** of a bubble, not its centre — outgoing bubbles sit flush
against the right margin while incoming ones stop short, and long incoming messages span nearly
the full width.

### What is committed

`src/data/style_profile.json`, `src/data/fewshot.json` and `src/data/engagement_profile.json` are
meant to ship with the worker so the deployed bot uses the trained voice. The raw export,
`parsed_chat.jsonl` and `harvest.jsonl` are git-ignored — they contain the other party's messages.

Delete `src/data/style_profile.json` to disable training entirely; every consumer degrades to
`null` and the bot behaves exactly as it did before.

---

## 🗣️ Reply Policy (when the bot speaks)

Mention-only is safe but robotic. `src/selective-reply.js` decides whether a group message is
worth a *voluntary* reply, using two independent halves:

**Signals** — questions (including Nigerian register without a `?`, e.g. "How far"), greetings,
gratitude, celebrations, and the subjects the owner actually talks about (school, registration,
timetable, church, laundry). Bare stickers, link dumps, forwarded broadcasts, messages aimed at
someone else and wall-of-text pastes all score low.

**Temperament** — how much of the conversation the owner really carries, measured by
`style_profile.py` into `src/data/engagement_profile.json`. A person who writes one message in
twenty gets a high bar; a chatty one gets a lower bar. This is why the bot does not answer every
third message in a quiet group.

Direct address (@mention, quote-reply, "Virtue…") always wins, at any hour. Voluntary replies are
bounded by a 75-second per-chat gap, 6/hour, 15/day, and stay silent between 23:00–05:30 Lagos.

```powershell
npm run policy:check   # prints the learned participation rate and the resulting threshold
```

Tune it with the usual config: `group_mention_only: true` restores the old behaviour exactly.

---

## 🎨 Stickers

Drop `.webp` stickers into `assets/stickers/` and name them by moment:
`amen__hands.webp`, `congrats__party.webp`, `laugh__dead.webp`. The bot then follows the right
text reply with a matching sticker, at a rate learned from your own history (default 6%). See
`assets/stickers/README.md`.

Set `STICKER_DIR` to change the folder (e.g. a Render disk mount).

---

## 📣 Public Status Posts (Nigerian campus humour + Christian encouragement)

The worker already posted to WhatsApp Status; it now posts **in voice**. `src/meme-themes.js`
holds three themes — `campus` (Nigerian university humour), `faith` (Christian encouragement)
and `wholesome` — each with its own caption bank, wholesome image source and optional
generation prompt.

- Captions are written in the owner's register ("Course registration portal: *session timed out*.
  Me: which session, exactly? 😭"), never assistant-speak.
- Images come only from wholesome subreddits; NSFW responses are rejected.
- If no image can be fetched, the caption still posts as a text Status — the words are the point.
- Scheduled at `08:00, 14:00, 20:00` Lagos by `status_meme_times`, or on demand with `.statusmeme`.

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
