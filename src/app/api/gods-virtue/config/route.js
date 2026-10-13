import { NextResponse } from 'next/server';
import { getBotConfig, updateBotConfig } from '@/lib/gods-virtue-db';

export async function GET() {
  try {
    const config = await getBotConfig();
    return NextResponse.json({ success: true, config });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const allowedKeys = [
      'bot_name',
      'system_prompt',
      'temperature',
      'min_delay_ms',
      'max_delay_ms',
      'wpm_typing_speed',
      'burst_limit_per_min',
      'auto_reply_dms',
      'group_mention_only',
    ];

    const updates = {};
    for (const key of allowedKeys) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    const updated = await updateBotConfig(updates);
    return NextResponse.json({ success: true, config: updated, message: 'Bot configuration updated successfully.' });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
