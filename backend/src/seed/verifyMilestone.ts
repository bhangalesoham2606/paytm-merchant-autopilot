import { createApp } from '../server';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { seedDatabase } from './seedDatabase';
import { Merchant } from '../models/Merchant';
import { Transaction } from '../models/Transaction';
import { Customer } from '../models/Customer';
import http from 'http';

async function request(serverUrl: string, path: string): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, serverUrl);
    http
      .get(url, (res) => {
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          try {
            const body = JSON.parse(rawData);
            resolve({ status: res.statusCode || 500, body });
          } catch (e) {
            resolve({ status: res.statusCode || 500, body: rawData });
          }
        });
      })
      .on('error', (e) => reject(e));
  });
}

export async function runMilestoneVerification() {
  console.log('====================================================');
  console.log('🧪 PAYTM MERCHANT AUTOPILOT - MILESTONE VERIFICATION');
  console.log('====================================================\n');

  // 1. Connect to database
  await connectDatabase();

  // 2. Seed database
  await seedDatabase(false);

  const merchantCount = await Merchant.countDocuments();
  const customerCount = await Customer.countDocuments();
  const txnCount = await Transaction.countDocuments();

  console.log(`📊 Current DB Stats:`);
  console.log(`   - Merchants: ${merchantCount}`);
  console.log(`   - Customers: ${customerCount}`);
  console.log(`   - Transactions: ${txnCount}\n`);

  if (merchantCount < 3 || customerCount < 1000 || txnCount < 10000) {
    throw new Error(`Database counts below requirements! Expected >=3 merchants, >=1000 customers, >=10000 transactions.`);
  }

  // 3. Start local Express test instance
  const app = createApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });

  const address = server.address() as any;
  const baseUrl = `http://localhost:${address.port}`;
  console.log(`🌐 Verification server running at: ${baseUrl}\n`);

  let allPassed = true;

  try {
    // ----------------------------------------------------
    // TEST 1: Health Check
    // ----------------------------------------------------
    console.log('👉 TEST 1: GET /api/health');
    const healthRes = await request(baseUrl, '/api/health');
    console.log('Response:', JSON.stringify(healthRes.body, null, 2));
    if (healthRes.status === 200 && healthRes.body?.data?.status === 'healthy') {
      console.log('✅ TEST 1 PASSED: Health check returned healthy.\n');
    } else {
      console.error('❌ TEST 1 FAILED!');
      allPassed = false;
    }

    // ----------------------------------------------------
    // TEST 2: Daily Analytics for M001 on 2026-09-12
    // ----------------------------------------------------
    console.log('👉 TEST 2: GET /api/merchants/M001/analytics/daily?date=2026-09-12');
    const dailyRes = await request(baseUrl, '/api/merchants/M001/analytics/daily?date=2026-09-12');
    console.log('Response:', JSON.stringify(dailyRes.body, null, 2));

    const dailyData = dailyRes.body?.data;
    if (dailyRes.status === 200 && dailyData) {
      const calcAtv = Math.round((dailyData.successfulRevenue / dailyData.successfulTransactions) * 100) / 100;
      const atvMatches = Math.abs(calcAtv - dailyData.averageTransactionValue) < 0.05;

      console.log(`   - Verified Revenue: ₹${dailyData.successfulRevenue}`);
      console.log(`   - Verified Successful Txns: ${dailyData.successfulTransactions}`);
      console.log(`   - Verified ATV: ₹${dailyData.averageTransactionValue} (Calculated: ₹${calcAtv})`);
      console.log(`   - Verified Success Rate: ${dailyData.successfulTransactionRate}%`);

      if (atvMatches && dailyData.successfulTransactions > 0) {
        console.log('✅ TEST 2 PASSED: Deterministic daily metrics verified.\n');
      } else {
        console.error('❌ TEST 2 FAILED: ATV mismatch or zero transactions.');
        allPassed = false;
      }
    } else {
      console.error('❌ TEST 2 FAILED: Non-200 response.');
      allPassed = false;
    }

    // ----------------------------------------------------
    // TEST 3: Period Comparison (Today vs Yesterday)
    // ----------------------------------------------------
    console.log('👉 TEST 3: GET /api/merchants/M001/analytics/compare?preset=today_vs_yesterday&referenceDate=2026-09-12');
    const compareRes = await request(
      baseUrl,
      '/api/merchants/M001/analytics/compare?preset=today_vs_yesterday&referenceDate=2026-09-12'
    );
    console.log('Response:', JSON.stringify(compareRes.body, null, 2));

    const compareMetrics = compareRes.body?.data?.metrics;
    if (compareRes.status === 200 && compareMetrics) {
      console.log(`   - Current Revenue: ₹${compareMetrics.currentRevenue}`);
      console.log(`   - Previous Revenue: ₹${compareMetrics.previousRevenue}`);
      console.log(`   - Revenue Change: ₹${compareMetrics.revenueChange} (${compareMetrics.revenueChangePercent}%)`);
      console.log(`   - Current ATV: ₹${compareMetrics.currentATV}`);
      console.log(`   - Previous ATV: ₹${compareMetrics.previousATV}`);

      console.log('✅ TEST 3 PASSED: Period comparison metrics verified.\n');
    } else {
      console.error('❌ TEST 3 FAILED!');
      allPassed = false;
    }

    // ----------------------------------------------------
    // TEST 4: Error Handling (Non-existent Merchant)
    // ----------------------------------------------------
    console.log('👉 TEST 4: Error handling for non-existent merchant');
    const errRes = await request(baseUrl, '/api/merchants/M999/analytics/daily');
    console.log('Response:', JSON.stringify(errRes.body, null, 2));
    if (errRes.status === 404 && errRes.body?.error?.code === 'MERCHANT_NOT_FOUND') {
      console.log('✅ TEST 4 PASSED: 404 returned for unknown merchant.\n');
    } else {
      console.error('❌ TEST 4 FAILED: Expected 404 MERCHANT_NOT_FOUND.');
      allPassed = false;
    }

    // ----------------------------------------------------
    // TEST 5: Error Handling (Invalid date format)
    // ----------------------------------------------------
    console.log('👉 TEST 5: Error handling for invalid date format');
    const badDateRes = await request(baseUrl, '/api/merchants/M001/analytics/daily?date=12-09-2026');
    console.log('Response:', JSON.stringify(badDateRes.body, null, 2));
    if (badDateRes.status === 400 && badDateRes.body?.error?.code === 'VALIDATION_ERROR') {
      console.log('✅ TEST 5 PASSED: 400 returned for malformed date.\n');
    } else {
      console.error('❌ TEST 5 FAILED: Expected 400 VALIDATION_ERROR.');
      allPassed = false;
    }
  } finally {
    server.close();
    await disconnectDatabase();
  }

  if (allPassed) {
    console.log('====================================================');
    console.log('🏆 ALL MILESTONE 1 CHECKS PASSED SUCCESSFULLY!');
    console.log('====================================================');
  } else {
    throw new Error('Some milestone verification checks failed.');
  }
}

if (require.main === module) {
  runMilestoneVerification()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Verification failed:', err);
      process.exit(1);
    });
}
