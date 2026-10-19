/**
 * Tests for the Gemini request builders in src/ai-engine.js.
 * Run with: node --test test/
 *
 * Regression lock for the bug that forced every reply to a canned fallback:
 * the search-grounding `tools` must live at the TOP level of the request, never
 * inside `generationConfig`.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSdkModelOptions,
  buildGeminiRequest,
  buildOwnerProfileContext,
  CANDIDATE_MODELS,
  isQuotaExhaustedError,
  isModelGoneError,
  extractRetryDelayMs,
  scoreChatModel,
  generateResponse,
} from '../src/ai-engine.js';

test('a failed generation stays silent instead of sending a canned reply', async () => {
  // No initAI() here → genAI is null → the model loop is skipped entirely.
  const res = await generateResponse({
    jid: 'silent-test@s.whatsapp.net',
    senderName: 'Tester',
    incomingText: 'hello there, what can you do?',
    isGroup: false,
  });
  assert.equal(res.text, '');
  assert.equal(res.isSilent, true);
  assert.equal(res.isAllQuotaExhausted, false);
  assert.equal(String(res), '');
});

test('model list uses current IDs (no retired 1.5 family, no dead gemini-2.5-pro)', () => {
  assert.ok(CANDIDATE_MODELS.length >= 3);
  assert.equal(CANDIDATE_MODELS.some((m) => m.includes('1.5')), false);
  assert.equal(CANDIDATE_MODELS.includes('gemini-2.5-pro'), false);
  assert.ok(CANDIDATE_MODELS.some((m) => m.startsWith('gemini-3')), 'prefers Gemini 3 models');
  assert.equal(CANDIDATE_MODELS[0], 'gemini-3.8-flash');
});

test('quota errors are recognised', () => {
  assert.equal(isQuotaExhaustedError({ message: '[429 Too Many Requests] You exceeded your current quota' }), true);
  assert.equal(isQuotaExhaustedError({ message: '[404 Not Found] no longer available' }), false);
  assert.equal(isQuotaExhaustedError(null), false);
});

test('retired models are recognised and never retried', () => {
  assert.equal(
    isModelGoneError({ message: '[404 Not Found] models/gemini-2.5-pro is no longer available to new users.' }),
    true
  );
  assert.equal(isModelGoneError({ status: 404, message: 'whatever' }), true);
  assert.equal(isModelGoneError({ message: '[429] quota' }), false);
});

test('retry delay is parsed from the API error so a model can be parked', () => {
  assert.equal(extractRetryDelayMs({ message: '... "retryDelay":"14842s" ...' }), 14842000);
  assert.equal(extractRetryDelayMs({ message: 'Please retry in 4h7m22s.' }), ((4 * 3600 + 7 * 60 + 22) * 1000));
  assert.equal(extractRetryDelayMs({ message: 'plain error' }), 0);
});

test('model ranking prefers newer generations and flash', () => {
  assert.ok(scoreChatModel('gemini-3.8-flash') > scoreChatModel('gemini-2.5-flash'));
  assert.ok(scoreChatModel('gemini-2.5-flash') > scoreChatModel('gemini-2.5-flash-lite'));
  assert.ok(scoreChatModel('gemini-3.5-flash') > scoreChatModel('gemini-3.1-pro-preview'));
});

test('owner profile states the creator is male and how to address him', () => {
  const block = buildOwnerProfileContext({ isOwnerSender: false });
  assert.match(block, /Glory Adeniran/);
  assert.match(block, /MAN/);
  assert.match(block, /"he"\/"him"/);
  assert.match(block, /Boss|Sir/);
  // Not addressing the owner directly, so no "right now" line.
  assert.equal(/replying to right now IS/.test(block), false);
});

test('owner profile adds a direct-address line when the sender is the owner', () => {
  const block = buildOwnerProfileContext({ isOwnerSender: true });
  assert.match(block, /replying to right now IS Glory Adeniran/);
});

test('SDK options keep tools OUT of generationConfig', () => {
  const opts = buildSdkModelOptions({ modelName: 'gemini-2.5-flash', systemInstruction: 'hi', temperature: 0.7, useSearch: true });
  assert.equal('tools' in opts.generationConfig, false, 'generationConfig must not contain tools');
  assert.ok(Array.isArray(opts.tools), 'tools must be a top-level array');
  assert.deepEqual(opts.tools, [{ googleSearch: {} }]);
  assert.equal(opts.generationConfig.temperature, 0.7);
  assert.equal(opts.generationConfig.maxOutputTokens, 600);
});

test('SDK options omit tools entirely when search is disabled', () => {
  const opts = buildSdkModelOptions({ modelName: 'gemini-2.5-flash', useSearch: false });
  assert.equal('tools' in opts, false);
  assert.equal('tools' in opts.generationConfig, false);
});

test('SDK options honour an explicit output-token budget', () => {
  const opts = buildSdkModelOptions({ modelName: 'gemini-2.5-flash', maxOutputTokens: 4096 });
  assert.equal(opts.generationConfig.maxOutputTokens, 4096);
});

test('REST payload keeps tools at the top level with google_search', () => {
  const payload = buildGeminiRequest({ plainText: 'hello', temperature: 0.5, useSearch: true });
  assert.equal('tools' in payload.generationConfig, false, 'generationConfig must not contain tools');
  assert.deepEqual(payload.tools, [{ google_search: {} }]);
  assert.deepEqual(payload.contents, [{ role: 'user', parts: [{ text: 'hello' }] }]);
});

test('REST payload omits tools when search is disabled', () => {
  const payload = buildGeminiRequest({ plainText: 'hello', useSearch: false });
  assert.equal('tools' in payload, false);
});

test('REST payload passes through systemInstruction and multi-turn contents', () => {
  const contents = [
    { role: 'user', parts: [{ text: 'hi' }] },
    { role: 'model', parts: [{ text: 'hello' }] },
    { role: 'user', parts: [{ text: 'now' }] },
  ];
  const payload = buildGeminiRequest({ systemInstruction: 'persona', contents, plainText: 'ignored', useSearch: false });
  assert.deepEqual(payload.systemInstruction, { parts: [{ text: 'persona' }] });
  assert.deepEqual(payload.contents, contents);
});
