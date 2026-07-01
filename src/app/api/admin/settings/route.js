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
    await setSettings(data);
    revalidatePath('/');
    revalidatePath('/about');
    return NextResponse.json({ message: 'Settings updated successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
