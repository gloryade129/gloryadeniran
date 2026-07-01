export async function sendEmail({ to, subject, htmlContent, sender }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn("BREVO_API_KEY environment variable is missing. Skipping email send.");
    return null;
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: sender || { name: "Glory Adeniran", email: "hello@gloryadeniran.cv" },
        to: Array.isArray(to) ? to : [{ email: to }],
        subject,
        htmlContent
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Failed to dispatch email via Brevo');
    }

    return await response.json();
  } catch (error) {
    console.error('Brevo Email Dispatch Error:', error);
    return null;
  }
}
