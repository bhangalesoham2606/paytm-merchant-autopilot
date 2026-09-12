import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { Merchant, IMerchant } from '../models/Merchant';
import { Customer, ICustomer } from '../models/Customer';
import { Transaction, ITransaction, TransactionStatus } from '../models/Transaction';
import { Campaign } from '../models/Campaign';
import { roundTo } from '../utils/metrics';

/**
 * Deterministic Pseudo-Random Number Generator (Mulberry32)
 */
function createPRNG(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = createPRNG(42);

function randInt(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

function randChoice<T>(arr: T[]): T {
  return arr[Math.floor(random() * arr.length)];
}

const PAYMENT_METHODS = ['UPI', 'UPI', 'UPI', 'CARD', 'NET_BANKING', 'WALLET'];

export async function seedDatabase(shouldDisconnect = true) {
  console.log('🌱 Starting deterministic database seeding...');
  if (mongoose.connection.readyState === 0) {
    await connectDatabase();
  }

  // Clear existing collections
  await Promise.all([
    Merchant.deleteMany({}),
    Customer.deleteMany({}),
    Transaction.deleteMany({}),
    Campaign.deleteMany({}),
  ]);
  console.log('🧹 Cleaned existing database collections.');

  // ==========================================
  // 1. Create 3 Merchants
  // ==========================================
  const merchantsData = [
    {
      merchantId: 'M001',
      businessName: 'Rajesh Bakery',
      businessCategory: 'bakery',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      operatingHours: { open: '07:00', close: '22:00' },
    },
    {
      merchantId: 'M002',
      businessName: 'Priya Fashion Store',
      businessCategory: 'apparel',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      operatingHours: { open: '10:30', close: '21:30' },
    },
    {
      merchantId: 'M003',
      businessName: 'Spice & Craft Retail',
      businessCategory: 'retail',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      operatingHours: { open: '08:00', close: '22:30' },
    },
  ];

  await Merchant.insertMany(merchantsData);
  console.log(`✅ Inserted ${merchantsData.length} merchants.`);

  // ==========================================
  // 2. Create Customers (1,300 total across 3 merchants)
  // ==========================================
  const customersList: any[] = [];
  const firstNames = ['Amit', 'Rahul', 'Sneha', 'Pooja', 'Vikram', 'Ananya', 'Rohan', 'Neha', 'Suresh', 'Kavita', 'Deepak', 'Meera', 'Rajesh', 'Priya', 'Sanjay', 'Sunita', 'Manish', 'Divya', 'Kunal', 'Ritu'];
  const lastNames = ['Sharma', 'Verma', 'Gupta', 'Singh', 'Patel', 'Joshi', 'Mehta', 'Nair', 'Reddy', 'Chopra', 'Malhotra', 'Iyer', 'Bose', 'Das', 'Pandey'];

  // M001: 500 customers (C1000 to C1499)
  for (let i = 1000; i < 1500; i++) {
    customersList.push({
      customerId: `C${i}`,
      merchantId: 'M001',
      name: `${randChoice(firstNames)} ${randChoice(lastNames)}`,
      phone: `+9198${randInt(10000000, 99999999)}`,
      totalSpend: 0,
      transactionCount: 0,
    });
  }

  // M002: 400 customers (C2000 to C2399)
  for (let i = 2000; i < 2400; i++) {
    customersList.push({
      customerId: `C${i}`,
      merchantId: 'M002',
      name: `${randChoice(firstNames)} ${randChoice(lastNames)}`,
      phone: `+9197${randInt(10000000, 99999999)}`,
      totalSpend: 0,
      transactionCount: 0,
    });
  }

  // M003: 400 customers (C3000 to C3399)
  for (let i = 3000; i < 3400; i++) {
    customersList.push({
      customerId: `C${i}`,
      merchantId: 'M003',
      name: `${randChoice(firstNames)} ${randChoice(lastNames)}`,
      phone: `+9196${randInt(10000000, 99999999)}`,
      totalSpend: 0,
      transactionCount: 0,
    });
  }

  await Customer.insertMany(customersList);
  console.log(`✅ Inserted ${customersList.length} customers.`);

  // Customer ID lookup per merchant
  const m1CustomerIds = customersList.filter((c) => c.merchantId === 'M001').map((c) => c.customerId);
  const m2CustomerIds = customersList.filter((c) => c.merchantId === 'M002').map((c) => c.customerId);
  const m3CustomerIds = customersList.filter((c) => c.merchantId === 'M003').map((c) => c.customerId);

  // M002 High-Value At-Risk subgroup (Scenario E): C2000 to C2049
  const m2ChurningHighValueIds = m2CustomerIds.slice(0, 50);
  const m2ActiveCustomerIds = m2CustomerIds.slice(50);

  // ==========================================
  // 3. Generate 10,000+ Transactions over 90 Days
  // ==========================================
  // Day 0 = 2026-06-15, Day 89 = 2026-09-12 (Today)
  const baseDate = new Date('2026-06-15T00:00:00.000Z'); // UTC base
  const transactions: any[] = [];
  let txnCounter = 100000;

  // Customer tracking aggregates
  const customerStats = new Map<
    string,
    { totalSpend: number; count: number; firstPurchase: Date; lastPurchase: Date }
  >();

  for (let day = 0; day < 90; day++) {
    const currentDayDate = new Date(baseDate.getTime() + day * 24 * 60 * 60 * 1000);
    const dayOfWeek = currentDayDate.getUTCDay(); // 0 = Sun, 6 = Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isToday = day === 89; // 2026-09-12
    const isScenarioC = day === 85; // 2026-09-08 (Refund spike)
    const isScenarioF = day === 87; // 2026-09-10 (Abnormal sales drop for M001)

    // ----------------------------------------
    // M001: Rajesh Bakery (Normal steady bakery)
    // ----------------------------------------
    let m1TxnCount = randInt(65, 85);
    if (isWeekend) m1TxnCount = Math.floor(m1TxnCount * 1.25);
    if (isScenarioF) m1TxnCount = 16; // Severe drop on 2026-09-10

    for (let i = 0; i < m1TxnCount; i++) {
      txnCounter++;
      const customerId = randChoice(m1CustomerIds);
      const amount = randInt(50, 450); // Bakery basket size
      const hour = randInt(7, 21);
      const minute = randInt(0, 59);
      const second = randInt(0, 59);
      const timestamp = new Date(currentDayDate.getTime() + (hour * 3600 + minute * 60 + second) * 1000);

      // Status determination
      let status: TransactionStatus = 'SUCCESS';
      let refundAmount = 0;

      if (isScenarioC) {
        // Refund spike on 2026-09-08 (30% refunded)
        const roll = random();
        if (roll < 0.30) {
          status = 'REFUNDED';
          refundAmount = amount;
        } else if (roll < 0.35) {
          status = 'FAILED';
        }
      } else {
        const roll = random();
        if (roll < 0.93) status = 'SUCCESS';
        else if (roll < 0.96) status = 'FAILED';
        else if (roll < 0.98) status = 'PENDING';
        else {
          status = 'REFUNDED';
          refundAmount = amount;
        }
      }

      transactions.push({
        transactionId: `TXN${txnCounter}`,
        merchantId: 'M001',
        customerId,
        amount,
        timestamp,
        status,
        paymentMethod: randChoice(PAYMENT_METHODS),
        refundAmount,
        orderId: `ORD_${txnCounter}`,
        createdAt: timestamp,
      });

      if (status === 'SUCCESS') {
        const existing = customerStats.get(customerId) || {
          totalSpend: 0,
          count: 0,
          firstPurchase: timestamp,
          lastPurchase: timestamp,
        };
        existing.totalSpend += amount;
        existing.count += 1;
        if (timestamp < existing.firstPurchase) existing.firstPurchase = timestamp;
        if (timestamp > existing.lastPurchase) existing.lastPurchase = timestamp;
        customerStats.set(customerId, existing);
      }
    }

    // ----------------------------------------
    // M002: Priya Fashion Store (Decline in vol & value, Scenario A, B, E)
    // ----------------------------------------
    // Normal period (Day 0 to 74): 35-50 txns, amount 800 - 2500
    // Decline period (Day 75 to 89): 15-25 txns, amount 300 - 750
    const isM2Decline = day >= 75;
    const m2TxnCount = isM2Decline ? randInt(14, 22) : randInt(35, 48);

    for (let i = 0; i < m2TxnCount; i++) {
      txnCounter++;
      // Scenario E: If day >= 45, do not pick churning high value customers (C2000-C2049)
      const customerId =
        day < 45 ? randChoice(m2CustomerIds) : randChoice(m2ActiveCustomerIds);

      const amount = isM2Decline ? randInt(300, 750) : randInt(900, 2800);
      const hour = randInt(11, 20);
      const minute = randInt(0, 59);
      const second = randInt(0, 59);
      const timestamp = new Date(currentDayDate.getTime() + (hour * 3600 + minute * 60 + second) * 1000);

      const roll = random();
      let status: TransactionStatus = 'SUCCESS';
      let refundAmount = 0;
      if (roll < 0.91) status = 'SUCCESS';
      else if (roll < 0.95) status = 'FAILED';
      else if (roll < 0.98) status = 'PENDING';
      else {
        status = 'REFUNDED';
        refundAmount = amount;
      }

      transactions.push({
        transactionId: `TXN${txnCounter}`,
        merchantId: 'M002',
        customerId,
        amount,
        timestamp,
        status,
        paymentMethod: randChoice(PAYMENT_METHODS),
        refundAmount,
        orderId: `ORD_${txnCounter}`,
        createdAt: timestamp,
      });

      if (status === 'SUCCESS') {
        const existing = customerStats.get(customerId) || {
          totalSpend: 0,
          count: 0,
          firstPurchase: timestamp,
          lastPurchase: timestamp,
        };
        existing.totalSpend += amount;
        existing.count += 1;
        if (timestamp < existing.firstPurchase) existing.firstPurchase = timestamp;
        if (timestamp > existing.lastPurchase) existing.lastPurchase = timestamp;
        customerStats.set(customerId, existing);
      }
    }

    // ----------------------------------------
    // M003: Spice & Craft Retail (Weekend heavy, Scenario D)
    // ----------------------------------------
    // Weekdays: 25-35 txns. Weekends: 70-95 txns (2.5x volume)
    const m3TxnCount = isWeekend ? randInt(70, 95) : randInt(25, 36);

    for (let i = 0; i < m3TxnCount; i++) {
      txnCounter++;
      const customerId = randChoice(m3CustomerIds);
      const amount = isWeekend ? randInt(350, 1800) : randInt(200, 900);
      const hour = randInt(8, 22);
      const minute = randInt(0, 59);
      const second = randInt(0, 59);
      const timestamp = new Date(currentDayDate.getTime() + (hour * 3600 + minute * 60 + second) * 1000);

      const roll = random();
      let status: TransactionStatus = 'SUCCESS';
      let refundAmount = 0;
      if (roll < 0.94) status = 'SUCCESS';
      else if (roll < 0.97) status = 'FAILED';
      else if (roll < 0.99) status = 'PENDING';
      else {
        status = 'REFUNDED';
        refundAmount = amount;
      }

      transactions.push({
        transactionId: `TXN${txnCounter}`,
        merchantId: 'M003',
        customerId,
        amount,
        timestamp,
        status,
        paymentMethod: randChoice(PAYMENT_METHODS),
        refundAmount,
        orderId: `ORD_${txnCounter}`,
        createdAt: timestamp,
      });

      if (status === 'SUCCESS') {
        const existing = customerStats.get(customerId) || {
          totalSpend: 0,
          count: 0,
          firstPurchase: timestamp,
          lastPurchase: timestamp,
        };
        existing.totalSpend += amount;
        existing.count += 1;
        if (timestamp < existing.firstPurchase) existing.firstPurchase = timestamp;
        if (timestamp > existing.lastPurchase) existing.lastPurchase = timestamp;
        customerStats.set(customerId, existing);
      }
    }
  }

  // Bulk insert transactions in chunks for high performance
  console.log(`⏳ Inserting ${transactions.length} transactions in batches...`);
  const chunkSize = 2500;
  for (let i = 0; i < transactions.length; i += chunkSize) {
    const chunk = transactions.slice(i, i + chunkSize);
    await Transaction.insertMany(chunk);
  }
  console.log(`✅ Successfully seeded ${transactions.length} total transactions!`);

  // ==========================================
  // 4. Update Customer aggregates
  // ==========================================
  console.log('⏳ Updating customer aggregates (spend, counts, timestamps)...');
  const customerBulkOps: any[] = [];
  for (const [customerId, stats] of customerStats.entries()) {
    customerBulkOps.push({
      updateOne: {
        filter: { customerId },
        update: {
          $set: {
            totalSpend: roundTo(stats.totalSpend, 2),
            transactionCount: stats.count,
            firstPurchaseAt: stats.firstPurchase,
            lastPurchaseAt: stats.lastPurchase,
          },
        },
      },
    });
  }

  if (customerBulkOps.length > 0) {
    await Customer.bulkWrite(customerBulkOps);
  }
  console.log(`✅ Updated ${customerBulkOps.length} customer records.`);

  // ==========================================
  // 5. Create Sample Campaigns
  // ==========================================
  await Campaign.create([
    {
      campaignId: 'CMP_WINBACK_01',
      merchantId: 'M002',
      segment: 'atRisk',
      offer: 'Flat 20% OFF on your next visit! Use code WELCOMEBACK',
      status: 'DRAFT',
      recipientCount: 45,
      result: { estimatedReach: 45, conversions: 0 },
    },
    {
      campaignId: 'CMP_WEEKEND_01',
      merchantId: 'M003',
      segment: 'highValue',
      offer: 'Exclusive weekend craft tasting invite + ₹200 voucher',
      status: 'SCHEDULED',
      recipientCount: 80,
      result: { estimatedReach: 80, conversions: 0 },
    },
  ]);
  console.log('✅ Seeded sample campaigns.');

  console.log('🎉 Database seeding complete!');
  if (shouldDisconnect) {
    await disconnectDatabase();
  }
}

// Execute directly if run via CLI
if (require.main === module) {
  seedDatabase(true)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Seeding failed:', err);
      process.exit(1);
    });
}
