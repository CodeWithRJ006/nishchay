import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from './app';
import { initDb, prisma } from './db';
import { issueCertificate } from './services/certificate';
import { clock } from '@nishchay/shared';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import pdfParse from 'pdf-parse';
import jsQR from 'jsqr';
import Jimp from 'jimp';

let app: any;
let appId: string;
let certId: string;
let publicId: string;
let bToken: string;
let adminToken: string;

beforeAll(async () => {
  await initDb();
  app = createApp();

  const suffix = Math.random().toString(36).substring(7);
  const bUser = await prisma.user.create({ data: { email: `biz_cert_${suffix}@test.com`, passwordHash: 'hash', name: 'Biz', role: 'BUSINESS' }});
  bToken = jwt.sign({ userId: bUser.id, role: bUser.role }, process.env.JWT_SECRET || 'dev_secret');
  
  const adminUser = await prisma.user.create({ data: { email: `admin_cert_${suffix}@test.com`, passwordHash: 'hash', name: 'Admin', role: 'ADMIN' }});
  adminToken = jwt.sign({ userId: adminUser.id, role: adminUser.role }, process.env.JWT_SECRET || 'dev_secret');

  const zone = await prisma.zone.create({ data: { id: `z_${suffix}`, name: `Zone_${suffix}` }});
  
  // Notice the XSS payload in tradeName
  const business = await prisma.business.create({
    data: { userId: bUser.id, tradeName: 'Biz <script>alert(1)</script>', ownerName: 'Biz', businessType: 'Retail', address: 'Add', zoneId: zone.id }
  });

  const officer = await prisma.user.create({ data: { email: `lmo_cert_${suffix}@test.com`, passwordHash: 'hash', name: 'LMO', role: 'LMO' }});
  
  const inst = await prisma.instrument.create({ data: { id: `i_${suffix}`, businessId: business.id, instrumentClass: 'Weights', serialNumber: `SN-${suffix}` }});

  const app1 = await prisma.application.create({ data: { id: `APP-CERT-${suffix}`, businessId: business.id, instrumentId: inst.id, status: 'PASSED', feeSnapshot: 100 }});
  appId = app1.id;

  const payment = await prisma.payment.create({ data: { applicationId: appId, amount: 100, status: 'SUCCESS', idempotencyKey: randomUUID() }});
  const receipt = await prisma.receipt.create({ data: { id: `NSH-R-${suffix}`, applicationId: appId, paymentId: payment.id, signature: 'mock' }});

  // Mock receipt signature bypass
  // wait, feeGate expects signReceipt signature. Let's create proper intent.
  // Actually I can just mock issueCertificate directly or fix the receipt signature here.
  // I will just use issueCertificate inside transaction, but first I need valid receipt sig.
  const { signReceipt } = await import('./services/payment');
  await prisma.receipt.update({ where: { id: receipt.id }, data: { signature: signReceipt(receipt.id, appId, 100) } });

  await prisma.appointment.create({ data: { applicationId: appId, officerId: officer.id, scheduledDate: new Date(), status: 'COMPLETED' }});

  await prisma.inspection.create({ data: {
    applicationId: appId, officerId: officer.id, pass: true, inspectedAt: new Date(),
    checklist: JSON.stringify({ 'rule1': true }),
    readings: JSON.stringify([{ nominal: 1, observed: 1 }]),
  }});

});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Certificate Issuance and PDF', () => {
  it('Round trip: issue, verify OK', async () => {
    const cert = await prisma.$transaction(async (tx) => {
      return await issueCertificate(tx, appId);
    });
    
    certId = cert.id;
    publicId = cert.publicId!;
    expect(cert).toBeDefined();
    
    // Verify OK
    const res = await request(app).get(`/api/public/verify/${publicId}`);
    expect(res.status).toBe(200);
    expect(res.body.isValid).toBe(true);
    expect(res.body.status).toBe('VALID');
  });
  
  it('20 parallel issueCertificate calls produce exactly one certificate', async () => {
    // We already issued 1, let's try 20 more on same app. Should throw.
    const calls = Array.from({ length: 20 }).map(() => prisma.$transaction(tx => issueCertificate(tx, appId)).catch(e => e));
    const results = await Promise.all(calls);
    const successes = results.filter(r => !(r instanceof Error) && !r.message);
    // Since unique constraint on applicationId in Certificate, it will fail
    expect(successes.length).toBe(0);
    const certs = await prisma.certificate.findMany({ where: { applicationId: appId } });
    expect(certs.length).toBe(1);
  });

  it('Mutate fields, verification fails', async () => {
    const cert = await prisma.certificate.findUnique({ where: { id: certId } });
    const payload = JSON.parse(cert!.payload);
    
    // Mutate one field
    payload.inspectedAt = new Date().toISOString();
    await prisma.certificate.update({ where: { id: certId }, data: { payload: JSON.stringify(payload) } });
    
    const res = await request(app).get(`/api/public/verify/${publicId}`);
    expect(res.status).toBe(200);
    expect(res.body.isValid).toBe(false);
    expect(res.body.status).toBe('ALTERED');
    
    // Restore
    await prisma.certificate.update({ where: { id: certId }, data: { payload: cert!.payload } });
  });

  it('Admin revoke action with reason', async () => {
    const res = await request(app).post(`/api/certificates/${certId}/revoke`).set('Cookie', `token=${adminToken}`).set('x-nishchay-csrf', '1').send({ reason: 'Test Revoke' });
    expect(res.status).toBe(200);
    
    const res2 = await request(app).get(`/api/public/verify/${publicId}`);
    expect(res2.body.isValid).toBe(false);
    expect(res2.body.status).toBe('REVOKED');
  });

  it('PDF opens and contains XSS escaped strings', async () => {
    const res = await request(app).get(`/api/certificates/${certId}/pdf`).set('Cookie', `token=${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    
    // pdfParse
    const pdfParseLib = await import('pdf-parse');
    const parse = pdfParseLib.default || pdfParseLib;
    const data = await (parse as any)(res.body);
    expect(data.text).toContain('CERTIFICATE OF VERIFICATION');
    expect(data.text).toContain(appId);
    
    // XSS strings are just strings in PDF
    expect(data.text).toContain('<script>alert(1)</script>'); // literal string, not executed
  });
});
