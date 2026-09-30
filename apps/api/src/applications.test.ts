import { expect, test, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from './app';
import { initDb, prisma } from './db';
import jwt from 'jsonwebtoken';

let app: any;
let bToken: string;
let bToken2: string;
let lmoToken: string;
let gatcToken: string;
let instLmo: string;
let instGatc: string;
let zoneId: string;
let adminToken: string;

beforeAll(async () => {
  await initDb();
  app = createApp();

  await prisma.auditLog.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.application.deleteMany();
  await prisma.instrument.deleteMany();
  await prisma.business.deleteMany();
  await prisma.zone.deleteMany();
  await prisma.user.deleteMany();

  const zone = await prisma.zone.create({ data: { name: 'Zone App' } });
  zoneId = zone.id;

  const b1 = await prisma.user.create({
    data: {
      email: 'bapp@test.com', passwordHash: 'pwd', name: 'BApp', role: 'BUSINESS',
      business: {
        create: { tradeName: 'T1', ownerName: 'O1', businessType: 'B1', address: 'A1', zoneId }
      }
    }
  });
  bToken = jwt.sign({ userId: b1.id, role: b1.role }, process.env.JWT_SECRET || 'dev');

  const b2 = await prisma.user.create({
    data: {
      email: 'bapp2@test.com', passwordHash: 'pwd', name: 'BApp2', role: 'BUSINESS',
      business: {
        create: { tradeName: 'T2', ownerName: 'O2', businessType: 'B2', address: 'A2', zoneId }
      }
    }
  });
  bToken2 = jwt.sign({ userId: b2.id, role: b2.role }, process.env.JWT_SECRET || 'dev');

  const lmo = await prisma.user.create({
    data: {
      email: 'lmo_app@test.com', passwordHash: 'pwd', name: 'LMO App', role: 'LMO',
      zones: { connect: [{ id: zoneId }] }
    }
  });
  lmoToken = jwt.sign({ userId: lmo.id, role: lmo.role }, process.env.JWT_SECRET || 'dev');

  const gatc = await prisma.user.create({
    data: {
      email: 'gatc_app@test.com', passwordHash: 'pwd', name: 'GATC App', role: 'GATC',
      zones: { connect: [{ id: zoneId }] }
    }
  });
  gatcToken = jwt.sign({ userId: gatc.id, role: gatc.role }, process.env.JWT_SECRET || 'dev');

  const ad = await prisma.user.create({ data: { email: 'ad@test.com', passwordHash: 'pwd', name: 'A', role: 'ADMIN' } });
  adminToken = jwt.sign({ userId: ad.id, role: ad.role }, process.env.JWT_SECRET || 'dev');

  // Create instruments
  const business1 = await prisma.business.findUnique({ where: { userId: b1.id } });
  const inst1 = await prisma.instrument.create({
    data: { id: 'INST-1', businessId: business1!.id, serialNumber: '1', instrumentClass: 'Weights' } // LMO
  });
  instLmo = inst1.id;

  const inst2 = await prisma.instrument.create({
    data: { id: 'INST-2', businessId: business1!.id, serialNumber: '2', instrumentClass: 'NAWI class III up to 150 kg' } // GATC
  });
  instGatc = inst2.id;
});

let appIdLmo: string;
let appIdGatc: string;

test('create application for LMO instrument', async () => {
  const res = await request(app)
    .post('/api/applications')
    .set('x-nishchay-csrf', '1')
    .set('Cookie', `token=${bToken}`)
    .send({ instrumentId: instLmo });
  if (res.status === 500) console.error("TEST1 500 ERROR:", res.body);
  expect(res.status).toBe(201);
  expect(res.body.routedToRole).toBe('LMO');
  expect(res.body.status).toBe('SUBMITTED');
  appIdLmo = res.body.id;
});

test('create application for GATC instrument', async () => {
  const res = await request(app)
    .post('/api/applications')
    .set('x-nishchay-csrf', '1')
    .set('Cookie', `token=${bToken}`)
    .send({ instrumentId: instGatc });
  expect(res.status).toBe(201);
  expect(res.body.routedToRole).toBe('GATC');
  appIdGatc = res.body.id;
});

test('scheduling before payment is rejected', async () => {
  const res = await request(app)
    .post(`/api/applications/${appIdLmo}/schedule`)
    .set('x-nishchay-csrf', '1')
    .set('Cookie', `token=${bToken}`)
    .send({ date: new Date().toISOString() });
  expect(res.status).toBe(400);
  expect(res.body.error).toContain('Invalid transition');
});

test('payment success changes state', async () => {
  const res = await request(app)
    .post(`/api/applications/${appIdLmo}/simulate_payment`)
    .set('x-nishchay-csrf', '1')
    .set('Cookie', `token=${bToken}`);
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('PAID');
});

test('scheduling after payment succeeds', async () => {
  // get slots
  const slotsRes = await request(app)
    .get(`/api/applications/${appIdLmo}/slots`)
    .set('Cookie', `token=${bToken}`);
  expect(slotsRes.status).toBe(200);
  const slots = slotsRes.body.slots;
  expect(slots.length).toBe(10);

  // schedule
  const res = await request(app)
    .post(`/api/applications/${appIdLmo}/schedule`)
    .set('x-nishchay-csrf', '1')
    .set('Cookie', `token=${bToken}`)
    .send({ date: slots[0] });
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('SCHEDULED');

  // Verify officer assigned is LMO
  const appInDb = await prisma.application.findUnique({ where: { id: appIdLmo }, include: { appointment: true } });
  const officer = await prisma.user.findUnique({ where: { id: appInDb!.appointment!.officerId } });
  expect(officer!.role).toBe('LMO');
});

test('officer accept', async () => {
  const res = await request(app)
    .post(`/api/applications/${appIdLmo}/accept`)
    .set('x-nishchay-csrf', '1')
    .set('Cookie', `token=${lmoToken}`);
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('ACCEPTED');
});

test('officer reject reverts to PAID', async () => {
  // We need a paid application
  await request(app).post(`/api/applications/${appIdGatc}/simulate_payment`).set('x-nishchay-csrf', '1').set('Cookie', `token=${bToken}`);
  const slotsRes = await request(app).get(`/api/applications/${appIdGatc}/slots`).set('Cookie', `token=${bToken}`);
  await request(app)
    .post(`/api/applications/${appIdGatc}/schedule`)
    .set('x-nishchay-csrf', '1')
    .set('Cookie', `token=${bToken}`)
    .send({ date: slotsRes.body.slots[0] });

  // Now GATC officer rejects
  const res = await request(app)
    .post(`/api/applications/${appIdGatc}/reject`)
    .set('x-nishchay-csrf', '1')
    .set('Cookie', `token=${gatcToken}`)
    .send({ reason: 'Busy' });
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('PAID');

  // Appointment should be deleted
  const appInDb = await prisma.application.findUnique({ where: { id: appIdGatc }, include: { appointment: true } });
  expect(appInDb!.appointment).toBeNull();
});

test('timeline is populated', async () => {
  const res = await request(app)
    .get(`/api/applications/${appIdLmo}/timeline`)
    .set('Cookie', `token=${bToken}`);
  expect(res.status).toBe(200);
  expect(res.body.length).toBeGreaterThanOrEqual(3);
  expect(res.body.some((l: any) => l.action === 'submit')).toBe(true);
  expect(res.body.some((l: any) => l.action === 'payment_succeeded')).toBe(true);
  expect(res.body.some((l: any) => l.action === 'schedule')).toBe(true);
});

test('concurrency: simultaneous scheduling for the same application', async () => {
  // To test this, we need a paid application. We can use the GATC one since it was rejected and reverted to PAID.
  const slotsRes = await request(app).get(`/api/applications/${appIdGatc}/slots`).set('Cookie', `token=${bToken}`);
  const slot = slotsRes.body.slots[1];
  const req1 = request(app).post(`/api/applications/${appIdGatc}/schedule`).set('x-nishchay-csrf', '1').set('Cookie', `token=${bToken}`).send({ date: slot });
  const req2 = request(app).post(`/api/applications/${appIdGatc}/schedule`).set('x-nishchay-csrf', '1').set('Cookie', `token=${bToken}`).send({ date: slot });
  
  const [res1, res2] = await Promise.all([req1, req2]);
  
  // One should succeed or they both fail if it's already scheduled, but actually one will be 400 (Invalid transition from SCHEDULED) or 409
  const statuses = [res1.status, res2.status].sort();
  expect(statuses.includes(400) || statuses.includes(409)).toBe(true); // at least one failed
});

test('concurrency: two officers accepting the same appointment', async () => {
  // Now appIdGatc is SCHEDULED. We have gatcToken and lmoToken. Only GATC officer can accept.
  // We can simulate two requests from the same officer to accept.
  const req1 = request(app).post(`/api/applications/${appIdGatc}/accept`).set('x-nishchay-csrf', '1').set('Cookie', `token=${gatcToken}`);
  const req2 = request(app).post(`/api/applications/${appIdGatc}/accept`).set('x-nishchay-csrf', '1').set('Cookie', `token=${gatcToken}`);
  
  const [res1, res2] = await Promise.all([req1, req2]);
  
  const statuses = [res1.status, res2.status].sort();
  // One should be 200, one should be 400 (Invalid transition from ACCEPTED)
  expect(statuses).toEqual([200, 400]);
});
