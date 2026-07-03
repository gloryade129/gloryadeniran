import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getProjects, setProjects } from '@/lib/data';

export async function GET() {
  try {
    const data = await getProjects();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load projects' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const success = await setProjects(data);
    if (!success) {
      throw new Error('Redis write failed');
    }
    // Bust Next.js cache so server components pick up new data
    revalidatePath('/');
    revalidatePath('/work');
    revalidatePath('/work/[id]', 'page');
    revalidatePath('/(site)/work', 'page');
    return NextResponse.json({ message: 'Projects updated successfully' });
  } catch (error) {
    console.error('[projects/route.js] POST error:', error);
    return NextResponse.json({ error: `Failed to update projects: ${error.message}` }, { status: 500 });
  }
}
