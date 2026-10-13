import { NextResponse } from 'next/server';
import { getAnnouncements, createAnnouncement } from '@/lib/gods-virtue-db';

export async function GET() {
  try {
    const announcements = await getAnnouncements();
    return NextResponse.json({ success: true, announcements });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { target_group_jid, target_group_name, title, announcement_text, scheduled_at } = body;

    if (!announcement_text?.trim()) {
      return NextResponse.json({ error: 'Announcement message text is required.' }, { status: 400 });
    }

    const created = await createAnnouncement({
      target_group_jid,
      target_group_name,
      title,
      announcement_text,
      scheduled_at,
    });

    return NextResponse.json({ success: true, announcement: created, message: 'Announcement created and queued for broadcast.' });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
