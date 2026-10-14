/**
 * src/antiban.js
 * Anti-Ban & Human Emulation Layer for God's Virtue
 * 
 * Implements non-linear delays, proportional typing states, read receipt
 * simulation, and rate-limiting to mimic authentic WhatsApp human behavior.
 */

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const randomDelay = (min = 2500, max = 6500) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Calculates typing time proportional to message length
 * Based on realistic mobile typing speed (~35 to 55 words per minute)
 */
export const calculateTypingTime = (text = '', wpm = 45) => {
  const words = text.trim().split(/\s+/).length || 1;
  const msPerWord = (60 / Math.max(wpm, 20)) * 1000;
  const rawTime = words * msPerWord * 0.55; // Accelerated reading/typing factor
  // Clamp between 2.5s and 9.5s so chats remain engaging without freezing
  return Math.min(Math.max(Math.floor(rawTime), 2500), 9500);
};

// Rate limiter state: Map<jid, Array<timestamp>>
const rateLimitMap = new Map();

/**
 * Enforces per-chat rate limiting to prevent spam detection
 */
export const checkRateLimit = (jid, limitPerMinute = 5) => {
  const now = Date.now();
  const windowMs = 60 * 1000;

  if (!rateLimitMap.has(jid)) {
    rateLimitMap.set(jid, [now]);
    return { allowed: true };
  }

  const timestamps = rateLimitMap.get(jid).filter((t) => now - t < windowMs);
  if (timestamps.length >= limitPerMinute) {
    const oldest = timestamps[0];
    const waitSeconds = Math.ceil((windowMs - (now - oldest)) / 1000);
    return { allowed: false, waitSeconds };
  }

  timestamps.push(now);
  rateLimitMap.set(jid, timestamps);
  return { allowed: true };
};

/**
 * Simulates human presence:
 * 1. Random reaction jitter (simulates human picking up phone)
 * 2. Mark message as read
 * 3. Send "composing" (typing...) presence update
 * 4. Maintain typing state for natural duration
 * 5. Pause typing and release message
 */
export async function simulateHumanPresence(sock, jid, messageKey, text, config = {}) {
  const minDelay = config.min_delay_ms || 2500;
  const maxDelay = config.max_delay_ms || 6500;
  const wpm = config.wpm_typing_speed || 45;

  // 1. Initial reaction delay (human reading the incoming text)
  const initialDelay = randomDelay(minDelay, maxDelay);
  await sleep(initialDelay);

  try {
    // 2. Mark message as read (blue ticks)
    if (messageKey) {
      await sock.readMessages([messageKey]);
    }

    // 3. Subscribe to presence and broadcast "typing..."
    await sock.presenceSubscribe(jid);
    await sock.sendPresenceUpdate('composing', jid);

    // 4. Wait realistic typing duration based on text length
    const typingDuration = calculateTypingTime(text, wpm);
    await sleep(typingDuration);

    // 5. Briefly pause typing right before sending
    await sock.sendPresenceUpdate('paused', jid);
    await sleep(randomDelay(300, 700));

    return {
      jitterMs: initialDelay,
      typingMs: typingDuration,
    };
  } catch (err) {
    console.warn('[antiban] Presence update warning (non-fatal):', err.message);
    return { jitterMs: initialDelay, typingMs: 0 };
  }
}

/**
 * Naturalizes text: removes AI cliches and disclaimers to preserve authentic human voice
 */
export function sanitizeHumanResponse(text = '') {
  let cleaned = text
    .replace(/^As an AI( language model)?[,\.]?\s*/i, '')
    .replace(/^I am an AI assistant[,\.]?\s*/i, '')
    .replace(/\*\*\*+/g, '') // remove excessive markdown asterisks
    .replace(/\n{3,}/g, '\n\n') // normalize excessive newlines
    .trim();

  return cleaned;
}
