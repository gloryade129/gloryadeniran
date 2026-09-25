import { NextResponse } from 'next/server';
import { updateStudentSubmission } from '@/lib/it-dept-db';
import { buildAdminAlertEmail } from '@/lib/it-dept-email-templates';
import { sendEmail } from '@/lib/brevo';

const ADMIN_EMAIL = 'adeniranglory129@gmail.com';

export async function POST(req) {
  try {
    const data = await req.json();

    if (!data.matricNo && !data.profileId) {
      return NextResponse.json({ error: 'Matric number or profile ID required to update record.' }, { status: 400 });
    }

    const dbResult = await updateStudentSubmission(data);
    if (!dbResult.success) {
      return NextResponse.json({ error: dbResult.error || 'Failed to update student record.' }, { status: 500 });
    }

    // Dispatch update notification to Admin Email (non-blocking)
    const adminHtml = buildAdminAlertEmail({
      studentName: `${data.fullName || 'Verified Student'} [UPDATED REVIEW]`,
      studentEmail: data.email,
      matricNo: data.matricNo,
      phone: data.phone,
      techTrack: data.techTrack,
      committees: data.committees,
      volunteerRoles: data.volunteerRoles || [],
      supportChoice: data.supportLeadershipChoice,
      supportAmount: data.supportAmount,
      paymentStatus: data.paymentStatus,
      paymentRef: data.paymentRef,
      supportNote: data.supportNote,
      academicRating100L: data.academicRating100L || 5,
      challenges: data.challenges100L,
      suggestions: data.suggestions200L,
      crRecommendContinue: data.crRecommendContinue,
      crRecommendReason: data.crRecommendReason,
      acrRecommendContinue: data.acrRecommendContinue,
      acrRecommendReason: data.acrRecommendReason,
    });

    sendEmail({
      to: ADMIN_EMAIL,
      subject: `200L Review Updated: ${data.fullName || 'Scholar'} (${data.matricNo})`,
      htmlContent: adminHtml,
      sender: { name: 'IT Dept Transition Portal', email: ADMIN_EMAIL },
    }).catch(err => console.warn('[it-dept-update] Admin alert email error:', err));

    const normalizedMatric = (data.matricNo || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const passToken = `IT200L-${normalizedMatric}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    return NextResponse.json({
      success: true,
      profileId: dbResult.profileId,
      passToken,
      updated: true,
    });
  } catch (err) {
    console.error('[it-dept-update] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update record.' }, { status: 500 });
  }
}
