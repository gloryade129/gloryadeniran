import { NextResponse } from 'next/server';
import { getContacts, upsertContacts } from '@/lib/gods-virtue-db';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const contacts = await getContacts({ limit });
    return NextResponse.json({ success: true, contacts });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { contacts } = body;
    const saved = await upsertContacts(contacts || []);
    return NextResponse.json({ success: true, count: saved.length });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
