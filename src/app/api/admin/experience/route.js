import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const FILE_PATH = path.join(process.cwd(), 'src', 'data', 'experience.json');

export async function GET() {
  try {
    const data = fs.readFileSync(FILE_PATH, 'utf8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load experience' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));
    return NextResponse.json({ message: 'Experience updated successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update experience' }, { status: 500 });
  }
}
