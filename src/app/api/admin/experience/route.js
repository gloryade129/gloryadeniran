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
    await setExperience(data);
    revalidatePath('/experience');
    return NextResponse.json({ message: 'Experience updated successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update experience' }, { status: 500 });
  }
}
