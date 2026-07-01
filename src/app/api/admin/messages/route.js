import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { sendEmail } from '@/lib/brevo';

const FILE_PATH = path.join(process.cwd(), 'src', 'data', 'messages.json');

export async function GET() {
  try {
    const data = fs.readFileSync(FILE_PATH, 'utf8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    return NextResponse.json([]);
  }
}

export async function POST(request) {
  try {
    const message = await request.json();
    
    // 1. Try writing to filesystem (will fail on Vercel but pass locally)
    try {
      const existing = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8') || '[]');
      const newMessage = {
        ...message,
        id: Date.now().toString(),
        date: new Date().toISOString()
      };
      existing.unshift(newMessage);
      fs.writeFileSync(FILE_PATH, JSON.stringify(existing, null, 2));
    } catch (e) {
      console.warn("Local messages.json write bypassed (expected in cloud environment):", e.message);
    }

    // 2. Dispatch emails via Brevo if configured
    if (message.type === 'PROJECT_INQUIRY') {
      let name = "Guest";
      let clientEmail = "";
      const match = message.from.match(/(.*) <(.*)>/);
      if (match) {
        name = match[1].trim();
        clientEmail = match[2].trim();
      } else {
        clientEmail = message.from;
      }

      // Email Alert to Glory
      const alertHtml = `
        <div style="font-family: sans-serif; padding: 24px; background: #080706; color: #FAFAFA; max-width: 600px; margin: 0 auto; border: 1px solid #0091FF;">
          <h2 style="color: #0091FF; border-bottom: 1px solid #2A2A2D; padding-bottom: 12px; margin-top: 0;">New Project Inquiry</h2>
          <p><strong>Sender:</strong> ${name} &lt;${clientEmail}&gt;</p>
          <p><strong>Message Details:</strong></p>
          <div style="background: rgba(255,255,255,0.03); padding: 16px; border: 1px solid #2A2A2D; line-height: 1.6; border-radius: 4px;">
            ${message.content.replace(/\n/g, '<br/>')}
          </div>
          <p style="font-size: 11px; color: #9A9994; margin-top: 24px;">Sent from gloryadeniran.cv</p>
        </div>
      `;

      await sendEmail({
        to: "adeniranglory129@gmail.com",
        subject: `💼 New Project Inquiry from ${name}`,
        htmlContent: alertHtml
      });

      // Auto-responder Confirmation to Client
      if (clientEmail) {
        const confirmHtml = `
          <div style="font-family: 'Space Grotesk', -apple-system, sans-serif; padding: 32px; background: #080706; color: #FAFAFA; max-width: 600px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.08); border-radius: 24px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <img src="https://gloryadeniran.cv/images/profile-nobg.png" alt="Glory Adeniran" style="width: 80px; height: 80px; border-radius: 50%; border: 2px solid #0091FF; background: #FFFFFF; padding: 2px; object-fit: cover;" />
            </div>
            
            <h2 style="color: #0091FF; font-size: 20px; font-weight: 600; margin-top: 0; text-align: center; letter-spacing: -0.02em;">Yo, Glory here! ✦</h2>
            
            <p style="font-size: 14px; line-height: 1.7; color: #C8C7C2;">I just saw your message fly into my inbox. First off, thank you for reaching out—I'm hyped that you checked out my work!</p>
            
            <p style="font-size: 14px; line-height: 1.7; color: #C8C7C2;">Whether we are cooking up a next-level mobile application, crafting a responsive Webflow/Shopify/Next.js interface, or vibe-coding some interactive design magic, I'm already brainstorming how we can make this project stand out.</p>

            <div style="background: rgba(255,255,255,0.02); padding: 16px; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; margin: 20px 0;">
              <p style="margin: 0; font-size: 10px; font-family: monospace; color: #9A9994; text-transform: uppercase; letter-spacing: 0.1em;">Your Inquiry Details:</p>
              <p style="margin: 6px 0 0 0; font-size: 13px; color: #FAFAFA; line-height: 1.6; font-style: italic;">"${message.content}"</p>
            </div>

            <p style="font-size: 14px; line-height: 1.7; color: #C8C7C2;">I'm currently reviewing these details and will get back to you personally within 24 hours. In the meantime, if you want to skip the queue or just say hi, click the link below to chat with me directly on WhatsApp:</p>

            <div style="text-align: center; margin: 24px 0;">
              <a href="https://wa.me/2349168047236" style="display: inline-block; background: #0091FF; color: #080706; padding: 12px 24px; border-radius: 10px; font-weight: 600; text-decoration: none; font-size: 13px; letter-spacing: -0.01em;">
                Let's Chat on WhatsApp &nbsp;→
              </a>
            </div>

            <div style="border-top: 1px solid rgba(255,255,255,0.06); padding-top: 16px; margin-top: 24px; text-align: center;">
              <p style="margin: 0; font-size: 13px; font-weight: 600; color: #FAFAFA;">Glory Adeniran</p>
              <p style="margin: 2px 0 0 0; font-size: 11px; color: #9A9994;">Product Designer &amp; Vibe Coder</p>
              <a href="https://gloryadeniran.cv" style="font-size: 11px; color: #0091FF; text-decoration: none; display: inline-block; margin-top: 8px;">gloryadeniran.cv</a>
            </div>
          </div>
        `;

        await sendEmail({
          to: clientEmail,
          subject: "Project Inquiry Received - Glory Adeniran",
          htmlContent: confirmHtml
        });
      }
    } else if (message.type === 'SONG_REQUEST') {
      const songHtml = `
        <div style="font-family: sans-serif; padding: 20px; background: #080706; color: #FAFAFA; max-width: 500px; border: 1px solid #0091FF;">
          <h3 style="color: #0091FF; margin-top: 0;">🎵 New Song Suggestion</h3>
          <p>A user recommended this song request on your music player:</p>
          <p style="font-size: 16px; font-style: italic; background: rgba(255,255,255,0.03); padding: 12px; border-left: 3px solid #0091FF;">
            "${message.content}"
          </p>
        </div>
      `;

      await sendEmail({
        to: "adeniranglory129@gmail.com",
        subject: `🎵 Music Player Suggestion`,
        htmlContent: songHtml
      });
    }

    return NextResponse.json({ message: 'Message processed successfully' });
  } catch (error) {
    console.error("POST messages API error:", error);
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { id } = await request.json();
    const existing = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8') || '[]');
    const filtered = existing.filter(m => m.id !== id);
    fs.writeFileSync(FILE_PATH, JSON.stringify(filtered, null, 2));
    return NextResponse.json({ message: 'Message deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}
