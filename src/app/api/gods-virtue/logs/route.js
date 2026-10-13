import { NextResponse } from 'next/server';
import { getAuditLogs, createAuditLog, getViolations } from '@/lib/gods-virtue-db';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const type = searchParams.get('type');

    if (type === 'violations') {
      const violations = await getViolations({ limit });
      return NextResponse.json({ success: true, violations });
    }

    const logs = await getAuditLogs({ limit, filter });
    return NextResponse.json({ success: true, logs });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const created = await createAuditLog(body);
    return NextResponse.json({ success: true, log: created });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
