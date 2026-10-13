import { NextResponse } from 'next/server';
import { getBotConfig, updateBotConfig, requestPairingCode, toggleKillSwitch, isSupabaseConfigured } from '@/lib/gods-virtue-db';

export async function GET() {
  try {
    const config = await getBotConfig();
    return NextResponse.json({
      success: true,
      config,
      isConfigured: isSupabaseConfigured(),
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'toggle_kill_switch') {
      const updated = await toggleKillSwitch(body.isActive);
      return NextResponse.json({ success: true, config: updated });
    }

    if (action === 'request_pairing_code') {
      const updated = await requestPairingCode(body.phoneNumber);
      return NextResponse.json({ success: true, config: updated, message: 'Pairing code requested. The bot worker will generate your 8-digit code momentarily.' });
    }

    if (action === 'update_status') {
      // Called by worker heartbeat
      const updated = await updateBotConfig({
        is_connected: body.isConnected ?? false,
        pairing_code: body.pairingCode ?? null,
        phone_number: body.phoneNumber ?? null,
        last_heartbeat: new Date().toISOString(),
      });
      return NextResponse.json({ success: true, config: updated });
    }

    return NextResponse.json({ error: 'Unknown action specified.' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
