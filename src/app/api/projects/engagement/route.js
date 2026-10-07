import { NextResponse } from 'next/server';
import { 
  getProjectEngagement, 
  recordProjectLike, 
  addProjectComment, 
  getAllComments 
} from '@/lib/newsletter-db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const all = searchParams.get('all');

    if (all === 'true') {
      const comments = await getAllComments();
      return NextResponse.json({ success: true, comments });
    }

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const engagement = await getProjectEngagement(projectId);
    return NextResponse.json({ success: true, ...engagement });
  } catch (error) {
    console.error('Engagement GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { projectId, action, email, name, text } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    if (action === 'like') {
      const result = await recordProjectLike(projectId, email, name);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'comment') {
      if (!text || !text.trim()) {
        return NextResponse.json({ error: 'Comment text is required' }, { status: 400 });
      }

      const comment = await addProjectComment({
        projectId,
        name,
        email,
        text,
      });

      return NextResponse.json({ success: true, comment });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Engagement POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
