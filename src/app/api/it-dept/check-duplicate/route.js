import { NextResponse } from 'next/server';
import { checkDuplicateStudent } from '@/lib/it-dept-db';

export async function POST(req) {
  try {
    const { email, matricNo } = await req.json();
    const result = await checkDuplicateStudent(email, matricNo);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[check-duplicate-api] Error:', err);
    return NextResponse.json({ exists: false });
  }
}
