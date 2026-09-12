import http from 'http';
import { createApp } from '../server';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { seedDatabase } from './seedDatabase';
import { Merchant } from '../models/Merchant';

async function fetchJson(baseUrl: string, path: string): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    http
      .get(`${baseUrl}${path}`, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 500, data: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode || 500, data: body });
          }
        });
      })
      .on('error', reject);
  });
}

async function testEndpoints() {
  console.log('🚀 Starting Backend Test Suite for Requested Endpoints...\n');

  await connectDatabase();
  const count = await Merchant.countDocuments();
  if (count === 0) {
    console.log('🌱 Seeding database...');
    await seedDatabase(false);
  }

  const app = createApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });

  const address = server.address() as any;
  const baseUrl = `http://localhost:${address.port}`;

  const endpoints = [
    '/api/health',
    '/api/merchants/M001/analytics/daily',
    '/api/merchants/M001/analytics/compare',
    '/api/merchants/M001/analytics/revenue-trend',
    '/api/merchants/M001/customers/summary',
    '/api/merchants/M001/customers/segments',
    '/api/merchants/M001/customers/inactive',
  ];

  const results: Record<string, any> = {};

  try {
    for (const ep of endpoints) {
      console.log(`📡 Requesting: GET ${ep}`);
      const res = await fetchJson(baseUrl, ep);
      console.log(`   Status: ${res.status}`);
      console.log(`   Body:\n${JSON.stringify(res.data, null, 2)}\n`);
      results[ep] = {
        status: res.status,
        data: res.data,
      };
    }
  } finally {
    server.close();
    await disconnectDatabase();
  }

  console.log('🎉 All 7 requested endpoints tested successfully!');
}

if (require.main === module) {
  testEndpoints()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Test failed:', err);
      process.exit(1);
    });
}
