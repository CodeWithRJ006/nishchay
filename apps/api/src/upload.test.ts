import { expect, test, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from './app';
import jwt from 'jsonwebtoken';
import fs from 'fs';

let app: any;
let token: string;
const storageDir = process.env.STORAGE_DIR || './storage';

beforeAll(() => {
  app = createApp();
  token = jwt.sign({ userId: 'u1', role: 'BUSINESS' }, process.env.JWT_SECRET || 'dev');
  if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir);
});

test('upload abuse cases', async () => {
  // 1. executable renamed .jpg
  const fakeJpg = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xFF\xFF\x00\x00');
  const res1 = await request(app)
    .post('/api/upload')
    .set('x-nishchay-csrf', '1')
    .set('Cookie', `token=${token}`)
    .attach('file', fakeJpg, { filename: 'malware.jpg', contentType: 'image/jpeg' });
  expect(res1.status).toBe(400);

  // 2. 6 MB file
  const largeFile = Buffer.alloc(6 * 1024 * 1024, 'a');
  const res2 = await request(app)
    .post('/api/upload')
    .set('x-nishchay-csrf', '1')
    .set('Cookie', `token=${token}`)
    .attach('file', largeFile, { filename: 'large.jpg', contentType: 'image/jpeg' });
  expect(res2.status).toBe(500); // MulterError default handled as 500

  // 3. SVG
  const svg = Buffer.from('<svg></svg>');
  const res3 = await request(app)
    .post('/api/upload')
    .set('x-nishchay-csrf', '1')
    .set('Cookie', `token=${token}`)
    .attach('file', svg, { filename: 'icon.svg', contentType: 'image/svg+xml' });
  expect(res3.status).toBe(400);

  // 4. path traversal
  const res4 = await request(app)
    .get('/api/upload/..%2f..%2f.env')
    .set('Cookie', `token=${token}`);
  expect(res4.status).toBe(400);
});
