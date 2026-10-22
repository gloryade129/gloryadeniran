/**
 * Tests for sticker support (src/sticker-replies.js).
 *
 * A sticker library is optional, so the contract is: never crash, never send a
 * non-webp, and pick a sticker whose tag actually matches the moment.
 */

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  listStickers,
  classifyMoment,
  pickSticker,
  stickerSendRate,
  getStickerStats,
  resetStickerCache,
} from '../src/sticker-replies.js';

const WEBP_BYTES = Buffer.from('RIFF....WEBPVP8 ', 'binary');

function makeStickerDir(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gv-stickers-'));
  for (const name of files) {
    fs.writeFileSync(path.join(dir, name), WEBP_BYTES);
  }
  return dir;
}

beforeEach(() => {
  resetStickerCache();
});

test('classifyMoment recognises the moods that matter in this community', () => {
  assert.equal(classifyMoment('Amen 🙏'), 'amen');
  assert.equal(classifyMoment('Congratulations, mommy 💃💃'), 'congrats');
  assert.equal(classifyMoment('Thank you so much'), 'thanks');
  assert.equal(classifyMoment('lol that is too funny 😂'), 'laugh');
  assert.equal(classifyMoment('Good morning everyone'), 'greeting');
  assert.equal(classifyMoment('The invoice is attached'), null);
});

test('condolence outranks gratitude so a sad message never gets an amen sticker', () => {
  assert.equal(classifyMoment('Please accept my condolence, God bless you'), 'condolence');
});

test('a missing sticker folder is a valid state, not an error', () => {
  const dir = path.join(os.tmpdir(), 'gv-does-not-exist-' + Date.now());
  const { total } = listStickers({ dir });
  assert.equal(total, 0);
  assert.equal(pickSticker({ text: 'Amen', dir, force: true }), null);
  assert.deepEqual(getStickerStats({ dir }).tags, {});
});

test('stickers are tagged from their filenames', () => {
  const dir = makeStickerDir(['amen__hands.webp', 'congrats__party.webp', 'random.webp']);
  const { byTag, total } = listStickers({ dir });
  assert.equal(total, 3);
  assert.equal(byTag.amen.length, 1);
  assert.equal(byTag.congrats.length, 1);
  assert.equal(byTag.any.length, 1, 'untagged files land in the any bucket');
});

test('non-webp files are ignored — WhatsApp only accepts webp stickers', () => {
  const dir = makeStickerDir(['amen__hands.webp', 'amen__jpeg.jpg', 'amen__gif.gif']);
  assert.equal(listStickers({ dir }).total, 1);
});

test('the chosen sticker matches the mood of the reply', () => {
  const dir = makeStickerDir(['amen__hands.webp', 'congrats__party.webp']);
  const picked = pickSticker({ text: 'Congratulations on your result!', force: true, dir, rng: () => 0 });
  assert.ok(picked);
  assert.equal(picked.tag, 'congrats');
  assert.ok(picked.buffer.length > 0);
});

test('falls back to an untagged sticker when no mood-specific one exists', () => {
  const dir = makeStickerDir(['random.webp']);
  const picked = pickSticker({ text: 'Congratulations!', force: true, dir, rng: () => 0 });
  assert.ok(picked);
  assert.equal(picked.tag, 'any');
});

test('the send rate is learned from the profile and clamped', () => {
  assert.equal(stickerSendRate(null), 0.06);
  assert.equal(stickerSendRate({ media: { sticker_rate: 0.12 } }), 0.12);
  assert.equal(stickerSendRate({ media: { sticker_rate: 5 } }), 0.25, 'clamped down');
  assert.equal(stickerSendRate({ media: { sticker_rate: -1 } }), 0.06, 'invalid falls back');
});

test('without force, a low roll means no sticker is sent', () => {
  const dir = makeStickerDir(['amen__hands.webp']);
  assert.equal(pickSticker({ text: 'Amen', dir, rng: () => 0.99 }), null);
  assert.ok(pickSticker({ text: 'Amen', dir, rng: () => 0.0 }));
});
