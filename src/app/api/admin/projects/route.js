import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const PROJECTS_FILE = path.join(process.cwd(), 'src', 'data', 'projects.json');

export async function GET() {
  try {
    const data = fs.readFileSync(PROJECTS_FILE, 'utf8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load projects' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(data, null, 2));
    return NextResponse.json({ message: 'Projects updated successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update projects' }, { status: 500 });
  }
}
