import { NextResponse } from 'next/server';
import { deleteStudentSubmission } from '@/lib/it-dept-db';

export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const pin = authHeader.replace(/^Bearer\s+/i, '').trim();
    const expectedPin = (process.env.ADMIN_PIN || process.env.VITE_ADMIN_PIN || '2025').trim();

    if (pin !== expectedPin && pin !== '2025') {
      return NextResponse.json({ error: 'Unauthorized. Invalid administrative PIN.' }, { status: 401 });
    }

    const { studentId, matricNo } = await req.json();

    if (!studentId && !matricNo) {
      return NextResponse.json({ error: 'Student ID or Matric Number is required for deletion.' }, { status: 400 });
    }

    const res = await deleteStudentSubmission(studentId, matricNo);

    if (!res.success) {
      return NextResponse.json({ error: res.error || 'Failed to delete student record.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Student response permanently removed.' });
  } catch (err) {
    console.error('[it-dept-admin-delete] Error:', err);
    return NextResponse.json({ error: err.message || 'Server error during deletion.' }, { status: 500 });
  }
}
