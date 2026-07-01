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
        <div style="font-family: sans-serif; padding: 24px; background: #080706; color: #FAFAFA; max-width: 600px; margin: 0 auto; border: 1px solid #C9E265;">
          <h2 style="color: #C9E265; border-bottom: 1px solid #2A2A2D; padding-bottom: 12px; margin-top: 0;">New Project Inquiry</h2>
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
          <div style="font-family: sans-serif; padding: 24px; background: #F5F4F0; color: #151413; max-width: 600px; margin: 0 auto; border: 1px solid #8BA51E; border-radius: 8px;">
            <h2 style="color: #8BA51E; margin-top: 0;">Hello ${name},</h2>
            <p>Thank you for reaching out! I have received your project inquiry and will review it shortly.</p>
            <p>I typically respond to inquiries within 24 hours. If your request is urgent, feel free to reach out directly via my WhatsApp link on the site.</p>
            <br/>
            <p>Warm regards,</p>
            <p><strong>Glory Adeniran</strong><br/><span style="color: #6A6964; font-size: 13px;">Product Designer & Vibe Coder</span></p>
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
        <div style="font-family: sans-serif; padding: 20px; background: #080706; color: #FAFAFA; max-width: 500px; border: 1px solid #C9E265;">
          <h3 style="color: #C9E265; margin-top: 0;">🎵 New Song Suggestion</h3>
          <p>A user recommended this song request on your music player:</p>
          <p style="font-size: 16px; font-style: italic; background: rgba(255,255,255,0.03); padding: 12px; border-left: 3px solid #C9E265;">
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
