import { Router } from 'express';
import { prisma, withTransaction } from './db';
import { createIntent, verifyCallback, generateReceiptId, signReceipt } from './services/payment';
import { transition } from '@nishchay/shared';
import { checkIssueCertificatePreconditions } from './services/feeGate';

export const paymentsRouter = Router();

// Endpoint for business to request a payment intent
paymentsRouter.post('/intent', async (req, res, next) => {
  try {
    const { applicationId } = req.body;
    const user = (req as any).user;
    
    if (!applicationId) return res.status(400).json({ error: 'applicationId is required' });
    
    const app = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { business: true }
    });
    
    if (!app) return res.status(404).json({ error: 'Application not found' });
    if (app.business.userId !== user.userId) return res.status(403).json({ error: 'Not your application' });
    if (app.status !== 'SUBMITTED') return res.status(400).json({ error: 'Application is not in SUBMITTED state' });
    if (app.feeSnapshot == null) return res.status(400).json({ error: 'Fee not calculated' });

    const intent = createIntent(app.id, app.feeSnapshot);
    res.json(intent);
  } catch (err) {
    next(err);
  }
});

// Endpoint for callback
paymentsRouter.post('/callback', async (req, res, next) => {
  try {
    const { payload, signature, status } = req.body;
    
    let verified;
    try {
      verified = verifyCallback(payload, signature, status);
    } catch (e: any) {
      // Forged signature, replay, etc.
      // We must write an audit entry for GATE_BLOCKED but wait, it's just an invalid callback.
      // Rejection writes an audit entry and changes no state.
      // But we might not even know the app ID if payload is totally garbage. 
      // We can try to extract appId from payload manually just for the audit log if possible.
      let appId = 'UNKNOWN';
      try {
        const decoded = Buffer.from(payload, 'base64').toString('utf8');
        appId = decoded.split(':')[0] || 'UNKNOWN';
      } catch (ex) {}
      
      await prisma.auditLog.create({
        data: {
          actorId: 'SYSTEM',
          action: 'GATE_BLOCKED',
          entity: 'Application',
          entityId: appId,
          afterSummary: 'Callback rejected: ' + e.message
        }
      });
      return res.status(400).json({ error: e.message });
    }

    const { appId, amount, idempotencyKey, status: paymentStatus } = verified;
    
    const app = await prisma.application.findUnique({ where: { id: appId } });
    if (!app) {
      await prisma.auditLog.create({
        data: {
          actorId: 'SYSTEM',
          action: 'GATE_BLOCKED',
          entity: 'Application',
          entityId: appId,
          afterSummary: 'Application not found'
        }
      });
      return res.status(404).json({ error: 'Application not found' });
    }
    
    if (amount !== app.feeSnapshot) {
      await prisma.auditLog.create({
        data: {
          actorId: 'SYSTEM',
          action: 'GATE_BLOCKED',
          entity: 'Application',
          entityId: appId,
          afterSummary: 'Wrong amount'
        }
      });
      return res.status(400).json({ error: 'Wrong amount' });
    }

    if (paymentStatus !== 'SUCCESS') {
      return res.status(200).json({ message: 'Payment not successful, no action taken' });
    }
    
    const result = await withTransaction(async (tx) => {
      // Idempotency check: see if payment exists
      const existingPayment = await tx.payment.findUnique({ where: { idempotencyKey } });
      if (existingPayment) {
        return { message: 'Already processed' };
      }
      
      // Receipt cannot be reused for second app? One payment -> one app.
      // The `Payment` has `applicationId` unique.
      const existingAppPayment = await tx.payment.findUnique({ where: { applicationId: appId } });
      if (existingAppPayment) {
        throw new Error('Application already paid');
      }
      
      const nextState = transition(app.status as any, { type: 'payment_succeeded' });
      if (nextState instanceof Error) {
        throw new Error('Invalid state transition for payment');
      }

      // Create Payment
      const payment = await tx.payment.create({
        data: {
          applicationId: appId,
          amount,
          status: 'SUCCESS',
          idempotencyKey
        }
      });
      
      // Create Receipt
      const receiptId = generateReceiptId();
      const receiptSig = signReceipt(receiptId, appId, amount);
      const receipt = await tx.receipt.create({
        data: {
          id: receiptId,
          applicationId: appId,
          paymentId: payment.id,
          signature: receiptSig
        }
      });
      
      // Update app status
      await tx.application.update({
        where: { id: appId },
        data: { status: nextState }
      });
      
      await tx.auditLog.create({
        data: {
          actorId: 'SYSTEM',
          action: 'payment_succeeded',
          entity: 'Application',
          entityId: appId,
          beforeSummary: app.status,
          afterSummary: nextState
        }
      });
      
      return { success: true, receiptId: receipt.id };
    });
    
    res.json(result);
  } catch (err: any) {
    if (err.message && err.message.includes('Unique constraint')) {
       return res.json({ message: 'Already processed concurrently' });
    }
    if (err.message && (err.message.includes('Invalid state') || err.message.includes('Application already paid'))) {
       await prisma.auditLog.create({
         data: {
           actorId: 'SYSTEM',
           action: 'GATE_BLOCKED',
           entity: 'Application',
           entityId: 'UNKNOWN',
           afterSummary: err.message
         }
       });
       return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});
