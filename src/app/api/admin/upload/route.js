import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: 'Blob storage not configured. Please add BLOB_READ_WRITE_TOKEN to Vercel environment variables.' },
        { status: 503 }
      );
    }

    const blob = await put(file.name, file, {
      access: 'public',
      addRandomSuffix: true, // prevents filename collisions
    });

    return NextResponse.json({
      message: 'File uploaded successfully',
      path: blob.url,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
