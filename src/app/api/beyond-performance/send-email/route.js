/**
 * API Route: /api/beyond-performance/send-email
 * Allows Glory Adeniran to send personalized follow-up emails, prayer notes,
 * and custom encouragement directly to survey participants via Brevo.
 * Strictly zero emojis.
 */

import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/brevo';

export async function POST(req) {
  try {
    const body = await req.json();
    const { to, subject, message, participantName } = body || {};

    if (!to || !to.includes('@')) {
      return NextResponse.json({ error: 'Valid recipient email is required.' }, { status: 400 });
    }

    if (!message || message.trim().length < 5) {
      return NextResponse.json({ error: 'Message content is required.' }, { status: 400 });
    }

    const emailSubject = subject?.trim() || 'A Personal Note from Glory Adeniran (God\'s Virtue)';
    const firstName = participantName ? participantName.split(' ')[0] : 'Friend';

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailSubject}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #080706;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #FAFAFA;
      line-height: 1.6;
    }
    .wrapper {
      max-width: 600px;
      margin: 0 auto;
      background: #0E0E10;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      overflow: hidden;
    }
    .header {
      background: #080706;
      padding: 32px 28px 24px;
      border-bottom: 2px solid #0091FF;
      text-align: left;
    }
    .eyebrow {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #0091FF;
      font-weight: 700;
      margin-bottom: 6px;
    }
    .title {
      font-size: 22px;
      font-weight: 700;
      color: #FFFFFF;
      margin: 0 0 6px 0;
    }
    .body-content {
      padding: 32px 28px;
      background: #0E0E10;
    }
    .greeting {
      font-size: 17px;
      font-weight: 600;
      color: #FFFFFF;
      margin-bottom: 16px;
    }
    .message-box {
      font-size: 15px;
      color: #C8C7C2;
      line-height: 1.7;
      margin-bottom: 24px;
      white-space: pre-wrap;
    }
    .scripture-card {
      background: rgba(0, 145, 255, 0.06);
      border-left: 3px solid #0091FF;
      padding: 16px 20px;
      margin: 24px 0;
    }
    .scripture-text {
      font-size: 14px;
      font-style: italic;
      color: #FAFAFA;
      margin: 0 0 6px 0;
    }
    .scripture-ref {
      font-size: 11px;
      font-weight: 700;
      color: #0091FF;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .signature {
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
    .author-name {
      font-size: 15px;
      font-weight: 700;
      color: #FFFFFF;
      margin: 0;
    }
    .author-role {
      font-size: 12px;
      color: #9A9994;
      margin: 2px 0 0 0;
    }
    .footer {
      padding: 20px 28px;
      background: #080706;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      font-size: 11px;
      color: #9A9994;
    }
  </style>
</head>
<body>
  <div style="padding: 24px 12px;">
    <div class="wrapper">
      <div class="header">
        <div class="eyebrow">Personal Reflection &amp; Pastoral Note</div>
        <h1 class="title">Beyond Performance</h1>
      </div>

      <div class="body-content">
        <div class="greeting">Hello ${firstName},</div>
        
        <div class="message-box">${message.replace(/\n/g, '<br/>')}</div>

        <div class="scripture-card">
          <p class="scripture-text">"Come to me, all you who are weary and burdened, and I will give you rest."</p>
          <div class="scripture-ref">Matthew 11:28</div>
        </div>

        <div class="signature">
          <div style="font-size: 13px; color: #9A9994; margin-bottom: 4px;">In Christ's Grace,</div>
          <div class="author-name">Glory Adeniran (God's Virtue)</div>
          <div class="author-role">Product Designer &amp; Creative Lead · gloryadeniran.cv</div>
        </div>
      </div>

      <div class="footer">
        Sent by Glory Adeniran via <a href="https://gloryadeniran.cv/beyond-performance" style="color: #0091FF;">gloryadeniran.cv/beyond-performance</a>.
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    const result = await sendEmail({
      to,
      subject: emailSubject,
      htmlContent,
      sender: {
        name: 'Glory Adeniran (God\'s Virtue)',
        email: 'adeniranglory129@gmail.com',
      },
    });

    return NextResponse.json({
      success: true,
      message: `Personalized email dispatched to ${to}`,
      result,
    });
  } catch (error) {
    console.error('[api/beyond-performance/send-email] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send personalized email', detail: error.message },
      { status: 500 }
    );
  }
}
