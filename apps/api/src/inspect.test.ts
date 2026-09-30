import { test, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { verifySeal } from '@nishchay/shared';
import { createApp } from './app';
import { prisma } from './db';
import bcrypt from 'bcryptjs';

let app: any;
let businessToken: string;
let officerToken: string;
let otherOfficerToken: string;
let appId: string;
let instrumentId: string;
let officerId: string;
let otherOfficerId: string;

beforeAll(async () => {
  app = createApp();

  await prisma.inspectionPhoto.deleteMany({});
  await prisma.inspection.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.certificate.deleteMany({});
  await prisma.receipt.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.appointment.deleteMany({});
  await prisma.application.deleteMany({});
  await prisma.instrument.deleteMany({});
  await prisma.business.deleteMany({});
  await prisma.user.deleteMany({});

  const hash = await bcrypt.hash('Password1!', 10);
  
  await prisma.zone.upsert({
    where: { id: 'ZONE-A' },
    update: {},
    create: { id: 'ZONE-A', name: 'Zone A' }
  });

  const bUser = await prisma.user.create({
    data: { id: 'B-INSPECT', email: 'b-inspect@test.com', name: 'Biz', passwordHash: hash, role: 'BUSINESS' }
  });
  await prisma.business.create({
    data: { id: 'B-INSPECT-BIZ', userId: bUser.id, tradeName: 'Shop', address: '123', zoneId: 'ZONE-A', lat: 0, lng: 0, ownerName: 'A', businessType: 'B', phone: '123' }
  });

  const o1 = await prisma.user.create({
    data: { id: 'O-INSPECT-1', email: 'o1-inspect@test.com', name: 'O1', passwordHash: hash, role: 'LMO', zones: { connect: { id: 'ZONE-A' } } }
  });
  const o2 = await prisma.user.create({
    data: { id: 'O-INSPECT-2', email: 'o2-inspect@test.com', name: 'O2', passwordHash: hash, role: 'LMO', zones: { connect: { id: 'ZONE-A' } } }
  });

  officerId = o1.id;
  otherOfficerId = o2.id;

  const bLogin = await request(app).post('/api/auth/login').set('x-nishchay-csrf', '1').send({ email: 'b-inspect@test.com', password: 'Password1!' });
  businessToken = bLogin.headers['set-cookie'][0];

  const o1Login = await request(app).post('/api/auth/login').set('x-nishchay-csrf', '1').send({ email: 'o1-inspect@test.com', password: 'Password1!' });
  officerToken = o1Login.headers['set-cookie'][0];

  const o2Login = await request(app).post('/api/auth/login').set('x-nishchay-csrf', '1').send({ email: 'o2-inspect@test.com', password: 'Password1!' });
  otherOfficerToken = o2Login.headers['set-cookie'][0];
});

test('officer inspects application', async () => {
  const instrRes = await request(app)
    .post('/api/instruments')
    .set('Cookie', businessToken)
    .set('x-nishchay-csrf', '1')
    .send({ instrumentClass: 'Weights', make: 'M', model: 'MD', serialNumber: 'SN-INSPECT', capacity: '10', location: 'Here' });
  
  if (instrRes.status !== 201) console.error(instrRes.body);
  expect(instrRes.status).toBe(201);
  instrumentId = instrRes.body.instrument.id;

  const appRes = await request(app)
    .post('/api/applications')
    .set('Cookie', businessToken)
    .set('x-nishchay-csrf', '1')
    .send({ instrumentId });
  
  if (appRes.status !== 201) console.error(appRes.body);
  expect(appRes.status).toBe(201);
  appId = appRes.body.id;

  await request(app).post(`/api/applications/${appId}/simulate_payment`).set('Cookie', businessToken).set('x-nishchay-csrf', '1');
  
  await prisma.application.update({ where: { id: appId }, data: { status: 'SCHEDULED' } });
  await prisma.appointment.create({
    data: { applicationId: appId, officerId: officerId, scheduledDate: new Date() }
  });

  const badPhoto = await request(app)
    .post('/api/upload')
    .set('Cookie', otherOfficerToken)
    .set('x-nishchay-csrf', '1')
    .attach('file', Buffer.from([0xFF, 0xD8, 0xFF, 0x00]), { filename: 'test.jpg', contentType: 'image/jpeg' })
    .field('applicationId', appId);
  expect(badPhoto.status).toBe(403);

  const acceptRes = await request(app).post(`/api/applications/${appId}/accept`).set('Cookie', officerToken).set('x-nishchay-csrf', '1');
  expect(acceptRes.status).toBe(200);

  const badInspect = await request(app)
    .post(`/api/applications/${appId}/inspect`)
    .set('Cookie', otherOfficerToken)
    .set('x-nishchay-csrf', '1')
    .send({ pass: true, checklist: {}, readings: [], reasons: [], photos: [] });
  expect(badInspect.status).toBe(403);

  const inspectRes = await request(app)
    .post(`/api/applications/${appId}/inspect`)
    .set('Cookie', officerToken)
    .set('x-nishchay-csrf', '1')
    .send({
      pass: true,
      checklist: { condition: 'good' },
      readings: [{ nominal: 10, observed: 10 }],
      reasons: [],
      photos: [{ fileUrl: '/api/upload/fake.jpg', sha256: 'abc', capturedAt: new Date().toISOString(), source: 'camera' }]
    });
  if (inspectRes.status !== 200) console.error(inspectRes.body);
  expect(inspectRes.status).toBe(200);
  
  const finalApp = await prisma.application.findUnique({ 
    where: { id: appId },
    include: { certificate: true }
  });
  expect(finalApp?.status).toBe('INSPECTED_PASS');
  expect(finalApp?.certificate).toBeDefined();
  
  const certId = finalApp!.certificate!.id;

  const getCertRes = await request(app).get(`/api/certificates/${certId}`);
  expect(getCertRes.status).toBe(200);
  expect(getCertRes.body.status).toBe('VALID');

  const pubKeyRes = await request(app).get('/api/certificates/public-key');
  expect(pubKeyRes.status).toBe(200);
  
  // modify certificate payload
  await prisma.certificate.update({
    where: { id: certId },
    data: { payload: getCertRes.body.payload.replace('LMO', 'GATC') }
  });

  const getModifiedCertRes = await request(app).get(`/api/certificates/${certId}`);
  expect(getModifiedCertRes.status).toBe(200);
  
  const isValid = verifySeal(
    JSON.parse(getModifiedCertRes.body.payload),
    getModifiedCertRes.body.sealSignature,
    pubKeyRes.body.publicKey
  );
  expect(isValid).toBe(false);
});
