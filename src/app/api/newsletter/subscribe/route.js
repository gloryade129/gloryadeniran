import { NextResponse } from 'next/server';
import { addSubscriber } from '@/lib/newsletter-db';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, name, source, page } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const subscriber = await addSubscriber({
      email,
      name,
      source: source || 'scroll_popup_50',
      page: page || '/',
    });

    const cleanName = (name || '').trim();
    const subscriberName = cleanName || email.split('@')[0];

    // 1. Send Instant Notification to Glory
    try {
      const { sendEmail } = await import('@/lib/brevo');
      await sendEmail({
        to: 'adeniranglory129@gmail.com',
        subject: `New Portfolio Subscriber: ${subscriberName}`,
        htmlContent: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0A0E17; color: #F8FAFC; padding: 32px 24px; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.1);">
            <div style="margin-bottom: 20px;">
              <span style="background: rgba(37,99,235,0.2); color: #60A5FA; font-size: 11px; padding: 4px 10px; border-radius: 9999px; font-family: monospace; text-transform: uppercase; letter-spacing: 0.05em;">New Lead Captured</span>
            </div>
            <h2 style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #FFFFFF;">Someone Joined Your Network!</h2>
            <p style="color: #94A3B8; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">A new visitor just subscribed to your portfolio updates and creative circle:</p>
            <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 18px 20px; margin-bottom: 24px;">
              <p style="margin: 0 0 8px; font-size: 14px;"><strong>Name:</strong> ${cleanName || 'Not provided'}</p>
              <p style="margin: 0 0 8px; font-size: 14px;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #38BDF8; text-decoration: none;">${email}</a></p>
              <p style="margin: 0 0 8px; font-size: 13px; color: #94A3B8;"><strong>Trigger Source:</strong> ${source || 'Scroll Popup'}</p>
              <p style="margin: 0; font-size: 13px; color: #94A3B8;"><strong>Page:</strong> ${page || '/'}</p>
            </div>
            <p style="color: #64748B; font-size: 12px; margin: 0;">This subscriber was automatically recorded in your Admin Dashboard.</p>
          </div>
        `,
      });

      // 2. Send Thank-You Welcome Email to the Subscriber
      await sendEmail({
        to: email,
        subject: `Welcome to Glory Adeniran's Creative Circle`,
        htmlContent: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0A0E17; color: #F8FAFC; padding: 40px 24px; border-radius: 20px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.1);">
            <div style="text-align: center; margin-bottom: 28px;">
              <div style="width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #2563EB, #38BDF8); margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 20px; color: #fff;">GA</div>
              <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #FFFFFF;">You're in the Inner Circle</h1>
              <p style="color: #94A3B8; font-size: 14px; margin: 0;">Thank you for connecting with me!</p>
            </div>
            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 24px; margin-bottom: 28px; line-height: 1.7; font-size: 14px; color: #CBD5E1;">
              <p style="margin: 0 0 16px;">Hi ${cleanName || 'there'},</p>
              <p style="margin: 0 0 16px;">I'm Glory Adeniran — Product Designer, Creative Lead at Global Graphics, and interactive builder based in Nigeria.</p>
              <p style="margin: 0 0 16px;">I'm excited to have you in my creative circle! Whenever I launch a new product design case study, release branding work, or share interactive design drops, you'll be among the very first to see it.</p>
              <p style="margin: 0;">If you ever want to discuss a project, collaborate, or simply chat about design, feel free to reply directly to this email or reach out on WhatsApp.</p>
            </div>
            <div style="text-align: center; margin-bottom: 28px;">
              <a href="https://www.gloryadeniran.cv" style="display: inline-block; background: #2563EB; color: #FFFFFF; font-weight: 600; padding: 12px 28px; border-radius: 9999px; text-decoration: none; font-size: 14px;">Explore Portfolio</a>
            </div>
            <div style="text-align: center; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px;">
              <p style="margin: 0 0 6px; font-size: 13px; font-weight: 600; color: #F8FAFC;">Glory Adeniran</p>
              <p style="margin: 0; font-size: 12px; color: #64748B;">Product Designer & Lead Creative · Global Graphics</p>
            </div>
          </div>
        `,
      });
    } catch (mailErr) {
      console.warn('Subscription email dispatch warning:', mailErr.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed to updates from Glory',
      subscriber,
    });
  } catch (error) {
    console.error('Subscribe API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
