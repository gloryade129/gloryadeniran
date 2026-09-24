import { NextResponse } from 'next/server';
import { updatePaymentStatus } from '@/lib/it-dept-db';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const transactionId = searchParams.get('transaction_id');
    const txRef = searchParams.get('tx_ref');

    if (!transactionId && !txRef) {
      return NextResponse.json({ error: 'Transaction ID or tx_ref is required' }, { status: 400 });
    }

    const flwSecret = process.env.FLW_SECRET_KEY || process.env.FLUTTERWAVE_SECRET_KEY;

    if (flwSecret && transactionId) {
      const verifyRes = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${flwSecret}`,
          'Content-Type': 'application/json',
        },
      });

      const verifyData = await verifyRes.json();

      if (verifyData.status === 'success' && verifyData.data?.status === 'successful') {
        const reference = verifyData.data.tx_ref || txRef;
        await updatePaymentStatus(reference, 'completed');

        return NextResponse.json({
          success: true,
          verified: true,
          amount: verifyData.data.amount,
          currency: verifyData.data.currency,
          txRef: reference,
        });
      }
    }

    if (txRef) {
      await updatePaymentStatus(txRef, 'completed');
      return NextResponse.json({ success: true, verified: true, txRef });
    }

    return NextResponse.json({ success: false, message: 'Could not verify transaction' }, { status: 400 });
  } catch (err) {
    console.error('[flutterwave-verify] Error:', err);
    return NextResponse.json({ error: err.message || 'Verification failed' }, { status: 500 });
  }
}
