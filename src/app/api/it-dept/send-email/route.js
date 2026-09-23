import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/brevo';
import { buildDirectStudentEmail } from '@/lib/it-dept-email-templates';

const SENDER = { name: 'Your Class Rep', email: 'adeniranglory129@gmail.com' };

export async function POST(req) {
  try {
    const { toEmail, toName, subject, message } = await req.json();

    if (!toEmail || !toEmail.includes('@')) {
      return NextResponse.json(
        { error: 'Valid recipient email address is required.' },
        { status: 400 }
      );
    }

    if (!message || message.trim().length < 5) {
      return NextResponse.json(
        { error: 'Message body must be at least 5 characters long.' },
        { status: 400 }
      );
    }

    const emailSubject = subject?.trim() || 'Notice from Your Class Rep - 200L Transition';
    const htmlContent = buildDirectStudentEmail({
      studentName: toName || 'Student',
      subject: emailSubject,
      messageBody: message,
    });

    const result = await sendEmail({
      to: toEmail.trim(),
      subject: emailSubject,
      htmlContent,
      sender: SENDER,
    });

    if (!result) {
      return NextResponse.json(
        { error: 'Brevo failed to send email. Verify BREVO_API_KEY and verified sender in Brevo.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, messageId: result.messageId });
  } catch (err) {
    console.error('[it-dept-send-email] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to dispatch direct email.' },
      { status: 500 }
    );
  }
}
