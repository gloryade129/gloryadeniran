import { NextResponse } from 'next/server';
import { addSubscriber } from '@/lib/newsletter-db';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, name, source, page } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const subscriber = await addSubscriber({
      email,
      name,
      source: source || 'scroll_popup_50',
      page: page || '/',
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed to updates from Glory',
      subscriber,
    });
  } catch (error) {
    console.error('Subscribe API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
