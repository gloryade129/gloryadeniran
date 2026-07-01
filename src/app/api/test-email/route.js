import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      status: 'ERROR',
      reason: 'BREVO_API_KEY is not set in environment variables',
    });
  }

  // Send a real test email to adeniranglory129@gmail.com
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Glory Adeniran', email: 'adeniranglory129@gmail.com' },
        to: [{ email: 'adeniranglory129@gmail.com' }],
        subject: '✅ Brevo Test Email — gloryadeniran.cv',
        htmlContent: '<p>This is a test. If you see this, Brevo is working correctly!</p>',
      }),
    });

    const body = await response.json();

    return NextResponse.json({
      status: response.ok ? 'SUCCESS' : 'BREVO_API_ERROR',
      httpStatus: response.status,
      apiKeyPresent: true,
      apiKeyPrefix: apiKey.slice(0, 8) + '...',
      brevoResponse: body,
    });
  } catch (err) {
    return NextResponse.json({
      status: 'NETWORK_ERROR',
      error: err.message,
    });
  }
}
