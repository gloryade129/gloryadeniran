import { NextResponse } from 'next/server';
import { getMonitoredGroups, updateGroupSettings } from '@/lib/gods-virtue-db';

export async function GET() {
  try {
    const groups = await getMonitoredGroups();
    return NextResponse.json({ success: true, groups });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { group_jid, ...settings } = body;

    if (!group_jid) {
      return NextResponse.json({ error: 'group_jid is required.' }, { status: 400 });
    }

    const updated = await updateGroupSettings(group_jid, settings);
    return NextResponse.json({ success: true, group: updated, message: 'Group moderation settings updated.' });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
