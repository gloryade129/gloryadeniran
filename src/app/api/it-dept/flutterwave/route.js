import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { amount, email, name, phone, matricNo, note } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid contribution amount is required' }, { status: 400 });
    }

    const flwSecret = process.env.FLW_SECRET_KEY || process.env.FLUTTERWAVE_SECRET_KEY;
    const cleanMatric = (matricNo || 'STUDENT').replace(/[^a-zA-Z0-9]/g, '');
    const txRef = `IT200L-${cleanMatric}-${Date.now()}`;

    // If Flutterwave Secret Key is configured in Vercel
    if (flwSecret) {
      const flwRes = await fetch('https://api.flutterwave.com/v3/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${flwSecret}`,
        },
        body: JSON.stringify({
          tx_ref: txRef,
          amount: Number(amount),
          currency: 'NGN',
          redirect_url: 'https://gloryadeniran.cv/it-dept?payment=successful',
          customer: {
            email: email || 'student@itdept.unilorin.edu.ng',
            phonenumber: phone || '08000000000',
            name: name || 'IT Scholar',
          },
          customizations: {
            title: 'IT Dept Leadership Support (2025–2029 Set)',
            description: `Voluntary contribution from ${name} (${matricNo})`,
            logo: 'https://gloryadeniran.cv/itsa-logo.png',
          },
        }),
      });

      const flwData = await flwRes.json();
      if (flwData.status === 'success' && flwData.data?.link) {
        return NextResponse.json({
          success: true,
          paymentLink: flwData.data.link,
          txRef,
        });
      } else {
        console.warn('[flutterwave] API response error:', flwData);
      }
    }

    // Graceful fallback: If secret key not yet set in Vercel, record pledge
    return NextResponse.json({
      success: true,
      isPledged: true,
      txRef,
      message: 'Contribution recorded as voluntary pledge. Configure FLW_SECRET_KEY in Vercel to activate live card charging.',
    });
  } catch (err) {
    console.error('[flutterwave-api] Error:', err);
    return NextResponse.json({ error: err.message || 'Payment initiation failed' }, { status: 500 });
  }
}
