import { expect, test, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from './app';
import { initDb, prisma } from './db';
import jwt from 'jsonwebtoken';

let app: any;
let businessToken: string;
let otherBusinessToken: string;
let adminToken: string;
let instrumentId: string;

beforeAll(async () => {
  await initDb();
  app = createApp();

  await prisma.instrumentDocument.deleteMany();
  await prisma.instrument.deleteMany();
  await prisma.business.deleteMany();
  await prisma.zone.deleteMany();
  await prisma.user.deleteMany();

  const zone = await prisma.zone.create({ data: { name: 'Zone A' } });

  const u1 = await prisma.user.create({
    data: {
      email: 'b1@test.com', passwordHash: 'pwd', name: 'B1', role: 'BUSINESS',
      business: {
        create: {
          tradeName: 'T1', ownerName: 'O1', businessType: 'B1', address: 'A1', zoneId: zone.id
        }
      }
    }
  });
  businessToken = jwt.sign({ userId: u1.id, role: u1.role }, process.env.JWT_SECRET || 'dev');

  const u2 = await prisma.user.create({
    data: {
      email: 'b2@test.com', passwordHash: 'pwd', name: 'B2', role: 'BUSINESS',
      business: {
        create: {
          tradeName: 'T2', ownerName: 'O2', businessType: 'B2', address: 'A2', zoneId: zone.id
        }
      }
    }
  });
  otherBusinessToken = jwt.sign({ userId: u2.id, role: u2.role }, process.env.JWT_SECRET || 'dev');

  const a1 = await prisma.user.create({ data: { email: 'a1@test.com', passwordHash: 'pwd', name: 'A1', role: 'ADMIN' } });
  adminToken = jwt.sign({ userId: a1.id, role: a1.role }, process.env.JWT_SECRET || 'dev');
});

test('create instrument works and enforces unique serial per business', async () => {
  const res = await request(app)
    .post('/api/instruments')
    .set('x-nishchay-csrf', '1')
    .set('Cookie', `token=${businessToken}`)
    .send({ serialNumber: 'SN-001', instrumentClass: 'Weight' });
  
  expect(res.status).toBe(201);
  instrumentId = res.body.instrument.id;

  // duplicate serial should fail
  const res2 = await request(app)
    .post('/api/instruments')
    .set('x-nishchay-csrf', '1')
    .set('Cookie', `token=${businessToken}`)
    .send({ serialNumber: 'SN-001', instrumentClass: 'Weight' });
  expect(res2.status).toBe(400);

  // other business can use the same serial
  const res3 = await request(app)
    .post('/api/instruments')
    .set('x-nishchay-csrf', '1')
    .set('Cookie', `token=${otherBusinessToken}`)
    .send({ serialNumber: 'SN-001', instrumentClass: 'Weight' });
  expect(res3.status).toBe(201);
});

test('canViewInstrument object policy', async () => {
  // Creator can view
  const res1 = await request(app)
    .get(`/api/instruments/${instrumentId}`)
    .set('Cookie', `token=${businessToken}`);
  console.log('Error 500 body:', res1.body);
  expect(res1.status).toBe(200);

  // Other business cannot view
  const res2 = await request(app)
    .get(`/api/instruments/${instrumentId}`)
    .set('Cookie', `token=${otherBusinessToken}`);
  expect(res2.status).toBe(403);

  // Admin can view
  const res3 = await request(app)
    .get(`/api/instruments/${instrumentId}`)
    .set('Cookie', `token=${adminToken}`);
  expect(res3.status).toBe(200);
});
