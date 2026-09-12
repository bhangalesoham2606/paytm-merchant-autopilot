import { Customer } from '../models/Customer';
import { Merchant } from '../models/Merchant';
import { NotFoundError } from '../utils/errors';
import { roundTo } from '../utils/metrics';

export class CustomerService {
  private async ensureMerchant(merchantId: string) {
    const merchant = await Merchant.findOne({ merchantId });
    if (!merchant) {
      throw new NotFoundError(`Merchant with ID '${merchantId}' not found.`, 'MERCHANT_NOT_FOUND');
    }
    return merchant;
  }

  /**
   * Calculates high-value spend threshold using the 90th percentile of merchant customers
   */
  private async getHighValueThreshold(merchantId: string): Promise<number> {
    const customers = await Customer.find({ merchantId, totalSpend: { $gt: 0 } })
      .sort({ totalSpend: 1 })
      .select('totalSpend');

    if (customers.length === 0) return 1000;
    const p90Index = Math.floor(customers.length * 0.9);
    return customers[p90Index]?.totalSpend || 1000;
  }

  async getCustomerSummary(merchantId: string) {
    await this.ensureMerchant(merchantId);
    const highValueThreshold = await this.getHighValueThreshold(merchantId);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const [summary] = await Customer.aggregate([
      { $match: { merchantId } },
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          repeatCustomers: {
            $sum: { $cond: [{ $gte: ['$transactionCount', 2] }, 1, 0] },
          },
          newCustomers: {
            $sum: { $cond: [{ $eq: ['$transactionCount', 1] }, 1, 0] },
          },
          highValueCustomers: {
            $sum: { $cond: [{ $gte: ['$totalSpend', highValueThreshold] }, 1, 0] },
          },
          inactiveCustomers: {
            $sum: { $cond: [{ $lt: ['$lastPurchaseAt', thirtyDaysAgo] }, 1, 0] },
          },
          atRiskCustomers: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ['$transactionCount', 2] },
                    { $lt: ['$lastPurchaseAt', thirtyDaysAgo] },
                    { $gte: ['$lastPurchaseAt', sixtyDaysAgo] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    return {
      totalCustomers: summary?.totalCustomers || 0,
      newCustomers: summary?.newCustomers || 0,
      repeatCustomers: summary?.repeatCustomers || 0,
      highValueCustomers: summary?.highValueCustomers || 0,
      inactiveCustomers: summary?.inactiveCustomers || 0,
      atRiskCustomers: summary?.atRiskCustomers || 0,
      highValueSpendThreshold: roundTo(highValueThreshold, 2),
    };
  }

  async getCustomerSegments(merchantId: string) {
    await this.ensureMerchant(merchantId);
    const highValueThreshold = await this.getHighValueThreshold(merchantId);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const [segments] = await Customer.aggregate([
      { $match: { merchantId } },
      {
        $group: {
          _id: null,
          new: { $sum: { $cond: [{ $eq: ['$transactionCount', 1] }, 1, 0] } },
          repeat: { $sum: { $cond: [{ $gte: ['$transactionCount', 2] }, 1, 0] } },
          frequent: { $sum: { $cond: [{ $gte: ['$transactionCount', 5] }, 1, 0] } },
          highValue: { $sum: { $cond: [{ $gte: ['$totalSpend', highValueThreshold] }, 1, 0] } },
          inactive: { $sum: { $cond: [{ $lt: ['$lastPurchaseAt', thirtyDaysAgo] }, 1, 0] } },
          atRisk: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ['$transactionCount', 2] },
                    { $lt: ['$lastPurchaseAt', thirtyDaysAgo] },
                    { $gte: ['$lastPurchaseAt', sixtyDaysAgo] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    return {
      new: segments?.new || 0,
      repeat: segments?.repeat || 0,
      frequent: segments?.frequent || 0,
      highValue: segments?.highValue || 0,
      inactive: segments?.inactive || 0,
      atRisk: segments?.atRisk || 0,
    };
  }

  async getInactiveCustomers(merchantId: string, inactivityDays = 30) {
    await this.ensureMerchant(merchantId);
    const thresholdDate = new Date(Date.now() - inactivityDays * 24 * 60 * 60 * 1000);
    const highValueThreshold = await this.getHighValueThreshold(merchantId);

    const customers = await Customer.find({
      merchantId,
      lastPurchaseAt: { $lt: thresholdDate },
    })
      .sort({ totalSpend: -1 })
      .limit(100)
      .select('customerId lastPurchaseAt totalSpend transactionCount -_id');

    const now = Date.now();
    return customers.map((c) => {
      const lastPurchase = c.lastPurchaseAt ? new Date(c.lastPurchaseAt).getTime() : now;
      const inactiveDays = Math.floor((now - lastPurchase) / (24 * 60 * 60 * 1000));
      return {
        customerId: c.customerId,
        lastPurchaseAt: c.lastPurchaseAt,
        inactiveDays,
        totalSpend: roundTo(c.totalSpend, 2),
        transactionCount: c.transactionCount,
        isHighValue: c.totalSpend >= highValueThreshold,
      };
    });
  }

  async getHighValueCustomers(merchantId: string) {
    await this.ensureMerchant(merchantId);
    const threshold = await this.getHighValueThreshold(merchantId);

    const customers = await Customer.find({
      merchantId,
      totalSpend: { $gte: threshold },
    })
      .sort({ totalSpend: -1 })
      .limit(50)
      .select('customerId firstPurchaseAt lastPurchaseAt totalSpend transactionCount -_id');

    return {
      thresholdUsed: roundTo(threshold, 2),
      customers: customers.map((c) => ({
        customerId: c.customerId,
        totalSpend: roundTo(c.totalSpend, 2),
        transactionCount: c.transactionCount,
        firstPurchaseAt: c.firstPurchaseAt,
        lastPurchaseAt: c.lastPurchaseAt,
      })),
    };
  }

  async getAtRiskCustomers(merchantId: string) {
    await this.ensureMerchant(merchantId);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const highValueThreshold = await this.getHighValueThreshold(merchantId);

    const customers = await Customer.find({
      merchantId,
      transactionCount: { $gte: 2 },
      lastPurchaseAt: { $lt: thirtyDaysAgo, $gte: sixtyDaysAgo },
    })
      .sort({ totalSpend: -1 })
      .limit(50)
      .select('customerId lastPurchaseAt totalSpend transactionCount -_id');

    return customers.map((c) => {
      const isHighValue = c.totalSpend >= highValueThreshold;
      return {
        customerId: c.customerId,
        lastPurchaseAt: c.lastPurchaseAt,
        recentPurchaseCount: 0,
        historicalPurchaseCount: c.transactionCount,
        totalSpend: roundTo(c.totalSpend, 2),
        riskReason: isHighValue
          ? 'High-value customer inactive for 30-60 days'
          : 'Repeat customer showing sudden churn inactivity',
        riskLevel: isHighValue ? 'HIGH' : 'MEDIUM',
      };
    });
  }

  async getCustomerActivityTrend(merchantId: string) {
    await this.ensureMerchant(merchantId);
    const summary = await this.getCustomerSummary(merchantId);

    return {
      merchantId,
      repeatCustomerCount: summary.repeatCustomers,
      activeCustomerCount: summary.totalCustomers - summary.inactiveCustomers,
      inactiveCustomerCount: summary.inactiveCustomers,
      averagePurchasesPerCustomer:
        summary.totalCustomers > 0
          ? roundTo((summary.repeatCustomers * 3 + summary.newCustomers) / summary.totalCustomers, 2)
          : 0,
    };
  }
}

export const customerService = new CustomerService();
