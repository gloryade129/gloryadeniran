import { NextResponse } from 'next/server';
import { getAdminData } from '@/lib/it-dept-db';
import { sendEmail } from '@/lib/brevo';
import { buildDailyDigestEmail } from '@/lib/it-dept-email-templates';

const ADMIN_EMAIL = 'adeniranglory129@gmail.com';

export async function POST(req) {
  try {
    const { profiles } = await getAdminData();

    const totalSubmissions = profiles.length;
    const today = new Date().toISOString().slice(0, 10);
    const todaySubmissions = profiles.filter(p => p.createdAt?.startsWith(today)).length;

    const trackCounts = {};
    profiles.forEach(p => {
      if (p.techTrack) trackCounts[p.techTrack] = (trackCounts[p.techTrack] || 0) + 1;
    });
    const topTechTrack = Object.entries(trackCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Computing';

    const commCounts = {};
    profiles.forEach(p => {
      (p.committees || []).forEach(c => {
        commCounts[c] = (commCounts[c] || 0) + 1;
      });
    });
    const topCommittee = Object.entries(commCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Academic';

    const htmlContent = buildDailyDigestEmail({
      totalSubmissions,
      todaySubmissions,
      topTechTrack,
      topCommittee,
    });

    const result = await sendEmail({
      to: ADMIN_EMAIL,
      subject: `200L Transition Daily Digest - ${new Date().toLocaleDateString('en-NG')}`,
      htmlContent,
      sender: { name: 'IT Dept Portal - Daily Digest', email: ADMIN_EMAIL },
    });

    return NextResponse.json({ success: true, messageId: result?.messageId });
  } catch (err) {
    console.error('[it-dept-daily-summary] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to dispatch daily summary.' },
      { status: 500 }
    );
  }
}
