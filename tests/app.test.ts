// src/app.test.ts
import request from 'supertest';
import app from '../src/app';

test('GET /health should return "SUCCESS"', async () => {
  const response = await request(app).get('/health');
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ status: 'UP' });
});
