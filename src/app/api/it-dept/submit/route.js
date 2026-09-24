import { NextResponse } from 'next/server';
import { saveStudentSubmission } from '@/lib/it-dept-db';
import { buildStudentConfirmationEmail, buildAdminAlertEmail } from '@/lib/it-dept-email-templates';
import { sendEmail } from '@/lib/brevo';

const ADMIN_EMAIL = 'adeniranglory129@gmail.com';
const SENDER = { name: 'Your Class Rep', email: ADMIN_EMAIL };

export async function POST(req) {
  try {
    const data = await req.json();

    if (!data.fullName || !data.matricNo) {
      return NextResponse.json(
        { error: 'Student full name and matric number are required.' },
        { status: 400 }
      );
    }

    // 1. Save to Database
    const dbResult = await saveStudentSubmission(data);
    if (!dbResult.success) {
      if (dbResult.error === 'EMAIL_EXISTS') {
        return NextResponse.json(
          { error: 'A submission with this email address has already been recorded. Each student can only submit once.' },
          { status: 409 }
        );
      }
      if (dbResult.error === 'MATRIC_EXISTS') {
        return NextResponse.json(
          { error: 'This matriculation number has already completed the 200L transition journey. Each student can only submit once.' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: dbResult.error || 'Failed to persist transition record.' },
        { status: 500 }
      );
    }

    // 2. Dispatch Brevo Emails (Non-blocking)
    const promises = [];

    // A. Student Confirmation Email
    if (data.email && data.email.includes('@')) {
      const studentHtml = buildStudentConfirmationEmail({
        studentName: data.fullName,
        matricNo: data.matricNo,
        techTrack: data.techTrack,
        committees: data.committees,
        volunteerRoles: data.volunteerRoles || data.committees || [],
        supportAmount: data.supportAmount,
        paymentStatus: data.paymentStatus,
      });

      promises.push(
        sendEmail({
          to: data.email.trim(),
          subject: `Your Class Rep - Welcome to 200L, ${data.fullName}!`,
          htmlContent: studentHtml,
          sender: SENDER,
        }).catch(err => console.warn('[it-dept-submit] Student email error:', err))
      );
    }

    // B. Admin Instant Notification Email
    const adminHtml = buildAdminAlertEmail({
      studentName: data.fullName,
      studentEmail: data.email,
      matricNo: data.matricNo,
      phone: data.phone,
      techTrack: data.techTrack,
      committees: data.committees,
      volunteerRoles: data.volunteerRoles || data.committees || [],
      supportChoice: data.supportLeadershipChoice,
      supportAmount: data.supportAmount,
      paymentStatus: data.paymentStatus,
      paymentRef: data.paymentRef,
      supportNote: data.supportNote,
      academicRating100L: data.academicRating100L || 5,
      challenges: data.challenges100L,
      suggestions: data.suggestions200L,
    });

    promises.push(
      sendEmail({
        to: ADMIN_EMAIL,
        subject: `New 200L Submission: ${data.fullName} (${data.matricNo})`,
        htmlContent: adminHtml,
        sender: { name: 'IT Dept Transition Portal', email: ADMIN_EMAIL },
      }).catch(err => console.warn('[it-dept-submit] Admin alert email error:', err))
    );

    // Wait for email dispatches or timeout softly
    await Promise.race([
      Promise.all(promises),
      new Promise(r => setTimeout(r, 3000)),
    ]);

    const normalizedMatric = data.matricNo.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const passToken = `IT200L-${normalizedMatric}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    return NextResponse.json({
      success: true,
      profileId: dbResult.profileId,
      passToken,
    });
  } catch (err) {
    console.error('[it-dept-submit] Request error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error processing transition journey.' },
      { status: 500 }
    );
  }
}
