import { NextResponse } from 'next/server';
import { getAllSubscribers, deleteSubscriber } from '@/lib/newsletter-db';

export async function GET() {
  try {
    const subscribers = await getAllSubscribers();
    return NextResponse.json({ success: true, subscribers, count: subscribers.length });
  } catch (error) {
    console.error('Get subscribers API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    let email = searchParams.get('email');
    if (!email) {
      try {
        const body = await request.json();
        email = body?.email;
      } catch {}
    }
    if (!email) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 });
    }

    await deleteSubscriber(email);
    return NextResponse.json({ success: true, message: 'Subscriber removed' });
  } catch (error) {
    console.error('Delete subscriber API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
