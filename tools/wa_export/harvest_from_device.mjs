#!/usr/bin/env node
/**
 * tools/wa_export/harvest_from_device.mjs
 *
 * Harvests WhatsApp chat history straight off a USB-connected Android phone
 * through the accessibility tree — no root, no share sheet, no cloud round-trip.
 *
 * Why this exists: WhatsApp's local `msgstore.db.crypt14` is AES-encrypted with a
 * key that lives in the app's private data dir, so it is unreadable on a
 * non-rooted phone. The one path that stays entirely on your own machine is the
 * accessibility tree: WhatsApp renders each message bubble as a text node, and
 * `uiautomator dump` exposes those nodes to adb.
 *
 * Read-only: this script taps through the chat list and scrolls. It never opens
 * a keyboard into a chat and never sends anything.
 *
 * Usage
 *   node tools/wa_export/harvest_from_device.mjs --chats 8 --screens 80 \
 *        --out src/data/parsed_chat.jsonl
 *
 * Options
 *   --adb <path>      Path to adb (auto-detected from PATH or Downloads/platform-tools)
 *   --chats <n>       How many of the most recent chats to harvest (default 8)
 *   --screens <n>     Max screens to scroll per chat (default 80)
 *   --out <file>      JSONL output (default src/data/parsed_chat.jsonl)
 *   --settle <ms>     Wait after each tap/swipe (default 900)
 *   --dry-run         List the chats it would harvest, then exit
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// ── CLI ─────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};
const flag = (name) => argv.includes(`--${name}`);

const CHAT_LIMIT = Number(arg('chats', 8));
const MAX_SCREENS = Number(arg('screens', 80));
const OUT = arg('out', 'src/data/parsed_chat.jsonl');
const SETTLE = Number(arg('settle', 900));
const DRY_RUN = flag('dry-run');

function findAdb() {
  const explicit = arg('adb', null);
  if (explicit) return explicit;
  const candidates = [
    path.join(os.homedir(), 'Downloads', 'platform-tools-latest-windows', 'platform-tools', 'adb.exe'),
    path.join(os.homedir(), 'Downloads', 'platform-tools', 'adb.exe'),
    'adb',
  ];
  for (const c of candidates) {
    try {
      execFileSync(c, ['version'], { stdio: 'ignore' });
      return c;
    } catch { /* try next */ }
  }
  throw new Error('adb not found. Pass --adb <path>.');
}

const ADB = findAdb();

// ── adb helpers ─────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function adb(...args) {
  return execFileSync(ADB, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
}

function tap(x, y) {
  adb('shell', 'input', 'tap', String(Math.round(x)), String(Math.round(y)));
}

function swipeUp() {
  // Content moves DOWN the screen, revealing older messages above.
  adb('shell', 'input', 'swipe', '360', '500', '360', '1400', '280');
}

function back() {
  adb('shell', 'input', 'keyevent', '4');
}

function screenSize() {
  const out = adb('shell', 'wm', 'size');
  const m = /(\d+)x(\d+)/.exec(out);
  return m ? { w: Number(m[1]), h: Number(m[2]) } : { w: 720, h: 1600 };
}

const { w: SCREEN_W } = screenSize();

/** Dumps the current UI and returns parsed nodes. */
function dumpNodes() {
  adb('shell', 'uiautomator', 'dump', '/sdcard/_wadump.xml');
  const xml = adb('exec-out', 'cat', '/sdcard/_wadump.xml');
  const nodes = [];
  for (const m of xml.matchAll(/<node\b[^>]*>/g)) {
    const n = m[0];
    const attr = (k) => {
      const r = new RegExp(`${k}="([^"]*)"`).exec(n);
      return r ? decodeEntities(r[1]) : '';
    };
    const b = /bounds="\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]"/.exec(n);
    if (!b) continue;
    nodes.push({
      text: attr('text'),
      desc: attr('content-desc'),
      cls: attr('class'),
      clickable: /clickable="true"/.test(n),
      x1: +b[1], y1: +b[2], x2: +b[3], y2: +b[4],
      get cx() { return (this.x1 + this.x2) / 2; },
      get cy() { return (this.y1 + this.y2) / 2; },
    });
  }
  return nodes;
}

function decodeEntities(s) {
  return s
    .replace(/&#10;/g, '\n')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

// ── Chat list ───────────────────────────────────────────────────────────────
/**
 * Finds tappable chat rows on the home screen. WhatsApp exposes the avatar as a
 * node whose content-desc ends with "picture" / "group profile icon"; its
 * vertical centre is the row centre, which is far more stable than guessing.
 */
function readChatRows() {
  const nodes = dumpNodes();
  const rows = [];
  const seen = new Set();

  for (const n of nodes) {
    if (!/picture$|group profile icon$/.test(n.desc)) continue;
    if (n.y1 < 250) continue; // skip the toolbar
    const rowY = n.cy;
    if (seen.has(Math.round(rowY))) continue;
    seen.add(Math.round(rowY));

    // The title is the topmost text node sitting beside the avatar. Taking the
    // topmost (rather than the vertically closest) matters: the message preview
    // sits below it and is what a centre-match tends to grab.
    const beside = nodes
      .filter(
        (t) =>
          t.text &&
          t.text.trim() &&
          t.x1 > n.x2 - 4 &&
          t.x1 < SCREEN_W - 60 &&
          t.y1 >= n.y1 - 8 &&
          t.y2 <= n.y2 + 8
      )
      .sort((a, b) => a.y1 - b.y1);

    const fallback = n.desc
      .replace(/,\s*(group profile icon|profile picture|picture)\s*$/i, '')
      .replace(/\s+(picture|group profile icon)$/i, '')
      .replace(/,\s*$/, '')
      .trim();

    rows.push({
      y: rowY,
      name: beside.length ? beside[0].text.trim() : fallback,
    });
  }

  rows.sort((a, b) => a.y - b.y);
  return rows;
}

/**
 * Collects chat rows, scrolling the list when the caller needs more than one
 * screenful. Returns unique rows in list order (most recent first).
 */
async function collectChatRows(limit) {
  const rows = [];
  const seen = new Set();

  const absorb = () => {
    for (const r of readChatRows()) {
      const key = r.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push(r);
    }
  };

  absorb();
  // ~5 rows per screen on a 720x1600 device; scroll at most a few pages.
  for (let page = 0; page < 8 && rows.length < limit; page++) {
    adb('shell', 'input', 'swipe', '360', '1250', '360', '450', '300');
    await sleep(SETTLE);
    absorb();
  }

  return rows.slice(0, limit);
}

/**
 * Finds a chat by name, scrolling the list if needed, and opens it. Working by
 * name instead of a remembered y coordinate means a stale row position can
 * never send a tap into the wrong chat.
 */
async function openChatByName(name) {
  const target = name.toLowerCase();
  for (let page = 0; page < 8; page++) {
    const hit = readChatRows().find((r) => r.name.toLowerCase() === target);
    if (hit) {
      tap(SCREEN_W * 0.45, hit.y);
      await sleep(1800);
      return true;
    }
    adb('shell', 'input', 'swipe', '360', '1250', '360', '450', '300');
    await sleep(SETTLE);
  }
  return false;
}

// ── Message extraction ──────────────────────────────────────────────────────
const METADATA = [
  /^\d{1,2}:\d{2}(\s*[ap]\.?m\.?)?$/i,
  /^(read|seen|delivered|sent|pending|failed)$/i,
  /^(forwarded|edited|read more)$/i,
  /^(today|yesterday)$/i,
  /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,
  /^(you|typing…?|your status)$/i,
  /^(online|last seen.*)$/i,
  // Day separators: "October 15, 2026"
  /^(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},\s+\d{4}$/i,
  /^\d{1,2}\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}$/i,
  // System / call rows
  /^(missed voice call|missed video call|voice call|video call)$/i,
  /^(messages and calls are end-to-end encrypted.*)$/i,
];

function isMetadata(text) {
  const t = text.trim();
  if (!t) return true;
  if (METADATA.some((re) => re.test(t))) return true;
  if (/^[^\p{L}\p{N}]+$/u.test(t)) return true; // pure punctuation / emoji-only chrome
  return false;
}

/**
 * Pulls message bodies out of one screenful.
 *
 * `is_me` is decided by the RIGHT edge, not the centre: WhatsApp always pushes
 * outgoing bubbles flush against the right margin, while incoming bubbles stop
 * short of it. A long incoming message can span nearly the full width, so a
 * centre-of-screen test misreads it as outgoing — the right-edge test does not.
 */
function readMessages() {
  const nodes = dumpNodes();
  const msgs = [];
  const RIGHT_MARGIN = SCREEN_W * 0.88;

  for (const n of nodes) {
    if (!n.text || !n.text.trim()) continue;
    if (n.y1 < 175 || n.y2 > 1380) continue;        // toolbar / composer
    const width = n.x2 - n.x1;
    if (width < 70) continue;                        // avatars, ticks, labels

    let text = n.text.trim();
    // Long bubbles are truncated by the UI; drop the affordance so it never
    // ends up in the training corpus as real words.
    text = text.replace(/\s*Read more$/i, '').trim();
    if (isMetadata(text)) continue;

    msgs.push({
      text,
      isMe: n.x2 >= RIGHT_MARGIN,
      y1: n.y1,
      y2: n.y2,
      x1: n.x1,
      x2: n.x2,
    });
  }

  // Drop duplicate renderings of the same bubble (nested text nodes / quoted chips).
  const out = [];
  for (const m of msgs) {
    const dup = out.find((o) => o.text === m.text && Math.abs(o.y1 - m.y1) < 8 && o.isMe === m.isMe);
    if (!dup) out.push(m);
  }
  out.sort((a, b) => a.y1 - b.y1);
  return out;
}

// ── Harvest one chat ────────────────────────────────────────────────────────
async function harvestChat(chat) {
  const collected = [];
  let emptyStreak = 0;

  for (let screen = 0; screen < MAX_SCREENS; screen++) {
    const batch = readMessages();
    let added = 0;

    for (const m of batch) {
      // Consecutive screens overlap heavily, so a message we already took will
      // reappear at a different y. Compare against the last 40 collected entries
      // by text+side: that kills the overlap without collapsing genuinely
      // repeated short replies that sit further apart in the conversation.
      const window = collected.slice(-40);
      if (window.some((o) => o.text === m.text && o.isMe === m.isMe)) continue;

      collected.push(m);
      added++;
    }

    if (added === 0) {
      emptyStreak++;
      if (emptyStreak >= 3) break;   // three screens with nothing new = top reached
    } else {
      emptyStreak = 0;
    }

    swipeUp();
    await sleep(SETTLE);
  }

  return collected;
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`[harvest] adb: ${ADB}`);
  const devices = adb('devices');
  if (!/device\s*$/m.test(devices.replace(/\r/g, ''))) {
    throw new Error('No Android device in "device" state. Check USB debugging authorisation.');
  }

  adb('shell', 'am', 'start', '-n', 'com.whatsapp.w4b/com.whatsapp.Main');
  await sleep(2500);

  const rows = await collectChatRows(CHAT_LIMIT);
  if (rows.length === 0) throw new Error('No chats found on screen. Is the chat list visible?');

  // collectChatRows scrolls the list to discover more chats; return to the top
  // so openChatByName starts from the most recent chat rather than mid-list.
  for (let i = 0; i < 9; i++) {
    adb('shell', 'input', 'swipe', '360', '450', '360', '1250', '250');
    await sleep(220);
  }
  await sleep(SETTLE);

  const targets = rows;
  console.log(`[harvest] ${targets.length} chats queued:`);
  for (const t of targets) console.log(`  - ${t.name}`);

  if (DRY_RUN) return 0;

  const turns = [];
  for (const [i, t] of targets.entries()) {
    process.stdout.write(`[harvest] (${i + 1}/${targets.length}) ${t.name} ... `);
    try {
      const opened = await openChatByName(t.name);
      if (!opened) {
        process.stdout.write('skipped (row not found)\n');
        continue;
      }

      const msgs = await harvestChat(t);
      for (const m of msgs) {
        turns.push({
          chat: t.name,
          sender: m.isMe ? 'You' : t.name,
          timestamp: null,
          text: m.text,
          is_me: m.isMe,
          source: 'device:uiautomator',
        });
      }
      process.stdout.write(`${msgs.length} messages\n`);

      back();
      await sleep(1200);
    } catch (err) {
      process.stdout.write(`FAILED (${err.message})\n`);
      try { back(); } catch { /* ignore */ }
      await sleep(1200);
    }
  }

  // The harvest runs newest→oldest within a chat; reverse so the file reads in
  // conversation order, which the profiler's few-shot pairing relies on.
  turns.reverse();

  const outPath = path.resolve(OUT);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(
    outPath,
    turns.map((t) => JSON.stringify(t)).join('\n') + (turns.length ? '\n' : ''),
    'utf8'
  );

  const mine = turns.filter((t) => t.is_me).length;
  console.log(`\n[harvest] Wrote ${turns.length} messages (${mine} mine) -> ${outPath}`);
  if (mine === 0) console.log('[harvest] WARNING: no outgoing bubbles captured — nothing to profile.');
  return 0;
}

main().then(
  (code) => process.exit(code || 0),
  (err) => {
    console.error('[harvest] FATAL:', err.message);
    process.exit(1);
  }
);
