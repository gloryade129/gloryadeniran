/**
 * Tests for the public Status personality (src/meme-themes.js).
 *
 * The owner asked for Nigerian educational humour and Christian encouragement
 * that "everyone can see". These tests lock the two things that make that safe
 * and on-brand: every caption is non-empty and in-register, and every image
 * source is a wholesome subreddit.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  THEMES,
  pickTheme,
  pickSubreddit,
  buildCaption,
  buildImagePrompt,
  planStatusPost,
  allSubreddits,
} from '../src/meme-themes.js';

test('both requested themes exist', () => {
  assert.ok(THEMES.campus, 'Nigerian educational/campus theme');
  assert.ok(THEMES.faith, 'Christian encouragement theme');
});

test('every theme has captions, prompts and a subreddit', () => {
  for (const [key, theme] of Object.entries(THEMES)) {
    assert.ok(theme.label, `${key} needs a label`);
    assert.ok(theme.captions.length >= 4, `${key} needs a usable caption bank`);
    assert.ok(theme.imagePrompts.length >= 1, `${key} needs at least one image prompt`);
    assert.ok(theme.subreddits.length >= 1, `${key} needs a source subreddit`);
    for (const caption of theme.captions) {
      assert.equal(typeof caption, 'string');
      assert.ok(caption.trim().length > 10, `caption too short in ${key}: "${caption}"`);
    }
  }
});

test('no source subreddit is NSFW or off-brand', () => {
  const banned = /nsfw|gonewild|porn|dankmemes|darkmemes|imgoingtohell/i;
  for (const sub of allSubreddits()) {
    assert.ok(!banned.test(sub), `unsafe subreddit: ${sub}`);
  }
});

test('a deterministic roll always lands on a real theme', () => {
  for (const roll of [0, 0.25, 0.5, 0.75, 0.999]) {
    const { key, theme } = pickTheme(() => roll);
    assert.ok(key in THEMES);
    assert.ok(theme.captions.length > 0);
  }
});

test('campus humour is the dominant theme by weight', () => {
  // Roll across the unit interval and confirm campus wins most of the time.
  let campus = 0;
  for (let i = 0; i < 100; i++) {
    const { key } = pickTheme(() => i / 100);
    if (key === 'campus') campus += 1;
  }
  assert.ok(campus >= 45, `expected campus to dominate, saw ${campus}/100`);
});

test('subreddit and caption selection are always valid', () => {
  for (const roll of [0, 0.5, 0.999]) {
    const theme = THEMES.campus;
    assert.ok(theme.subreddits.includes(pickSubreddit(theme, () => roll)));
    assert.ok(theme.captions.includes(buildCaption(theme, () => roll)));
    assert.ok(theme.imagePrompts.includes(buildImagePrompt(theme, () => roll)));
  }
});

test('a status plan is complete enough to post without any network call', () => {
  const plan = planStatusPost({ rng: () => 0.1 });
  assert.ok(plan.themeKey);
  assert.ok(plan.themeLabel);
  assert.ok(plan.subreddit);
  assert.ok(plan.caption.trim().length > 10);
  assert.ok(plan.imagePrompt.trim().length > 10);
});

test('captions read as this community, not as a generic assistant', () => {
  // Guard against a regression where someone re-adds "Here is your meme!".
  // Word boundaries matter: "someone out THERE IS grateful" is fine.
  const allCaptions = Object.values(THEMES).flatMap((t) => t.captions).join(' ').toLowerCase();
  const banned = [
    /\bas an ai\b/,
    /\bhere is your\b/,
    /\bhere'?s your\b/,
    /\bi hope this helps\b/,
    /\bcertainly\b/,
    /\bgreat question\b/,
    /\bas an assistant\b/,
  ];
  for (const re of banned) {
    assert.ok(!re.test(allCaptions), `generic-assistant phrasing leaked in: ${re}`);
  }
});
