/**
 * API Route: /api/beyond-performance/entries
 * Handles retrieval of survey submissions and aggregated analytics for the admin dashboard.
 */

import { NextResponse } from 'next/server';
import { getSurveyEntries, getSurveyStats } from '@/lib/supabase';

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
    console.error('[api/beyond-performance/entries] Error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve survey entries' },
      { status: 500 }
    );
  }
}
