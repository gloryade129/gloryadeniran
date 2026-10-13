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
