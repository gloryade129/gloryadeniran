/**
 * src/ai-engine.js
 * Google Gemini Conversational Intelligence for God's Virtue
 * 
 * Manages multi-turn memory buffers per chat, contextual injection
 * of group sender identities, and dynamic persona synchronization.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { sanitizeHumanResponse } from './antiban.js';

let genAI = null;
const conversationHistories = new Map(); // Map<jid, Array<{ role: 'user' | 'model', parts: [{ text }] }>>

export function initAI(apiKey) {
  if (apiKey) {
    genAI = new GoogleGenerativeAI(apiKey);
    console.log('[ai-engine] Google Gemini AI engine initialized.');
  } else {
    console.warn('[ai-engine] GEMINI_API_KEY not provided. Fallback virtuous response mode will be used.');
  }
}

/**
 * Generates an intelligent, virtuous response for an incoming message
 */
export async function generateResponse({
  jid,
  senderName,
  incomingText,
  isGroup = false,
  groupName = '',
  systemPrompt,
  temperature = 0.7,
}) {
  const effectivePrompt = systemPrompt || `You are "God's Virtue", a wise, articulate, and uplifting AI assistant and WhatsApp group administrator. You converse with genuine Christian virtues, humility, and sound wisdom. You speak like a thoughtful, caring human—never robotic, without sterile disclaimers or walls of asterisks. Keep answers concise, natural, and helpful. STRICT EMOJI POLICY: Do NOT use emojis in your responses unless the administrator explicitly trains or instructs you to use minimal and sensible emojis. In groups, you befriend members, answer questions politely when tagged, and gently maintain order.`;

  // Get or initialize conversation history buffer (keep last 8 turns)
  if (!conversationHistories.has(jid)) {
    conversationHistories.set(jid, []);
  }
  const history = conversationHistories.get(jid);

  // Format message with group context if applicable
  const contextMessage = isGroup
    ? `[Group Member "${senderName}" in "${groupName}"]: ${incomingText}`
    : incomingText;

  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        systemInstruction: effectivePrompt,
        generationConfig: {
          temperature: Number(temperature) || 0.7,
          maxOutputTokens: 650,
        },
      });

      // Prepare conversation payload with history
      const chat = model.startChat({
        history: history.slice(-6),
      });

      const result = await chat.sendMessage(contextMessage);
      const rawResponse = result.response.text();
      const sanitized = sanitizeHumanResponse(rawResponse);

      // Record in memory buffer
      history.push({ role: 'user', parts: [{ text: contextMessage }] });
      history.push({ role: 'model', parts: [{ text: sanitized }] });
      if (history.length > 12) history.splice(0, history.length - 12);

      return sanitized;
    } catch (err) {
      console.error('[ai-engine] Gemini API error, attempting gemini-1.5-flash fallback:', err.message);
      try {
        const fallbackModel = genAI.getGenerativeModel({
          model: 'gemini-1.5-flash',
          systemInstruction: effectivePrompt,
        });
        const result = await fallbackModel.generateContent(contextMessage);
        return sanitizeHumanResponse(result.response.text());
      } catch (fbErr) {
        console.error('[ai-engine] Fallback model also failed:', fbErr.message);
      }
    }
  }

  // Graceful fallback responses without emojis
  const fallbacks = [
    `Peace be with you, ${senderName}. In every season of life, quiet patience and steady faith open doors that rushing never could. How can I walk with you through this today?`,
    `Thank you for reaching out, ${senderName}. Wisdom teaches us to guard our hearts and speak with clarity and kindness. Let us explore this together with peace.`,
    `Hello ${senderName}. That is a thoughtful question. Remember that grace is not just about forgiving others—it is also about giving yourself room to grow one day at a time.`,
  ];

  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

/**
 * Clears conversation memory for a specific chat or group
 */
export function resetConversationHistory(jid) {
  if (conversationHistories.has(jid)) {
    conversationHistories.delete(jid);
  }
}
