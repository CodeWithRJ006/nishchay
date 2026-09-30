import { expect, test, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from './app';
import { initDb, prisma } from './db';
import { clock } from '@nishchay/shared';

let app: any;

beforeAll(async () => {
  await initDb();
  app = createApp();
  await prisma.instrumentDocument.deleteMany();
  await prisma.instrument.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.business.deleteMany();
  await prisma.zone.deleteMany();
  await prisma.user.deleteMany();
});

test('login requires CSRF header', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'test@example.com', password: 'password' });
  expect(res.status).toBe(403);
  expect(res.body.code).toBe('CSRF_FAILED');
});

test('register works with CSRF header', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .set('x-nishchay-csrf', '1')
    .send({
      email: 'test@example.com',
      password: 'password',
      name: 'Test User',
      tradeName: 'Test Business',
      ownerName: 'Test Owner',
      businessType: 'Retail',
      address: '123 Test St'
    });
  expect(res.status).toBe(201);
});

test('login with incorrect password fails and locks out', async () => {
  const tClock = clock.setTestClock(new Date().getTime());
  
  // Try 5 times (all wrong password)
  for (let i = 0; i < 5; i++) {
    const res = await request(app)
      .post('/api/auth/login')
      .set('x-nishchay-csrf', '1')
      .send({ email: 'test@example.com', password: 'wrong' });
    expect(res.status).toBe(401);
  }
  
  // 6th time should be locked out (even if password is correct)
  const res = await request(app)
    .post('/api/auth/login')
    .set('x-nishchay-csrf', '1')
    .send({ email: 'test@example.com', password: 'password' });
  expect(res.status).toBe(401);
  expect(res.body.message).toBe('Account locked');
  
  // Advance clock by 15 mins (900000 ms)
  tClock.advance(900000 + 1000);
  
  // Should work now
  const res2 = await request(app)
    .post('/api/auth/login')
    .set('x-nishchay-csrf', '1')
    .send({ email: 'test@example.com', password: 'password' });
  expect(res2.status).toBe(200);
  expect(res2.headers['set-cookie'][0]).toContain('token=');
  expect(res2.headers['set-cookie'][0]).toContain('HttpOnly');
  
  clock.reset();
});
