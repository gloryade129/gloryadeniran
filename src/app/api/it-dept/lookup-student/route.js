import { NextResponse } from 'next/server';
import { lookupStudentByMatric } from '@/lib/it-dept-db';

export async function POST(req) {
  try {
    const { matricNo, email } = await req.json();
    if (!matricNo && !email) {
      return NextResponse.json({ found: false, error: 'Matric number or email is required.' }, { status: 400 });
    }

    const result = await lookupStudentByMatric(matricNo, email);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[lookup-student-api] Error:', err);
    return NextResponse.json({ found: false, error: err.message }, { status: 500 });
  }
}
