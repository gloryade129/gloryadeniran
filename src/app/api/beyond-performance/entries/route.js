/**
 * API Route: /api/beyond-performance/entries
 * Handles retrieval of survey submissions, aggregated analytics, and deletion of responses for the admin dashboard.
 */

import { NextResponse } from 'next/server';
import { getSurveyEntries, getSurveyStats, deleteSurveyEntry } from '@/lib/supabase';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const segment = searchParams.get('segment');
    const search = searchParams.get('search');
    const limit = Number(searchParams.get('limit')) || 100;
    const statsOnly = searchParams.get('statsOnly') === 'true';

    if (statsOnly) {
      const stats = await getSurveyStats();
      return NextResponse.json({ success: true, stats }, { status: 200 });
    }

    const [entries, stats] = await Promise.all([
      getSurveyEntries({ segment, search, limit }),
      getSurveyStats(),
    ]);

    return NextResponse.json(
      {
        success: true,
        count: entries.length,
        entries,
        stats,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[api/beyond-performance/entries] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve survey entries' },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    const body = await req.json();
    const { id, email } = body || {};

    if (!id && !email) {
      return NextResponse.json(
        { error: 'Response ID or email is required for deletion.' },
        { status: 400 }
      );
    }

    await deleteSurveyEntry(id, email);

    return NextResponse.json(
      { success: true, message: 'Survey reflection deleted successfully.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('[api/beyond-performance/entries] DELETE Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete survey entry' },
      { status: 500 }
    );
  }
}
