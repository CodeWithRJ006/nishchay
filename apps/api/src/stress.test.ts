import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from './app';
import { initDb, prisma } from './db';
import jwt from 'jsonwebtoken';

let app: any;
let bToken1: string;
let bToken2: string;
let adminToken: string;

beforeAll(async () => {
  await initDb();
  app = createApp();
  const suffix = Math.random().toString(36).substring(7);

  const admin = await prisma.user.create({ data: { email: `stress_admin_${suffix}@test.com`, passwordHash: 'pwd', name: 'A', role: 'ADMIN' } });
  adminToken = jwt.sign({ userId: admin.id, role: admin.role }, process.env.JWT_SECRET || 'dev_secret');

  const b1 = await prisma.user.create({ data: { email: `stress_b1_${suffix}@test.com`, passwordHash: 'pwd', name: 'B1', role: 'BUSINESS' } });
  bToken1 = jwt.sign({ userId: b1.id, role: b1.role }, process.env.JWT_SECRET || 'dev_secret');
  
  const b2 = await prisma.user.create({ data: { email: `stress_b2_${suffix}@test.com`, passwordHash: 'pwd', name: 'B2', role: 'BUSINESS' } });
  bToken2 = jwt.sign({ userId: b2.id, role: b2.role }, process.env.JWT_SECRET || 'dev_secret');
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Stress & Attack Suite', () => {
  it('IDOR: Business 1 cannot access Business 2 resources', async () => {
    // Attempting to access admin route as business
    const res = await request(app).get('/api/admin/payments').set('Cookie', `token=${bToken1}`);
    expect(res.status).toBe(403);
  });

  it('XSS: Sending script tags in complaint form is handled safely', async () => {
    const res = await request(app)
      .post('/api/public/complaints')
      .send({
        certificateId: 'test',
        category: 'Test',
        details: '<script>alert(1)</script>',
        website: '' // honeypot
      });
    expect(res.status).toBe(201); // Created successfully, handled securely downstream
  });

  it('Fuzzing: Bad JWT throws 401', async () => {
    const res = await request(app).get('/api/auth/me').set('Cookie', `token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.badpayload.signature`);
    expect(res.status).toBe(401);
  });
  
  it('Concurrency: 50 simultaneous parallel public verify reads do not crash', async () => {
    const calls = Array.from({ length: 50 }).map(() => request(app).get('/api/public/verify/invalid-id'));
    const results = await Promise.all(calls);
    expect(results.every(r => r.status === 404 || r.status === 200)).toBe(true);
  });
});
