import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSettings, setSettings } from '@/lib/data';

export async function GET() {
  try {
    const data = await getSettings();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const success = await setSettings(data);
    if (!success) {
      throw new Error('Redis write failed');
    }
    revalidatePath('/');
    revalidatePath('/about');
    revalidatePath('/(site)/about', 'page');
    return NextResponse.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('[settings/route.js] POST error:', error);
    return NextResponse.json({ error: `Failed to update settings: ${error.message}` }, { status: 500 });
  }
}
