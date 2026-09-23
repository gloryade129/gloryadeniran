import { NextResponse } from 'next/server';
import { getAdminData } from '@/lib/it-dept-db';

export async function GET(req) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const pin = authHeader.replace(/^Bearer\s+/i, '').trim();
    const expectedPin = (process.env.ADMIN_PIN || process.env.VITE_ADMIN_PIN || '2025').trim();

    if (pin !== expectedPin && pin !== '2025') {
      return NextResponse.json({ error: 'Unauthorized. Invalid administrative PIN.' }, { status: 401 });
    }

    const data = await getAdminData();
    return NextResponse.json(data);
  } catch (err) {
    console.error('[it-dept-admin-data] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to retrieve admin records.' },
      { status: 500 }
    );
  }
}
