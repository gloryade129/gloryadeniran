import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { systemPrompt, userMessage, temperature = 0.7 } = await req.json();

    if (!userMessage?.trim()) {
      return NextResponse.json({ error: 'Message cannot be empty.' }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (geminiKey) {
      try {
        // Call Google Gemini API (v1beta)
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: userMessage }]
              }
            ],
            systemInstruction: {
              parts: [{ text: systemPrompt || 'You are God\'s Virtue, a wise, warm, uplifting AI assistant.' }]
            },
            generationConfig: {
              temperature: Number(temperature) || 0.7,
              maxOutputTokens: 600,
            }
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (replyText) {
            return NextResponse.json({ success: true, reply: replyText, source: 'gemini-live' });
          }
        }
      } catch (geminiErr) {
        console.warn('[test-prompt] Gemini live call failed, falling back to simulated engine:', geminiErr.message);
      }
    }

    // Realistic persona simulation fallback for prompt playground
    const sampleReplies = [
      `Peace be with you. In every step of life, patience and steady faith open doors that rushing never could. How can I walk with you through this today?`,
      `That is a wonderful question. Wisdom teaches us to guard our hearts with diligence, because out of it spring the issues of life. Let us tackle this with clarity and peace.`,
      `Hello. I hear you completely. Remember that grace is not just about forgiving mistakes—it is also about giving ourselves room to grow one day at a time.`,
    ];
    const reply = sampleReplies[Math.floor(Math.random() * sampleReplies.length)];

    return NextResponse.json({
      success: true,
      reply: `[Simulated Preview - Configure GEMINI_API_KEY for live output]:\n\n${reply}`,
      source: 'simulated'
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
