/**
 * Tests for the multi-provider AI transport and router.
 * Run with: npm test
 *
 * These lock in the behaviour the owner asked for:
 *   • Groq is tried first, then Gemini, then Cloudflare.
 *   • One exhausted/retired model never blocks the next provider.
 *   • A total failure stays silent unless every provider is genuinely out of quota.
 */

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyHttpFailure,
  trimMessages,
  providerConfigured,
  groqChat,
  groqTranscribe,
  cloudflareChat,
  __resetProviderState,
} from '../src/ai-providers.js';
import { generateResponse, generateTextAcrossProviders } from '../src/ai-engine.js';

const realFetch = globalThis.fetch;
const envSnapshot = { ...process.env };

let calls = [];

function mockFetch(handler) {
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return handler(String(url), options);
  };
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  __resetProviderState();
  calls = [];
  delete process.env.GROQ_API_KEY;
  delete process.env.GROQ_KEY;
  delete process.env.CLOUDFLARE_API_TOKEN;
  delete process.env.CLOUDFLARE_ACCOUNT_ID;
  delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_API_KEY;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  for (const key of Object.keys(process.env)) {
    if (!(key in envSnapshot)) delete process.env[key];
  }
  Object.assign(process.env, envSnapshot);
});

test('HTTP failures are classified as quota, retired, or ordinary', () => {
  assert.deepEqual(classifyHttpFailure(429, 'rate limit exceeded'), {
    quotaError: true,
    gone: false,
    retryDelayMs: 0,
  });
  assert.equal(classifyHttpFailure(404, 'no such model').gone, true);
  assert.equal(classifyHttpFailure(500, 'boom').quotaError, false);
  assert.equal(classifyHttpFailure(500, 'boom').gone, false);
});

test('provider availability follows the configured environment', () => {
  assert.equal(providerConfigured('groq'), false);
  process.env.GROQ_API_KEY = 'gsk_test';
  assert.equal(providerConfigured('groq'), true);

  assert.equal(providerConfigured('cloudflare'), false);
  process.env.CLOUDFLARE_API_TOKEN = 'cf_test';
  process.env.CLOUDFLARE_ACCOUNT_ID = 'account';
  assert.equal(providerConfigured('cloudflare'), true);
});

test('Groq chat returns the completion text', async () => {
  process.env.GROQ_API_KEY = 'gsk_test';
  mockFetch(() => jsonResponse({ choices: [{ message: { content: 'Hello, Boss.' } }] }));

  const result = await groqChat({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: 'hi' }],
  });

  assert.equal(result.text, 'Hello, Boss.');
  assert.equal(result.quotaError, false);
  assert.match(calls[0].url, /api\.groq\.com/);
});

test('Groq quota errors are surfaced without throwing', async () => {
  process.env.GROQ_API_KEY = 'gsk_test';
  mockFetch(() => jsonResponse({ error: { message: 'rate limit exceeded' } }, 429));

  const result = await groqChat({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: 'hi' }],
  });

  assert.equal(result.text, '');
  assert.equal(result.quotaError, true);
});

test('Cloudflare chat reads result.response', async () => {
  process.env.CLOUDFLARE_API_TOKEN = 'cf_test';
  process.env.CLOUDFLARE_ACCOUNT_ID = 'account';
  mockFetch(() => jsonResponse({ success: true, result: { response: 'From Cloudflare.' } }));

  const result = await cloudflareChat({
    model: '@cf/meta/llama-3.1-8b-instruct',
    messages: [{ role: 'user', content: 'hi' }],
  });

  assert.equal(result.text, 'From Cloudflare.');
  assert.match(calls[0].url, /cloudflare\.com\/client\/v4\/accounts\/account\/ai\/run/);
});

test('Groq Whisper transcribes a voice note', async () => {
  process.env.GROQ_API_KEY = 'gsk_test';
  mockFetch(() => jsonResponse({ text: 'Please remind me about the meeting.' }));

  const result = await groqTranscribe({ buffer: Buffer.from('fake-ogg'), mimeType: 'audio/ogg; codecs=opus' });
  assert.equal(result.text, 'Please remind me about the meeting.');
  assert.match(calls[0].url, /audio\/transcriptions/);
});

test('the router uses Groq first when it is configured', async () => {
  process.env.GROQ_API_KEY = 'gsk_test';
  mockFetch(() => jsonResponse({ choices: [{ message: { content: 'Groq here.' } }] }));

  const result = await generateResponse({
    jid: 'router-test@s.whatsapp.net',
    senderName: 'Tester',
    incomingText: 'hello',
  });

  assert.equal(result.text, 'Groq here.');
  assert.equal(result.provider, 'groq');
  assert.equal(result.isAllQuotaExhausted, false);
  assert.match(calls[0].url, /api\.groq\.com/);
});

test('a voice note is transcribed before the reply is generated', async () => {
  process.env.GROQ_API_KEY = 'gsk_test';
  mockFetch((url) => {
    if (url.includes('/audio/transcriptions')) return jsonResponse({ text: 'What is on the timetable tomorrow?' });
    return jsonResponse({ choices: [{ message: { content: 'You have two lectures tomorrow.' } }] });
  });

  const result = await generateResponse({
    jid: 'voice-test@s.whatsapp.net',
    senderName: 'Tester',
    incomingText: '',
    media: { type: 'audio', buffer: Buffer.from('fake-ogg'), mimeType: 'audio/ogg; codecs=opus' },
  });

  assert.equal(result.text, 'You have two lectures tomorrow.');
  const chatCall = calls.find((c) => c.url.includes('/chat/completions'));
  assert.ok(chatCall, 'chat call was made');
  assert.match(chatCall.options.body, /Voice note transcript/);
});

test('all providers out of quota returns the daily notice, not a canned reply', async () => {
  process.env.GROQ_API_KEY = 'gsk_test';
  mockFetch(() => jsonResponse({ error: { message: 'rate limit exceeded' } }, 429));

  const result = await generateResponse({
    jid: 'quota-test@s.whatsapp.net',
    senderName: 'Tester',
    incomingText: 'hello',
  });

  assert.equal(result.isAllQuotaExhausted, true);
  assert.match(result.text, /quota for the day is reached/i);
  assert.equal(calls.length > 0, true);
});

test('a non-quota provider failure stays silent', async () => {
  process.env.GROQ_API_KEY = 'gsk_test';
  mockFetch(() => jsonResponse({ error: { message: 'invalid api key' } }, 401));

  const result = await generateResponse({
    jid: 'silent-provider-test@s.whatsapp.net',
    senderName: 'Tester',
    incomingText: 'hello',
  });

  assert.equal(result.text, '');
  assert.equal(result.isSilent, true);
  assert.equal(result.isAllQuotaExhausted, false);
});

test('trimMessages keeps the system prompt and newest turns', () => {
  const messages = [
    { role: 'system', content: 'system' },
    { role: 'user', content: 'a'.repeat(500) },
    { role: 'assistant', content: 'b'.repeat(500) },
    { role: 'user', content: 'newest' },
  ];
  const trimmed = trimMessages(messages, 600);
  assert.equal(trimmed[0].role, 'system');
  assert.equal(trimmed[trimmed.length - 1].content, 'newest');
});

test('internal text passes fail over from Groq to Cloudflare', async () => {
  process.env.GROQ_API_KEY = 'gsk_test';
  process.env.CLOUDFLARE_API_TOKEN = 'cf_test';
  process.env.CLOUDFLARE_ACCOUNT_ID = 'account';

  mockFetch((url) => {
    if (url.includes('api.groq.com')) {
      return jsonResponse({ error: { message: 'internal server error' } }, 500);
    }
    return jsonResponse({ success: true, result: { response: 'Recap from Cloudflare.' } });
  });

  const text = await generateTextAcrossProviders({
    systemPrompt: 'You are a recap writer.',
    userPrompt: 'Write the recap.',
  });

  assert.equal(text, 'Recap from Cloudflare.');
  assert.ok(calls.some((c) => c.url.includes('api.groq.com')));
  assert.ok(calls.some((c) => c.url.includes('cloudflare.com')));
});
