/**
 * lib/brevo.js
 * Sends emails via the Brevo (formerly Sendinblue) API.
 *
 * Required env var: BREVO_API_KEY
 * The sender email (adeniranglory129@gmail.com) must be verified in
 * your Brevo account under Settings → Senders & Domains.
 */
export async function sendEmail({ to, subject, htmlContent, sender }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error('❌ BREVO_API_KEY is not set. Email not sent. Add it in Vercel → Settings → Environment Variables.');
    return null;
  }

  const payload = {
    sender: sender || { name: 'Glory Adeniran', email: 'adeniranglory129@gmail.com' },
    to: Array.isArray(to) ? to : [{ email: to }],
    subject,
    htmlContent,
  };

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const body = await response.json();

    if (!response.ok) {
      console.error('❌ Brevo API error:', JSON.stringify(body));
      return null;
    }

    console.log('✅ Email sent via Brevo. MessageId:', body.messageId);
    return body;
  } catch (error) {
    console.error('❌ Brevo network error:', error.message);
    return null;
  }
}
