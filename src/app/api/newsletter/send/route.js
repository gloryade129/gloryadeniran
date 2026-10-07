import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/brevo';

export async function POST(request) {
  try {
    const { to, subject, messageText, recipientName } = await request.json();

    if (!to || !subject || !messageText) {
      return NextResponse.json({ error: 'Recipient, subject, and message text are required' }, { status: 400 });
    }

    const htmlContent = `
      <div style="font-family: 'Space Grotesk', -apple-system, sans-serif; padding: 36px 32px; background: #0A0E17; color: #F8FAFC; max-width: 620px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.1); border-radius: 28px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 28px;">
          <div style="width: 44px; height: 44px; border-radius: 50%; background: #2563EB; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #ffffff; font-size: 18px;">
            GA
          </div>
          <div>
            <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: #F8FAFC; letter-spacing: -0.02em;">Glory Adeniran</h2>
            <p style="margin: 2px 0 0 0; font-size: 12px; color: #94A3B8;">Product Designer &amp; Creative Lead</p>
          </div>
        </div>

        ${recipientName ? `<p style="font-size: 15px; color: #CBD5E1; margin-bottom: 16px;">Hello ${recipientName},</p>` : ''}

        <div style="font-size: 15px; line-height: 1.8; color: #CBD5E1; white-space: pre-wrap; margin-bottom: 32px;">
${messageText}
        </div>

        <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 24px; text-align: center;">
          <p style="margin: 0; font-size: 13px; font-weight: 600; color: #F8FAFC;">Glory Adeniran Portfolio</p>
          <p style="margin: 4px 0 12px 0; font-size: 12px; color: #64748B;">Global Graphics · Nigeria</p>
          <a href="https://gloryadeniran.cv" style="display: inline-block; padding: 8px 20px; border-radius: 9999px; background: #2563EB; color: #FFFFFF; font-size: 12px; font-weight: 600; text-decoration: none;">
            Visit Portfolio →
          </a>
        </div>
      </div>
    `;

    const recipients = Array.isArray(to) ? to : [to];
    let sentCount = 0;

    for (const recipient of recipients) {
      const cleanEmail = typeof recipient === 'string' ? recipient.trim() : recipient.email;
      if (!cleanEmail) continue;

      const res = await sendEmail({
        to: cleanEmail,
        subject,
        htmlContent,
      });
      if (res) sentCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully delivered to ${sentCount} recipient(s)`,
      sentCount,
    });
  } catch (error) {
    console.error('Newsletter send API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
