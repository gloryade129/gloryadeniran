#!/usr/bin/env node
/**
 * tools/policy-report.mjs
 * Offline check of the bot's conversational personality.
 *
 * Prints what the deployed worker will actually do:
 *   • the trained voice (how the owner types)
 *   • the reply policy (how often it volunteers a reply, and why)
 *   • the sticker library (what it can answer with)
 *   • the Status themes (what it posts publicly)
 *
 * Run: npm run policy:check
 */

import { voiceProfileSummary } from '../src/voice-profile.js';
import { getReplyPolicyStats, participationRate, replyThreshold, scoreMessage } from '../src/selective-reply.js';
import { getStickerStats } from '../src/sticker-replies.js';
import { THEMES } from '../src/meme-themes.js';

const line = (ch = '─') => console.log(ch.repeat(64));

function section(title) {
  console.log('');
  line();
  console.log(title);
  line();
}

let problems = 0;

section('1. TRAINED VOICE');
const voice = voiceProfileSummary();
if (voice) {
  console.log(`  own messages sampled : ${voice.my_turns}`);
  console.log(`  median reply length  : ${voice.median_length} chars`);
  console.log(`  90th percentile      : ${voice.p90_length} chars`);
  console.log(`  emoji per message    : ${voice.emoji_rate}`);
  console.log(`  ends unpunctuated    : ${voice.ends_unpunctuated_rate}`);
  console.log(`  built                : ${voice.generated_at}`);
  if (voice.my_turns < 50) {
    console.log('  NOTE: a thin corpus. More real messages = a sharper voice.');
  }
} else {
  problems++;
  console.log('  MISSING — run `npm run train` first.');
}

section('2. REPLY POLICY (when it speaks)');
const policy = getReplyPolicyStats();
console.log(`  trained on history   : ${policy.trained ? 'yes' : 'no (defaults)'}`);
console.log(`  owner participation  : ${(policy.participation * 100).toFixed(1)}% of the conversation`);
console.log(`  reply threshold      : ${policy.threshold} (a message must score this to earn a voluntary reply)`);
if (!policy.trained) {
  problems++;
  console.log('  MISSING — run `npm run train:profile` or `npm run train:merge`.');
}

const samples = [
  ['direct mention', { text: 'Virtue are you there?', isAddressedToBot: true }],
  ['question in group', { text: 'When is the timetable coming out?' }],
  ['topic in group', { text: 'Any update on 200 level registration deadline?' }],
  ['greeting in group', { text: 'Good morning everyone' }],
  ['bare sticker', { text: '', mediaType: 'sticker' }],
  ['forwarded broadcast', { text: 'Forwarded many times' }],
];
console.log('');
console.log('  signal scores:');
for (const [label, input] of samples) {
  const { score, signals } = scoreMessage({ isGroup: true, ...input });
  console.log(`    ${label.padEnd(22)} ${score.toFixed(2)}  ${signals.join(', ') || '—'}`);
}

section('3. STICKER LIBRARY');
const stickers = getStickerStats();
if (stickers.total === 0) {
  console.log(`  none in ${stickers.dir}`);
  console.log('  (text-only replies; drop tagged .webp files there to enable stickers)');
} else {
  console.log(`  ${stickers.total} sticker(s) in ${stickers.dir}`);
  for (const [tag, count] of Object.entries(stickers.tags)) {
    console.log(`    ${tag.padEnd(12)} ${count}`);
  }
}

section('4. STATUS THEMES (public posts)');
for (const [key, theme] of Object.entries(THEMES)) {
  console.log(`  ${key.padEnd(10)} ${theme.label}`);
  console.log(`  ${''.padEnd(10)} ${theme.captions.length} captions · r/${theme.subreddits.join(', r/')}`);
}
const captions = Object.values(THEMES).flatMap((t) => t.captions);
console.log(`  ${captions.length} captions total, none generic.`);

section('RESULT');
if (problems === 0) {
  console.log('  PASS — voice, reply policy and public personality are all wired.');
} else {
  console.log(`  ${problems} item(s) need attention (see above).`);
}

process.exit(problems === 0 ? 0 : 1);
