import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/brevo';

export async function POST(request) {
  try {
    const { to, subject, replyText, originalMessage } = await request.json();

    if (!to || !subject || !replyText) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Format the email html with a premium dark mode design matching Glory's brand
    const htmlContent = `
      <div style="font-family: 'Space Grotesk', -apple-system, sans-serif; padding: 32px; background: #080706; color: #FAFAFA; max-width: 600px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.08); border-radius: 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="https://gloryadeniran.cv/images/profile-nobg.png" alt="Glory Adeniran" style="width: 80px; height: 80px; border-radius: 50%; border: 2px solid #0091FF; object-fit: cover;" />
        </div>

        <div style="font-size: 15px; line-height: 1.8; color: #C8C7C2; white-space: pre-wrap;">${replyText}</div>

        <div style="border-top: 1px solid rgba(255,255,255,0.06); padding-top: 24px; margin-top: 32px; text-align: center;">
          <p style="margin: 0; font-size: 13px; font-weight: 600; color: #FAFAFA;">Glory Adeniran</p>
          <p style="margin: 2px 0 0 0; font-size: 11px; color: #9A9994;">Product Designer &amp; Vibe Coder</p>
          <a href="https://gloryadeniran.cv" style="font-size: 11px; color: #0091FF; text-decoration: none; display: inline-block; margin-top: 8px;">gloryadeniran.cv</a>
        </div>

        ${originalMessage ? `
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px dashed rgba(255,255,255,0.1); font-size: 12px; color: #9A9994;">
            <p style="margin: 0 0 8px 0; font-weight: bold; text-transform: uppercase;">Original Message Inquiry:</p>
            <blockquote style="margin: 0; padding-left: 12px; border-left: 2px solid #0091FF; font-style: italic; color: #C8C7C2;">
              "${originalMessage}"
            </blockquote>
          </div>
        ` : ''}
      </div>
    `;

    const result = await sendEmail({
      to,
      subject,
      htmlContent,
    });

    if (!result) {
      return NextResponse.json({ error: 'Failed to deliver email through Brevo' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Reply sent successfully', result });
  } catch (error) {
    console.error('Reply API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
