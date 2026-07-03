import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getExperience, setExperience } from '@/lib/data';

export async function GET() {
  try {
    const data = await getExperience();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load experience' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const success = await setExperience(data);
    if (!success) {
      throw new Error('Redis write failed');
    }
    // Purge caches for both layout and page paths
    revalidatePath('/');
    revalidatePath('/experience');
    revalidatePath('/(site)/experience', 'page');
    return NextResponse.json({ message: 'Experience updated successfully' });
  } catch (error) {
    console.error('[experience/route.js] POST error:', error);
    return NextResponse.json({ error: `Failed to update experience: ${error.message}` }, { status: 500 });
  }
}
