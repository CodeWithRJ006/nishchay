import request from 'supertest';
import { createApp } from './src/app';
import { initDb, prisma } from './src/db';
import jwt from 'jsonwebtoken';

async function main() {
  await initDb();
  const app = createApp();
  
  // Find a business
  const business = await prisma.business.findFirst({ include: { user: true } });
  if (!business) return console.log('No business found');
  
  const bToken = jwt.sign({ userId: business.user.id, role: business.user.role }, process.env.JWT_SECRET || 'dev');
  
  const instrument = await prisma.instrument.findFirst({ where: { businessId: business.id } });
  if (!instrument) return console.log('No instrument found');
  
  const res = await request(app)
    .post('/api/applications')
    .set('x-nishchay-csrf', '1')
    .set('Cookie', `token=${bToken}`)
    .send({ instrumentId: instrument.id });
    
  console.log('Status:', res.status);
  console.log('Body:', res.body);
}

main().catch(console.error).finally(() => prisma.$disconnect());
