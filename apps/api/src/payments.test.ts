import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from './app';
import { initDb, prisma } from './db';
import { createIntent, signReceipt } from './services/payment';
import { clock } from '@nishchay/shared';
import jwt from 'jsonwebtoken';

let app: any;
let bToken: string;
let adminToken: string;
let businessId: string;
let appId1: string;
let appId2: string;

beforeAll(async () => {
  await initDb();
  app = createApp();

  // Create Business and Admin
  const suffix = Math.random().toString(36).substring(7);
  const admin = await prisma.user.create({ data: { email: `admin_pay_${suffix}@test.com`, passwordHash: 'hash', name: 'Admin', role: 'ADMIN' }});
  adminToken = jwt.sign({ userId: admin.id, role: admin.role }, process.env.JWT_SECRET || 'dev_secret');

  const bUser = await prisma.user.create({ data: { email: `biz_pay_${suffix}@test.com`, passwordHash: 'hash', name: 'Biz Pay', role: 'BUSINESS' }});
  
  const zone = await prisma.zone.create({ data: { id: `z_${suffix}`, name: `Zone_${suffix}` }});
  const business = await prisma.business.create({
    data: { userId: bUser.id, tradeName: 'Biz Pay', ownerName: 'Biz', businessType: 'Retail', address: 'Add', zoneId: zone.id, phone: '123', email: `biz_pay_${suffix}@test.com`, lat: 0, lng: 0 }
  });
  businessId = business.id;
  bToken = jwt.sign({ userId: bUser.id, role: bUser.role }, process.env.JWT_SECRET || 'dev_secret');

  // Create two instruments
  const inst1 = await prisma.instrument.create({ data: { id: `i1_${suffix}`, businessId, instrumentClass: 'class', serialNumber: `PAY-01-${suffix}`, capacity: '1kg', accuracyClass: 'M1', location: 'Lab' }});
  const inst2 = await prisma.instrument.create({ data: { id: `i2_${suffix}`, businessId, instrumentClass: 'class', serialNumber: `PAY-02-${suffix}`, capacity: '1kg', accuracyClass: 'M1', location: 'Lab' }});

  // Create Applications
  const app1 = await prisma.application.create({ data: { id: `APP-PAY-1-${suffix}`, businessId, instrumentId: inst1.id, status: 'SUBMITTED', type: 'NEW', feeSnapshot: 500 }});
  const app2 = await prisma.application.create({ data: { id: `APP-PAY-2-${suffix}`, businessId, instrumentId: inst2.id, status: 'SUBMITTED', type: 'NEW', feeSnapshot: 500 }});
  
  appId1 = app1.id;
  appId2 = app2.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

test('create payment intent', async () => {
  const res = await request(app)
    .post('/api/payments/intent')
    .set('x-nishchay-csrf', '1')
    .set('Cookie', `token=${bToken}`)
    .send({ applicationId: appId1 });
  
  expect(res.status).toBe(200);
  expect(res.body.idempotencyKey).toBeDefined();
  expect(res.body.payload).toBeDefined();
  expect(res.body.signature).toBeDefined();
});

test('50 parallel identical callbacks yield exactly one receipt', async () => {
  const intent = createIntent(appId1, 500);
  const payloadBase64 = Buffer.from(intent.payload).toString('base64');
  
  const requests = Array.from({ length: 50 }).map(() => 
    request(app).post('/api/payments/callback').set('x-nishchay-csrf', '1').send({
      payload: payloadBase64,
      signature: intent.signature,
      status: 'SUCCESS'
    })
  );

  const responses = await Promise.all(requests);
  const successCount = responses.filter(r => r.body.success === true).length;
  expect(successCount).toBe(1);

  const receipts = await prisma.receipt.findMany({ where: { applicationId: appId1 } });
  expect(receipts.length).toBe(1);
}, 20000);

test('forged signature is rejected', async () => {
  const intent = createIntent(appId2, 500);
  const payloadBase64 = Buffer.from(intent.payload).toString('base64');
  
  const res = await request(app).post('/api/payments/callback').set('x-nishchay-csrf', '1').send({
    payload: payloadBase64,
    signature: 'bad-signature',
    status: 'SUCCESS'
  });
  
  expect(res.status).toBe(400);
  expect(res.body.error).toBe('Invalid signature');
  
  const blocks = await prisma.auditLog.count({ where: { action: 'GATE_BLOCKED', afterSummary: { contains: 'Invalid signature' } } });
  expect(blocks).toBeGreaterThan(0);
});

test('wrong amount is rejected', async () => {
  // App2 fee is 500
  const intent = createIntent(appId2, 100); // wrong amount
  const payloadBase64 = Buffer.from(intent.payload).toString('base64');
  
  const res = await request(app).post('/api/payments/callback').set('x-nishchay-csrf', '1').send({
    payload: payloadBase64,
    signature: intent.signature,
    status: 'SUCCESS'
  });
  
  expect(res.status).toBe(400);
  expect(res.body.error).toBe('Wrong amount');
  
  const blocks = await prisma.auditLog.count({ where: { action: 'GATE_BLOCKED', entityId: appId2, afterSummary: 'Wrong amount' } });
  expect(blocks).toBeGreaterThan(0);
});

test('replay after 24h is rejected', async () => {
  const intent = createIntent(appId2, 500);
  const payloadBase64 = Buffer.from(intent.payload).toString('base64');
  
  // Advance clock by 25 hours
  const originalNow = clock.now;
  clock.now = () => originalNow() + 25 * 60 * 60 * 1000;
  
  const res = await request(app).post('/api/payments/callback').set('x-nishchay-csrf', '1').send({
    payload: payloadBase64,
    signature: intent.signature,
    status: 'SUCCESS'
  });
  
  clock.now = originalNow; // Restore
  
  expect(res.status).toBe(400);
  expect(res.body.error).toBe('Payload expired');
});

test('callback for a cancelled application is rejected', async () => {
  // Cancel app2
  await prisma.application.update({ where: { id: appId2 }, data: { status: 'CANCELLED' }});
  
  const intent = createIntent(appId2, 500);
  const payloadBase64 = Buffer.from(intent.payload).toString('base64');
  
  const res = await request(app).post('/api/payments/callback').set('x-nishchay-csrf', '1').send({
    payload: payloadBase64,
    signature: intent.signature,
    status: 'SUCCESS'
  });
  
  // Wait, my payments logic uses transition(app.status, 'payment_succeeded'). CANCELLED -> payment_succeeded will throw error.
  expect(res.status).toBe(400);
  expect(res.body.error).toContain('Invalid state transition');
});

test('admin view provides payments, receipts and gate blocks', async () => {
  const resP = await request(app).get('/api/admin/payments').set('Cookie', `token=${adminToken}`);
  expect(resP.status).toBe(200);
  expect(resP.body.length).toBeGreaterThan(0);

  const resR = await request(app).get('/api/admin/receipts').set('Cookie', `token=${adminToken}`);
  expect(resR.status).toBe(200);
  expect(resR.body.length).toBeGreaterThan(0);

  const resG = await request(app).get('/api/admin/gate-blocks').set('Cookie', `token=${adminToken}`);
  expect(resG.status).toBe(200);
  expect(resG.body.blocks).toBeGreaterThan(0);
});
