/**
 * src/sticker-replies.js
 * Sticker support — the part of a real WhatsApp conversation that text alone
 * never reproduces.
 *
 * A human rarely answers "Amen 🙏" with another sentence; he sends the amen
 * sticker. Sending a sticker after the right text reply is what makes the bot
 * read as a person rather than an auto-responder.
 *
 * Stickers are plain .webp files dropped into `assets/stickers/` (or the folder
 * named by STICKER_DIR). Tag them by naming:
 *
 *     amen__hands-together.webp
 *     greeting__wave.webp
 *     laugh__dead.webp
 *
 * The part before `__` is the moment it belongs to. Untagged files still work —
 * they fall into the `any` bucket and are picked at random.
 *
 * Everything fails soft: no folder, no stickers, no problem — callers just get
 * null and send text only.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');
export const DEFAULT_STICKER_DIR = path.join(REPO_ROOT, 'assets', 'stickers');

const KNOWN_TAGS = [
  'amen', 'pray', 'greeting', 'laugh', 'love', 'congrats', 'thanks',
  'sorry', 'wow', 'yes', 'no', 'party', 'oops',
];

// Order matters: the first match wins, so put the specific moods before the
// generic ones ("thank God" is gratitude, not a greeting).
const MOMENT_RULES = [
  { tag: 'condolence', re: /\b(condolence|rest in peace|rip|my deepest|so sorry for your loss)\b/i },
  { tag: 'congrats', re: /\b(congrats?|congratulations|happy birthday|well done|you did it|God did it)\b/i },
  { tag: 'thanks', re: /\b(thank(s| you| u)|thx|God bless|bless you|i appreciate)\b/i },
  { tag: 'sorry', re: /\b(sorry|my bad|apolog(y|ies)|no vex)\b/i },
  { tag: 'amen', re: /\b(amen|pray(er|ing|ed)?|hallelujah|glory|praise (God|the Lord)|God is good|jesus)\b/i },
  { tag: 'laugh', re: /(😂|🤣|\blol\b|\blmao\b|\bdead\b|too funny|hahaha?)/i },
  { tag: 'love', re: /(❤️|🥰|😍|\blove\b|my love|sweetheart|darling)/i },
  { tag: 'wow', re: /(😮|😲|🤯|\bwow\b|no way|seriously\?|for real)/i },
  { tag: 'greeting', re: /^(hi|hello|hey|good (morning|afternoon|evening)|how far|how are you)/i },
  { tag: 'yes', re: /^(yes|yeah|yep|sure|correct|exactly|true|na so|amen o)\b/i },
  { tag: 'no', re: /^(no|nope|nah|never|not really)\b/i },
  { tag: 'party', re: /(🎉|🥳|💃|party|celebrat)/i },
  { tag: 'oops', re: /(😅|😬|oops|my bad|typo)/i },
];

let dirCache = null;

/** Directory stickers are read from, honouring STICKER_DIR. */
export function stickerDir() {
  return process.env.STICKER_DIR && process.env.STICKER_DIR.trim()
    ? path.resolve(process.env.STICKER_DIR.trim())
    : DEFAULT_STICKER_DIR;
}

function tagFromName(file) {
  const base = path.basename(file, path.extname(file)).toLowerCase();
  const explicit = base.split('__')[0];
  if (explicit !== base && KNOWN_TAGS.includes(explicit)) return explicit;

  for (const tag of KNOWN_TAGS) {
    if (new RegExp(`(^|[^a-z])${tag}([^a-z]|$)`).test(base)) return tag;
  }
  return 'any';
}

/**
 * Lists available stickers, grouped by tag.
 * @returns {{ dir: string, total: number, byTag: Record<string, string[]> }}
 */
export function listStickers({ dir = stickerDir() } = {}) {
  if (dirCache && dirCache.dir === dir) return dirCache;

  const result = { dir, total: 0, byTag: {} };
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (!/\.webp$/i.test(entry.name)) continue; // WhatsApp stickers must be webp
      const full = path.join(dir, entry.name);
      const tag = tagFromName(entry.name);
      (result.byTag[tag] ||= []).push(full);
      result.total += 1;
    }
  } catch {
    // No folder yet — that is a valid state, not an error.
  }

  dirCache = result;
  return result;
}

export function resetStickerCache() {
  dirCache = null;
}

/** Picks the mood a reply belongs to, or null when none fits. */
export function classifyMoment(text) {
  const body = String(text || '').trim();
  if (!body) return null;
  for (const rule of MOMENT_RULES) {
    if (rule.re.test(body)) return rule.tag;
  }
  return null;
}

/**
 * How often the bot should follow a text reply with a sticker.
 * Read from the trained profile when available; 6% otherwise (roughly one in
 * sixteen replies — enough to be noticed, rare enough to stay human).
 */
export function stickerSendRate(profile) {
  const learned = Number(profile?.media?.sticker_rate);
  if (Number.isFinite(learned) && learned >= 0) {
    // Sticker-every-message would look like a bot, so even a measured rate is
    // capped well below the raw number.
    return Math.min(0.25, Math.max(0.01, learned));
  }
  return 0.06;
}

/**
 * Chooses a sticker for a reply.
 *
 * @param {object} opts
 * @param {string} opts.text            the reply the bot is about to send
 * @param {object|null} [opts.profile]  voice profile (for the learned rate)
 * @param {boolean} [opts.force]        skip the probability check
 * @param {() => number} [opts.rng]
 * @param {string} [opts.dir]
 * @returns {{ buffer: Buffer, path: string, tag: string } | null}
 */
export function pickSticker({ text, profile = null, force = false, rng = Math.random, dir = stickerDir() } = {}) {
  const { byTag, total } = listStickers({ dir });
  if (total === 0) return null;

  if (!force && rng() >= stickerSendRate(profile)) return null;

  const moment = classifyMoment(text);
  const specific = moment ? byTag[moment] : null;
  let candidates;
  let tag;

  if (specific?.length) {
    candidates = specific;
    tag = moment;
  } else if (byTag.any?.length) {
    candidates = byTag.any;
    tag = 'any';
  } else {
    // Last resort: any sticker at all, so a sparsely tagged library still works.
    candidates = Object.values(byTag).flat();
    tag = 'any';
  }

  if (!candidates.length) return null;

  const chosen = candidates[Math.floor(rng() * candidates.length) % candidates.length];
  try {
    return { buffer: fs.readFileSync(chosen), path: chosen, tag };
  } catch {
    return null;
  }
}

export function getStickerStats({ dir = stickerDir() } = {}) {
  const { total, byTag } = listStickers({ dir });
  return {
    dir,
    total,
    tags: Object.fromEntries(Object.entries(byTag).map(([tag, files]) => [tag, files.length])),
  };
}
