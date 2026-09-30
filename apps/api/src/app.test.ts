import { expect, test } from 'vitest';
import request from 'supertest';
import { createApp } from './app';

test('GET /api/health returns ok', async () => {
  const app = createApp();
  const response = await request(app).get('/api/health');
  expect(response.status).toBe(200);
  expect(response.body.status).toBe('ok');
  expect(response.body.version).toBe('1.0.0');
});
