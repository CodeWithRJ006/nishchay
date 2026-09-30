import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from './app';
import { initDb, prisma } from './db';
import jwt from 'jsonwebtoken';

let app: any;
let adminToken: string;
let bToken: string;
let bTokenExportForbidden: string;

beforeAll(async () => {
  await initDb();
  app = createApp();

  const suffix = Math.random().toString(36).substring(7);
  
  const adminUser = await prisma.user.create({ data: { email: `admin_search_${suffix}@test.com`, passwordHash: 'hash', name: 'Admin', role: 'ADMIN' }});
  adminToken = jwt.sign({ userId: adminUser.id, role: adminUser.role }, process.env.JWT_SECRET || 'dev_secret');

  const bUser = await prisma.user.create({ data: { email: `biz_search_${suffix}@test.com`, passwordHash: 'hash', name: 'Biz', role: 'BUSINESS' }});
  bToken = jwt.sign({ userId: bUser.id, role: bUser.role }, process.env.JWT_SECRET || 'dev_secret');

  const zone = await prisma.zone.create({ data: { id: `z_${suffix}`, name: `Zone_${suffix}` }});
  
  // Notice the injection payload in tradeName
  const business = await prisma.business.create({
    data: { userId: bUser.id, tradeName: '=cmd|\\\' /C calc\'!A0', ownerName: 'Biz', businessType: 'Retail', address: 'Add', zoneId: zone.id }
  });

  const inst = await prisma.instrument.create({ data: { id: `i_${suffix}`, businessId: business.id, instrumentClass: 'Weights', serialNumber: `SN-${suffix}` }});

  const app1 = await prisma.application.create({ data: { id: `APP-SEARCH-${suffix}`, businessId: business.id, instrumentId: inst.id, status: 'CERTIFIED', feeSnapshot: 100 }});

  const payment = await prisma.payment.create({ data: { applicationId: app1.id, amount: 100, status: 'SUCCESS', idempotencyKey: `idemp_${suffix}` }});
  const receipt = await prisma.receipt.create({ data: { id: `NSH-R-SEARCH-${suffix}`, applicationId: app1.id, paymentId: payment.id, signature: 'mock' }});

  await prisma.certificate.create({
    data: {
      id: `CERT-SEARCH-${suffix}`,
      applicationId: app1.id,
      receiptId: receipt.id,
      issueDate: new Date(),
      validTo: new Date(Date.now() + 100000),
      status: 'VALID',
      sealHash: 'hash',
      sealSignature: 'sig',
      payload: '{}',
      publicId: `pub-${suffix}`
    }
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Search and CSV export', () => {
  it('Searches certificates with role scoping (Admin gets all)', async () => {
    const res = await request(app).get(`/api/search/certificates`).set('Cookie', `token=${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });

  it('Searches certificates with filters', async () => {
    const res = await request(app).get(`/api/search/certificates?instrumentClass=Weights`).set('Cookie', `token=${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.every((c: any) => c.instrumentClass === 'Weights')).toBe(true);
  });

  it('CSV Export prevents formula injection', async () => {
    const res = await request(app).get(`/api/search/certificates?export=true`).set('Cookie', `token=${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    // Ensure the = is prefixed with '
    expect(res.text).toContain(`"'=cmd|\\' /C calc'!A0"`); 
  });

  it('CSV Export is forbidden for businesses', async () => {
    const res = await request(app).get(`/api/search/certificates?export=true`).set('Cookie', `token=${bToken}`);
    expect(res.status).toBe(403);
  });
});
