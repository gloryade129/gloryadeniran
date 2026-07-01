import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const FILE_PATH = path.join(process.cwd(), 'src', 'data', 'messages.json');

export async function GET() {
  try {
    const data = fs.readFileSync(FILE_PATH, 'utf8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    return NextResponse.json([]);
  }
}

export async function POST(request) {
  try {
    const message = await request.json();
    const existing = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8') || '[]');
    
    // Add timestamp and ID
    const newMessage = {
      ...message,
      id: Date.now().toString(),
      date: new Date().toISOString()
    };
    
    existing.unshift(newMessage); // Newest first
    fs.writeFileSync(FILE_PATH, JSON.stringify(existing, null, 2));
    
    return NextResponse.json({ message: 'Message sent successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { id } = await request.json();
    const existing = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8') || '[]');
    const filtered = existing.filter(m => m.id !== id);
    fs.writeFileSync(FILE_PATH, JSON.stringify(filtered, null, 2));
    return NextResponse.json({ message: 'Message deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}
