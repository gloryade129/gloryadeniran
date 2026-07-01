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
    await setProjects(data);
    // Bust Next.js cache so server components pick up new data
    revalidatePath('/');
    revalidatePath('/work');
    revalidatePath('/work/[id]', 'page');
    return NextResponse.json({ message: 'Projects updated successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update projects' }, { status: 500 });
  }
}
