/**
 * src/response-check.js
 * Detects and removes "distilled provider voice" — the tells that prove a reply
 * came straight out of a default assistant persona instead of the trained voice.
 *
 * Two jobs:
 *   1. Judge a reply  → findGenericTells() / isGenericResponse() / voiceFit()
 *   2. Fix it         → enforceVoice()
 *
 * The detector is intentionally conservative: it only fires on phrases that a
 * real person essentially never types in a WhatsApp message (rhetorical scaffolds,
 * service closers, LLM vocabulary). A reply that merely sounds formal is not
 * flagged — only one that sounds like a generic model.
 */

/** Phrases/skeletons that only appear in provider-default output. */
export const GENERIC_TELLS = [
  // Identity leakage
  { id: 'ai-disclaimer', weight: 5, re: /\b(as an ai|i am an ai|i'm an ai|as a language model|as an ai language model)\b/i, reason: 'breaks character by naming itself an AI' },
  { id: 'not-a-robot', weight: 3, re: /\b(i do not have (feelings|emotions)|i cannot (feel|experience))\b/i, reason: 'assistant capability disclaimer' },

  // Service-desk closers
  { id: 'hope-this-helps', weight: 4, re: /\bi hope (this|that) helps\b/i, reason: 'support-desk closer' },
  { id: 'let-me-know', weight: 4, re: /\b(let me know if you (need|have|require)|feel free to (ask|reach out)|don't hesitate to (ask|reach out))\b/i, reason: 'offers further assistance' },
  { id: 'any-other-questions', weight: 4, re: /\b(if you (have|need) (any )?(more|further|other|additional) (questions|assistance|help|information))\b/i, reason: 'support-desk closer' },
  { id: 'happy-to-help', weight: 3, re: /\b(i'?d be (happy|glad) to (help|assist)|i would be (happy|glad) to (help|assist)|happy to help|glad to help)\b/i, reason: 'support-desk opener/closer' },

  // Sycophantic openers
  { id: 'great-question', weight: 4, re: /^\s*(that'?s (a )?(great|excellent|good|fantastic|wonderful) question|great question|excellent question)\b/i, reason: 'sycophantic opener' },
  { id: 'certainly', weight: 3, re: /^\s*(certainly|absolutely|of course|sure thing)\s*[!,.]/i, reason: 'assistant acknowledgement opener' },
  { id: 'i-understand', weight: 2, re: /^\s*i understand (your|that|how)\b/i, reason: 'therapist-style acknowledgement' },

  // Essay scaffolding
  { id: 'in-conclusion', weight: 4, re: /\b(in conclusion|to sum(marise|marize)|in summary|overall,|all in all)\b/i, reason: 'essay conclusion' },
  { id: 'heres-breakdown', weight: 4, re: /\b(here'?s|here is|here are) (a |the )?(breakdown|quick summary|summary|what you need)|let'?s (dive|break) (in|it down)|without further ado\b/i, reason: 'article scaffolding' },
  { id: 'firstly', weight: 2, re: /\b(first(ly)?|second(ly)?|third(ly)?|lastly|moreover|furthermore|additionally|in addition)\b/i, reason: 'numbered-essay connectives' },
  { id: 'important-to-note', weight: 3, re: /\b(it'?s (important|worth) (to note|noting)|it should be noted|please note that)\b/i, reason: 'boilerplate hedging' },
  { id: 'in-todays-world', weight: 4, re: /\b(in today'?s (fast[- ]paced |digital |modern )?world|in the ever[- ]evolving|in an era of)\b/i, reason: 'generic essay opener' },

  // LLM vocabulary
  { id: 'llm-lexicon', weight: 2, re: /\b(delve|tapestry|realm|myriad|plethora|embark|testament to|meticulous(ly)?|multifaceted|holistic|paradigm|synerg(y|ies)|leverage|seamless(ly)?|robust|pivotal|crucial|underscore|foster(ing)?|navigate the complexities|unlock the (full )?potential)\b/i, reason: 'statistically over-represented LLM vocabulary' },

  // Formatting leakage (WhatsApp is not a document)
  { id: 'md-heading', weight: 4, re: /^\s*#{1,6}\s+\S/m, reason: 'markdown heading in a chat message' },
  { id: 'md-bold', weight: 2, re: /\*\*[^*\n]+\*\*/, reason: 'markdown bold instead of WhatsApp *bold*' },
  { id: 'md-bullets', weight: 4, re: /^\s*[-*•]\s+\S/m, reason: 'bullet list in a chat message' },
  { id: 'md-numbered', weight: 4, re: /^\s*\d+[.)]\s+\S/m, reason: 'numbered list in a chat message' },
  { id: 'md-hr', weight: 3, re: /^\s*(---|___|\*\*\*)\s*$/m, reason: 'horizontal rule in a chat message' },
  { id: 'emoji-headers', weight: 3, re: /(^|\n)\s*(✨|🌙|💡|🎯|📌|🚀|✅|🔹|👉)\s*/u, reason: 'decorative emoji header' },
];

/** Banned outright — a hit here makes a reply unusable regardless of score. */
export const HARD_FAIL = new Set(['ai-disclaimer', 'md-heading', 'md-hr']);

export const GENERIC_THRESHOLD = 4;

/**
 * @returns {{score:number, hits:Array<{id,weight,reason,match}>, hardFail:boolean}}
 */
export function findGenericTells(text = '') {
  if (typeof text !== 'string' || !text.trim()) {
    return { score: 0, hits: [], hardFail: false };
  }

  const hits = [];
  let score = 0;
  let hardFail = false;

  for (const tell of GENERIC_TELLS) {
    const m = tell.re.exec(text);
    if (!m) continue;
    hits.push({ id: tell.id, weight: tell.weight, reason: tell.reason, match: m[0] });
    score += tell.weight;
    if (HARD_FAIL.has(tell.id)) hardFail = true;
  }

  return { score, hits, hardFail };
}

/** True when the reply reads like default provider output rather than a person. */
export function isGenericResponse(text, { threshold = GENERIC_THRESHOLD } = {}) {
  const { score, hardFail } = findGenericTells(text);
  return hardFail || score >= threshold;
}

/**
 * Compares a reply against the trained profile and returns concrete mismatches.
 *
 * @param {string} text
 * @param {object|null} profile  style_profile.json contents
 * @returns {{score:number, issues:string[]}} score 0..1, 1 = perfect fit
 */
export function voiceFit(text = '', profile = null) {
  const issues = [];
  if (!profile || typeof text !== 'string') return { score: 1, issues };

  const p90 = Number(profile.length?.p90) || 0;
  const hardCap = Math.max(120, p90 * 2);
  const len = text.trim().length;
  if (p90 && len > hardCap) {
    issues.push(`too long (${len} chars vs ${p90} typical)`);
  }

  const lines = text.split('\n').filter((l) => l.trim()).length;
  const typicalLines = Math.max(1, Math.round(profile.lines?.mean || 1));
  if (lines > typicalLines + 2) {
    issues.push(`${lines} lines where you usually send ${typicalLines}`);
  }

  if (profile.emoji?.messages_with_emoji_rate === 0) {
    const emojiCount = [...text.matchAll(/\p{Extended_Pictographic}/gu)].length;
    if (emojiCount > 0) issues.push('used emoji where your history has none');
  } else if (profile.emoji?.messages_with_emoji_rate != null && profile.emoji.messages_with_emoji_rate < 0.2) {
    const emojiCount = [...text.matchAll(/\p{Extended_Pictographic}/gu)].length;
    if (emojiCount > 2) issues.push(`${emojiCount} emoji where you rarely use any`);
  }

  for (const hit of findGenericTells(text).hits) {
    issues.push(hit.reason);
  }

  // Each issue costs 0.25; floor at 0.
  const score = Math.max(0, 1 - issues.length * 0.25);
  return { score, issues };
}

/** Strips markdown scaffolding lines and collapses the wreckage. */
function stripScaffolding(text) {
  return text
    .split('\n')
    .filter((line) => {
      if (/^\s*#{1,6}\s+\S/.test(line)) return false;          // headings
      if (/^\s*(---|___|\*\*\*)\s*$/.test(line)) return false;  // rules
      return true;
    })
    .map((line) => line.replace(/^\s*[-*•]\s+/, '').replace(/^\s*\d+[.)]\s+/, '')) // flatten list markers
    .map((line) => line.replace(/^\s*(?:✨|🌙|💡|🎯|📌|🚀|✅|🔹|🔸|👉|▪️)\uFE0F?\s*/u, '')) // drop decorative header emoji
    .map((line) => line.replace(/\*\*([^*\n]+)\*\*/g, '$1').replace(/__([^_\n]+)__/g, '$1')) // **bold** -> plain
    .join('\n');
}

/** Lines that are pure article scaffolding with no content of their own. */
const SCAFFOLD_LINE = /^\s*(here'?s|here is|here are)\b.*\b(breakdown|quick summary|summary|what you need)\b|^\s*(let'?s (dive|break) (in|it down)|without further ado|bottom line)\b/i;

/** Drops whole sentences that only exist as assistant boilerplate. */
function stripBoilerplateSentences(text) {
  const KILL = [
    /\bas an ai\b[^.!?\n]*[.!?]?/i,
    /\bi hope (this|that) helps[^.!?\n]*[.!?]?/i,
    /\b(i'?d be (happy|glad) to (help|assist)|i would be (happy|glad) to (help|assist)|happy to help|glad to help)[^.!?\n]*[.!?]?/i,
    /\b(let me know if you (need|have|require)[^.!?\n]*|feel free to (ask|reach out)[^.!?\n]*|don'?t hesitate to[^.!?\n]*)[.!?]?/i,
    /\b(if you (have|need) (any )?(more|further|other|additional) (questions|assistance|help|information)[^.!?\n]*)[.!?]?/i,
    /^\s*(that'?s )?(a )?(great|excellent|good|fantastic|wonderful) question[!.,]?\s*/i,
    /\b(certainly|absolutely|of course|sure thing)\s*[!,.]\s*/i,
    /\b(in conclusion|to sum(marise|marize)|in summary)[,:]?\s*/i,
    /\b(here'?s|here is|here are) (a |the )?(breakdown|quick summary|summary|what you need) of [^.!?\n]*[.!?]?/i,
    /\b(it'?s (important|worth) (to note|noting) that|please note that)\b\s*/i,
  ];
  let out = text;
  for (const re of KILL) out = out.replace(re, '');
  return out;
}

/**
 * Best-effort rewrite into the trained voice. Deliberately light-touch: it
 * removes tells and enforces the size/emoji budget, but never paraphrases, so
 * the model's actual answer survives.
 *
 * @returns {{text:string, changed:boolean, removed:string[]}}
 */
export function enforceVoice(text = '', profile = null, { maxEmoji = 1 } = {}) {
  if (typeof text !== 'string' || !text.trim()) {
    return { text: '', changed: false, removed: [] };
  }

  const removed = findGenericTells(text).hits.map((h) => h.id);
  let out = stripScaffolding(text);
  out = out
    .split('\n')
    .filter((line) => !SCAFFOLD_LINE.test(line))
    .join('\n');
  out = stripBoilerplateSentences(out);

  // Guarantee a single space after sentence removal, then tidy punctuation runs.
  out = out
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([,.!?])/g, '$1')
    .replace(/^[\s,;:]+/, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Last resort: if the reply still trips the detector, drop the offending
  // lines rather than shipping provider boilerplate to a real contact.
  if (isGenericResponse(out)) {
    const kept = out.split('\n').filter((line) => line.trim() && !isGenericResponse(line));
    if (kept.length > 0) {
      out = kept.join('\n').trim();
      removed.push('dropped-generic-lines');
    }
  }

  // Emoji budget, kept consistent with the trained profile.
  const rate = profile?.emoji?.messages_with_emoji_rate;
  const budget = rate === 0 ? 0 : maxEmoji;
  const found = [...out.matchAll(/\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/gu)];
  if (found.length > budget) {
    let kept = 0;
    out = out.replace(/\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/gu, (m) => {
      if (kept < budget) { kept++; return m; }
      return '';
    });
    out = out.replace(/[ \t]{2,}/g, ' ').replace(/\s+([,.!?])/g, '$1').trim();
  }

  // Length ceiling: cut at a sentence boundary rather than mid-word.
  const p90 = Number(profile?.length?.p90) || 0;
  const hardCap = p90 ? Math.max(180, p90 * 2) : 0;
  if (hardCap && out.length > hardCap) {
    const clipped = out.slice(0, hardCap);
    const cut = Math.max(clipped.lastIndexOf('. '), clipped.lastIndexOf('? '), clipped.lastIndexOf('! '), clipped.lastIndexOf('\n'));
    out = (cut > hardCap * 0.5 ? clipped.slice(0, cut + 1) : clipped).trim();
    removed.push('over-length');
  }

  return { text: out, changed: out !== text.trim(), removed };
}
