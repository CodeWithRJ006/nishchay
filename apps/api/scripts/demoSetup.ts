import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Running demo setup...');

  // Reset db
  await prisma.auditLog.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.inspectionPhoto.deleteMany();
  await prisma.inspection.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.receipt.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.applicationDocument.deleteMany();
  await prisma.application.deleteMany();
  await prisma.instrumentDocument.deleteMany();
  await prisma.instrument.deleteMany();
  await prisma.business.deleteMany();
  await prisma.user.deleteMany();
  await prisma.zone.deleteMany();

  const pwHash = await bcrypt.hash('password123', 10);

  const zone = await prisma.zone.create({ data: { id: 'zone-1', name: 'Demo Zone' } });

  // 1. Users
  const admin = await prisma.user.create({ data: { email: 'admin@demo.com', passwordHash: pwHash, name: 'Admin User', role: 'ADMIN' } });
  
  const lmo1 = await prisma.user.create({ data: { email: 'lmo1@demo.com', passwordHash: pwHash, name: 'LMO One', role: 'LMO', zones: { connect: [{ id: zone.id }] } } });
  const lmo2 = await prisma.user.create({ data: { email: 'lmo2@demo.com', passwordHash: pwHash, name: 'LMO Two', role: 'LMO', zones: { connect: [{ id: zone.id }] } } });
  
  const gatc = await prisma.user.create({ data: { email: 'gatc@demo.com', passwordHash: pwHash, name: 'GATC Centre', role: 'GATC', centreName: 'Delhi Central Lab', zones: { connect: [{ id: zone.id }] } } });

  // 2. Businesses
  const b1 = await prisma.user.create({ data: { email: 'biz1@demo.com', passwordHash: pwHash, name: 'Biz One', role: 'BUSINESS' } });
  const biz1 = await prisma.business.create({ data: { userId: b1.id, tradeName: 'Supermarket A', ownerName: 'Alice', businessType: 'Retail', address: '123 Main St', zoneId: zone.id } });

  const b2 = await prisma.user.create({ data: { email: 'biz2@demo.com', passwordHash: pwHash, name: 'Biz Two', role: 'BUSINESS' } });
  const biz2 = await prisma.business.create({ data: { userId: b2.id, tradeName: 'GATC Labs B', ownerName: 'Bob', businessType: 'Lab', address: '456 Lab Rd', zoneId: zone.id } });

  const b3 = await prisma.user.create({ data: { email: 'biz3@demo.com', passwordHash: pwHash, name: 'Biz Three', role: 'BUSINESS' } });
  const biz3 = await prisma.business.create({ data: { userId: b3.id, tradeName: 'Factory C', ownerName: 'Charlie', businessType: 'Manufacturing', address: '789 Ind St', zoneId: zone.id } });

  // 3. Instruments
  // biz1 - Retail (Weights)
  const inst1 = await prisma.instrument.create({ data: { id: 'inst-1', businessId: biz1.id, instrumentClass: 'Weights', serialNumber: 'W-001', status: 'VERIFIED' } });
  // biz2 - GATC routed (NAWI - Non-automatic weighing instrument usually GATC or standard? Let's just use GATC routed flag on application)
  const inst2 = await prisma.instrument.create({ data: { id: 'inst-2', businessId: biz2.id, instrumentClass: 'NAWI', serialNumber: 'N-001', status: 'UNVERIFIED' } });
  // biz3
  const inst3 = await prisma.instrument.create({ data: { id: 'inst-3', businessId: biz3.id, instrumentClass: 'Length measure', serialNumber: 'L-001', status: 'REJECTED' } });

  // 4. Applications and Certificates
  
  // Valid certificate for inst1
  const app1 = await prisma.application.create({ data: { id: 'APP-1', businessId: biz1.id, instrumentId: inst1.id, status: 'CERTIFIED', feeSnapshot: 100, routedToRole: 'LMO' } });
  const pay1 = await prisma.payment.create({ data: { id: 'pay-1', applicationId: app1.id, amount: 100, status: 'SUCCESS', idempotencyKey: crypto.randomUUID() } });
  const rec1 = await prisma.receipt.create({ data: { id: 'REC-1', applicationId: app1.id, paymentId: pay1.id, signature: 'mock' } });
  await prisma.certificate.create({ data: { id: 'CERT-1', applicationId: app1.id, receiptId: rec1.id, issueDate: new Date(), validTo: new Date(Date.now() + 31536000000), status: 'VALID', sealHash: 'hash1', sealSignature: 'sig1', payload: JSON.stringify({ test: 1 }), publicId: 'pub-cert-1' } });

  // Expired certificate
  const appExp = await prisma.application.create({ data: { id: 'APP-EXP', businessId: biz1.id, instrumentId: inst1.id, status: 'CERTIFIED', feeSnapshot: 100, routedToRole: 'LMO' } });
  const payExp = await prisma.payment.create({ data: { id: 'pay-exp', applicationId: appExp.id, amount: 100, status: 'SUCCESS', idempotencyKey: crypto.randomUUID() } });
  const recExp = await prisma.receipt.create({ data: { id: 'REC-EXP', applicationId: appExp.id, paymentId: payExp.id, signature: 'mock' } });
  await prisma.certificate.create({ data: { id: 'CERT-EXP', applicationId: appExp.id, receiptId: recExp.id, issueDate: new Date(Date.now() - 60000000000), validTo: new Date(Date.now() - 31536000000), status: 'EXPIRED', sealHash: 'hash-exp', sealSignature: 'sig-exp', payload: '{}', publicId: 'pub-cert-exp' } });

  // Revoked certificate
  const appRev = await prisma.application.create({ data: { id: 'APP-REV', businessId: biz3.id, instrumentId: inst3.id, status: 'CERTIFIED', feeSnapshot: 100, routedToRole: 'LMO' } });
  const payRev = await prisma.payment.create({ data: { id: 'pay-rev', applicationId: appRev.id, amount: 100, status: 'SUCCESS', idempotencyKey: crypto.randomUUID() } });
  const recRev = await prisma.receipt.create({ data: { id: 'REC-REV', applicationId: appRev.id, paymentId: payRev.id, signature: 'mock' } });
  await prisma.certificate.create({ data: { id: 'CERT-REV', applicationId: appRev.id, receiptId: recRev.id, issueDate: new Date(), validTo: new Date(Date.now() + 31536000000), status: 'REVOKED', sealHash: 'hash-rev', sealSignature: 'sig-rev', payload: '{}', publicId: 'pub-cert-rev' } });

  // In-progress application (GATC routed)
  await prisma.application.create({ data: { id: 'APP-GATC-1', businessId: biz2.id, instrumentId: inst2.id, status: 'SUBMITTED', feeSnapshot: 500, routedToRole: 'GATC' } });

  // In-progress application (LMO scheduled)
  const appSch = await prisma.application.create({ data: { id: 'APP-SCH', businessId: biz3.id, instrumentId: inst3.id, status: 'ACCEPTED', feeSnapshot: 100, routedToRole: 'LMO' } });
  await prisma.appointment.create({ data: { applicationId: appSch.id, officerId: lmo1.id, scheduledDate: new Date() } });

  console.log('Demo setup complete. Try logging in with admin@demo.com / password123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
