import { randomBytes, createHmac } from 'crypto';
import { clock } from '@nishchay/shared';

const SECRET = process.env.JWT_SECRET || 'dev_secret';

export function createIntent(appId: string, amount: number) {
  const idempotencyKey = randomBytes(16).toString('hex');
  const payload = `${appId}:${amount}:${idempotencyKey}:${clock.now()}`;
  const signature = createHmac('sha256', SECRET).update(payload).digest('hex');
  const callbackUrl = `/api/payments/callback`;
  
  // In a real app, paymentUrl points to Razorpay/BillDesk etc. Here we point to our Sandbox.
  const paymentUrl = `/sandbox/checkout?payload=${encodeURIComponent(Buffer.from(payload).toString('base64'))}&signature=${encodeURIComponent(signature)}`;
  
  return { idempotencyKey, amount, callbackUrl, paymentUrl, payload, signature };
}

export function verifyCallback(payloadBase64: string, signature: string, status: string) {
  const payload = Buffer.from(payloadBase64, 'base64').toString('utf8');
  const expectedSig = createHmac('sha256', SECRET).update(payload).digest('hex');
  if (signature !== expectedSig) {
    throw new Error('Invalid signature');
  }
  
  const parts = payload.split(':');
  if (parts.length !== 4) throw new Error('Invalid payload format');
  const [appId, amountStr, idempotencyKey, timestampStr] = parts;
  
  const timestamp = parseInt(timestampStr, 10);
  if (clock.now() - timestamp > 24 * 60 * 60 * 1000) {
    throw new Error('Payload expired'); // Replay after 24h
  }
  
  return { appId, amount: parseFloat(amountStr), idempotencyKey, status };
}

export function generateReceiptId() {
  const yyyy = new Date().getFullYear();
  const hex = randomBytes(3).toString('hex').toUpperCase(); // 6 chars
  return `NSH-R-${yyyy}-${hex}`;
}

export function signReceipt(receiptId: string, appId: string, amount: number) {
  const payload = `${receiptId}:${appId}:${amount}`;
  return createHmac('sha256', SECRET).update(payload).digest('hex');
}
