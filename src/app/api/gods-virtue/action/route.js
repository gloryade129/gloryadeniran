import { NextResponse } from 'next/server';
import { queueGroupAction, updateGroupSettings } from '@/lib/gods-virtue-db';

export async function POST(req) {
  try {
    const { action, targetJid, payload } = await req.json();

    if (!action) {
      return NextResponse.json({ error: 'Action type is required.' }, { status: 400 });
    }

    if (action !== 'sync_all' && action !== 'sync_contacts' && !targetJid) {
      return NextResponse.json({ error: 'targetJid is required for this action.' }, { status: 400 });
    }

    if (action === 'lock_group') {
      await updateGroupSettings(targetJid, { is_locked: true });
      await queueGroupAction('lock_group', targetJid, payload || {});
      return NextResponse.json({ success: true, message: 'Group locked. Only admins can send messages.' });
    }

    if (action === 'open_group') {
      await updateGroupSettings(targetJid, { is_locked: false });
      await queueGroupAction('open_group', targetJid, payload || {});
      return NextResponse.json({ success: true, message: 'Group opened. All members can now send messages.' });
    }

    if (action === 'sync_all') {
      await queueGroupAction('sync_all', targetJid, payload || {});
      return NextResponse.json({ success: true, message: 'Sync command queued.' });
    }

    const queued = await queueGroupAction(action, targetJid, payload || {});
    return NextResponse.json({ success: true, action: queued });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
