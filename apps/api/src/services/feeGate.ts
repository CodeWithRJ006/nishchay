import { prisma } from '../db';
import { signReceipt } from './payment';

export async function checkIssueCertificatePreconditions(appId: string, tx: any = prisma) {
  const app = await tx.application.findUnique({
    where: { id: appId },
    include: { receipt: { include: { payment: true } } }
  });
  
  if (!app) {
    throw new Error('Application not found');
  }

  const reasons: string[] = [];
  
  if (app.status !== 'PASSED') {
    reasons.push(`Application status is ${app.status}, expected PASSED`);
  }
  
  if (!app.receipt) {
    reasons.push('No receipt found for this application');
  } else {
    if (app.receipt.payment.amount !== app.feeSnapshot) {
      reasons.push('Receipt amount does not match application fee snapshot');
    }
    
    const expectedSig = signReceipt(app.receipt.id, app.id, app.receipt.payment.amount);
    if (app.receipt.signature !== expectedSig) {
      reasons.push('Receipt signature invalid or forged');
    }
  }
  
  return {
    isPassed: reasons.length === 0,
    reasons,
    app
  };
}
