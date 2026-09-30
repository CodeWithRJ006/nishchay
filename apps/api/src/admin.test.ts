import { expect, test, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from './app';
import { initDb, prisma } from './db';
import jwt from 'jsonwebtoken';

let app: any;
let adminToken: string;

beforeAll(async () => {
  await initDb();
  app = createApp();
  
  await prisma.instrumentDocument.deleteMany();
  await prisma.instrument.deleteMany();
  await prisma.business.deleteMany();
  await prisma.zone.deleteMany();
  await prisma.user.deleteMany();
  
  const a1 = await prisma.user.create({ data: { email: 'admin@test.com', passwordHash: 'pwd', name: 'Admin', role: 'ADMIN' } });
  adminToken = jwt.sign({ userId: a1.id, role: a1.role }, process.env.JWT_SECRET || 'dev');
});

test('admin can provision LMO and GATC', async () => {
  const zone = await prisma.zone.create({ data: { name: 'Zone B' } });
  
  const res1 = await request(app)
    .post('/api/admin/lmo')
    .set('x-nishchay-csrf', '1')
    .set('Cookie', `token=${adminToken}`)
    .send({ email: 'lmo@test.com', password: 'pwd', name: 'LMO1', zoneIds: [zone.id], dailyCapacity: 10 });
  expect(res1.body).toHaveProperty('status', 'success');
  expect(res1.status).toBe(201);
  
  const lmo = await prisma.user.findUnique({ where: { id: res1.body.id }, include: { zones: true } });
  expect(lmo?.role).toBe('LMO');
  expect(lmo?.dailyCapacity).toBe(10);
  expect(lmo?.zones[0].id).toBe(zone.id);

  const res2 = await request(app)
    .post('/api/admin/gatc')
    .set('x-nishchay-csrf', '1')
    .set('Cookie', `token=${adminToken}`)
    .send({ email: 'gatc@test.com', password: 'pwd', name: 'GATC1', zoneIds: [zone.id], centreName: 'GATC Centre' });
  expect(res2.status).toBe(201);
  
  const gatc = await prisma.user.findUnique({ where: { id: res2.body.id }, include: { zones: true } });
  expect(gatc?.role).toBe('GATC');
  expect(gatc?.centreName).toBe('GATC Centre');
  expect(gatc?.zones[0].id).toBe(zone.id);
});
