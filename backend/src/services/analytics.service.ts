import { Transaction } from '../models/Transaction';
import { Merchant } from '../models/Merchant';
import { NotFoundError } from '../utils/errors';
import {
  getDayBounds,
  formatDateInTz,
  getComparisonWindows,
  ComparisonPreset,
  getTimezoneOffsetMinutes,
} from '../utils/date';
import {
  calculateATV,
  calculatePercentageChange,
  calculateSuccessRate,
  roundTo,
} from '../utils/metrics';

export interface DailyMetricsResult {
  merchantId: string;
  date: string;
  successfulRevenue: number;
  successfulTransactions: number;
  averageTransactionValue: number;
  failedTransactions: number;
  refundAmount: number;
  successfulTransactionRate: number;
}

export interface PeriodComparisonResult {
  merchantId: string;
  comparisonType: string;
  period: {
    current: { from: string; to: string };
    previous: { from: string; to: string };
  };
  metrics: {
    currentRevenue: number;
    previousRevenue: number;
    revenueChange: number;
    revenueChangePercent: number;
    currentTransactions: number;
    previousTransactions: number;
    transactionChangePercent: number;
    currentATV: number;
    previousATV: number;
    atvChangePercent: number;
  };
}

export class AnalyticsService {
  /**
   * Helper to fetch merchant and verify existence
   */
  private async getMerchantOrThrow(merchantId: string) {
    const merchant = await Merchant.findOne({ merchantId });
    if (!merchant) {
      throw new NotFoundError(`Merchant with ID '${merchantId}' not found.`, 'MERCHANT_NOT_FOUND');
    }
    return merchant;
  }

  /**
   * Internal helper to aggregate window metrics
   */
  private async aggregateWindowMetrics(merchantId: string, start: Date, end: Date) {
    const [result] = await Transaction.aggregate([
      {
        $match: {
          merchantId,
          timestamp: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: {
              $cond: [{ $eq: ['$status', 'SUCCESS'] }, '$amount', 0],
            },
          },
          successfulCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0],
            },
          },
          failedCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0],
            },
          },
          pendingCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0],
            },
          },
          refundedCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'REFUNDED'] }, 1, 0],
            },
          },
          totalRefundAmount: {
            $sum: '$refundAmount',
          },
          totalCount: { $sum: 1 },
        },
      },
    ]);

    const successfulRevenue = roundTo(result?.totalRevenue || 0, 2);
    const successfulTransactions = result?.successfulCount || 0;
    const failedTransactions = result?.failedCount || 0;
    const refundAmount = roundTo(result?.totalRefundAmount || 0, 2);
    const totalTransactions = result?.totalCount || 0;

    return {
      successfulRevenue,
      successfulTransactions,
      failedTransactions,
      refundAmount,
      totalTransactions,
      averageTransactionValue: calculateATV(successfulRevenue, successfulTransactions),
      successfulTransactionRate: calculateSuccessRate(successfulTransactions, totalTransactions),
    };
  }

  /**
   * Milestone 1: Daily Metrics
   */
  async getDailyMetrics(merchantId: string, dateStr?: string): Promise<DailyMetricsResult> {
    const merchant = await this.getMerchantOrThrow(merchantId);

    // Default to today in merchant timezone or reference date
    const targetDate = dateStr || formatDateInTz(new Date(), merchant.timezone);
    const { start, end, dateFormatted } = getDayBounds(targetDate, merchant.timezone);

    const agg = await this.aggregateWindowMetrics(merchantId, start, end);

    return {
      merchantId,
      date: dateFormatted,
      successfulRevenue: agg.successfulRevenue,
      successfulTransactions: agg.successfulTransactions,
      averageTransactionValue: agg.averageTransactionValue,
      failedTransactions: agg.failedTransactions,
      refundAmount: agg.refundAmount,
      successfulTransactionRate: agg.successfulTransactionRate,
    };
  }

  /**
   * Milestone 1: Period Comparison
   */
  async getPeriodComparison(
    merchantId: string,
    params: {
      currentFrom?: string;
      currentTo?: string;
      previousFrom?: string;
      previousTo?: string;
      preset?: ComparisonPreset;
      referenceDate?: string;
    }
  ): Promise<PeriodComparisonResult> {
    const merchant = await this.getMerchantOrThrow(merchantId);

    let curStart: Date;
    let curEnd: Date;
    let prevStart: Date;
    let prevEnd: Date;
    let curFromFormatted: string;
    let curToFormatted: string;
    let prevFromFormatted: string;
    let prevToFormatted: string;
    let comparisonType: string;

    if (params.preset) {
      const refDate = params.referenceDate || formatDateInTz(new Date(), merchant.timezone);
      const windows = getComparisonWindows(refDate, params.preset, merchant.timezone);
      curStart = windows.currentFrom;
      curEnd = windows.currentTo;
      prevStart = windows.previousFrom;
      prevEnd = windows.previousTo;
      curFromFormatted = windows.currentFromFormatted;
      curToFormatted = windows.currentToFormatted;
      prevFromFormatted = windows.previousFromFormatted;
      prevToFormatted = windows.previousToFormatted;
      comparisonType = params.preset;
    } else if (params.currentFrom && params.currentTo && params.previousFrom && params.previousTo) {
      curStart = getDayBounds(params.currentFrom, merchant.timezone).start;
      curEnd = getDayBounds(params.currentTo, merchant.timezone).end;
      prevStart = getDayBounds(params.previousFrom, merchant.timezone).start;
      prevEnd = getDayBounds(params.previousTo, merchant.timezone).end;
      curFromFormatted = params.currentFrom;
      curToFormatted = params.currentTo;
      prevFromFormatted = params.previousFrom;
      prevToFormatted = params.previousTo;
      comparisonType = 'custom';
    } else {
      // Default to today vs yesterday
      const refDate = params.referenceDate || formatDateInTz(new Date(), merchant.timezone);
      const windows = getComparisonWindows(refDate, 'today_vs_yesterday', merchant.timezone);
      curStart = windows.currentFrom;
      curEnd = windows.currentTo;
      prevStart = windows.previousFrom;
      prevEnd = windows.previousTo;
      curFromFormatted = windows.currentFromFormatted;
      curToFormatted = windows.currentToFormatted;
      prevFromFormatted = windows.previousFromFormatted;
      prevToFormatted = windows.previousToFormatted;
      comparisonType = 'today_vs_yesterday';
    }

    // Execute window aggregations in parallel
    const [currentMetrics, prevMetrics] = await Promise.all([
      this.aggregateWindowMetrics(merchantId, curStart, curEnd),
      this.aggregateWindowMetrics(merchantId, prevStart, prevEnd),
    ]);

    const revenueChange = roundTo(currentMetrics.successfulRevenue - prevMetrics.successfulRevenue, 2);
    const revenueChangePercent = calculatePercentageChange(
      currentMetrics.successfulRevenue,
      prevMetrics.successfulRevenue
    );

    const transactionChangePercent = calculatePercentageChange(
      currentMetrics.successfulTransactions,
      prevMetrics.successfulTransactions
    );

    const atvChangePercent = calculatePercentageChange(
      currentMetrics.averageTransactionValue,
      prevMetrics.averageTransactionValue
    );

    return {
      merchantId,
      comparisonType,
      period: {
        current: { from: curFromFormatted, to: curToFormatted },
        previous: { from: prevFromFormatted, to: prevToFormatted },
      },
      metrics: {
        currentRevenue: currentMetrics.successfulRevenue,
        previousRevenue: prevMetrics.successfulRevenue,
        revenueChange,
        revenueChangePercent,
        currentTransactions: currentMetrics.successfulTransactions,
        previousTransactions: prevMetrics.successfulTransactions,
        transactionChangePercent,
        currentATV: currentMetrics.averageTransactionValue,
        previousATV: prevMetrics.averageTransactionValue,
        atvChangePercent,
      },
    };
  }

  /**
   * Phase 3 / Tool: Revenue Trend
   */
  async getRevenueTrend(
    merchantId: string,
    period: '7d' | '30d' | '90d' = '30d',
    granularity: 'day' | 'week' = 'day'
  ) {
    const merchant = await this.getMerchantOrThrow(merchantId);
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const offsetMinutes = getTimezoneOffsetMinutes(merchant.timezone);

    const trend = await Transaction.aggregate([
      {
        $match: {
          merchantId,
          status: 'SUCCESS',
          timestamp: { $gte: startDate },
        },
      },
      {
        $project: {
          amount: 1,
          adjustedTime: { $add: ['$timestamp', offsetMinutes * 60 * 1000] },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: granularity === 'week' ? '%Y-W%V' : '%Y-%m-%d',
              date: '$adjustedTime',
            },
          },
          revenue: { $sum: '$amount' },
          transactions: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          revenue: { $round: ['$revenue', 2] },
          transactions: 1,
        },
      },
    ]);

    return trend;
  }

  /**
   * Phase 3 / Tool: Peak Sales Hours
   */
  async getPeakHours(merchantId: string, dateStr?: string) {
    const merchant = await this.getMerchantOrThrow(merchantId);
    const targetDate = dateStr || formatDateInTz(new Date(), merchant.timezone);
    const { start, end } = getDayBounds(targetDate, merchant.timezone);
    const offsetMinutes = getTimezoneOffsetMinutes(merchant.timezone);

    const hourly = await Transaction.aggregate([
      {
        $match: {
          merchantId,
          status: 'SUCCESS',
          timestamp: { $gte: start, $lte: end },
        },
      },
      {
        $project: {
          amount: 1,
          hour: {
            $hour: {
              date: { $add: ['$timestamp', offsetMinutes * 60 * 1000] },
            },
          },
        },
      },
      {
        $group: {
          _id: '$hour',
          revenue: { $sum: '$amount' },
          transactions: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill all 24 hours
    const hourMap = new Map<number, { revenue: number; transactions: number }>();
    for (let h = 0; h < 24; h++) hourMap.set(h, { revenue: 0, transactions: 0 });
    hourly.forEach((item) => {
      hourMap.set(item._id, {
        revenue: roundTo(item.revenue, 2),
        transactions: item.transactions,
      });
    });

    const hours = Array.from(hourMap.entries()).map(([hour, data]) => ({
      hour,
      hourFormatted: `${String(hour).padStart(2, '0')}:00`,
      revenue: data.revenue,
      transactions: data.transactions,
    }));

    // Identify peak and lowest active hours
    const sorted = [...hours].sort((a, b) => b.revenue - a.revenue);
    const peakHour = sorted[0];
    const lowestHour = sorted[sorted.length - 1];

    return {
      merchantId,
      date: targetDate,
      hours,
      peakHour: peakHour?.hourFormatted || 'N/A',
      lowestHour: lowestHour?.hourFormatted || 'N/A',
    };
  }

  /**
   * Phase 3 / Tool: Day of week performance
   */
  async getDayOfWeekPerformance(merchantId: string) {
    const merchant = await this.getMerchantOrThrow(merchantId);
    const offsetMinutes = getTimezoneOffsetMinutes(merchant.timezone);

    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const dowData = await Transaction.aggregate([
      {
        $match: {
          merchantId,
          status: 'SUCCESS',
        },
      },
      {
        $project: {
          amount: 1,
          dayOfWeek: {
            $dayOfWeek: {
              date: { $add: ['$timestamp', offsetMinutes * 60 * 1000] },
            },
          },
        },
      },
      {
        $group: {
          _id: '$dayOfWeek',
          totalRevenue: { $sum: '$amount' },
          totalTransactions: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const result = dowData.map((d) => {
      const dayName = daysOfWeek[(d._id - 1) % 7];
      return {
        dayIndex: d._id,
        dayName,
        revenue: roundTo(d.totalRevenue, 2),
        transactions: d.totalTransactions,
        atv: calculateATV(d.totalRevenue, d.totalTransactions),
      };
    });

    return result;
  }

  /**
   * Phase 5 / Tool: Sales Anomalies
   */
  async getSalesAnomalies(merchantId: string, dateStr?: string) {
    const merchant = await this.getMerchantOrThrow(merchantId);
    const targetDate = dateStr || formatDateInTz(new Date(), merchant.timezone);

    // Baseline: Average of past 14 days excluding today
    const { start: todayStart } = getDayBounds(targetDate, merchant.timezone);
    const fourteenDaysAgo = new Date(todayStart.getTime() - 14 * 24 * 60 * 60 * 1000);

    const baselineAgg = await Transaction.aggregate([
      {
        $match: {
          merchantId,
          status: 'SUCCESS',
          timestamp: { $gte: fourteenDaysAgo, $lt: todayStart },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
        },
      },
    ]);

    const expectedRevenue = roundTo((baselineAgg[0]?.totalRevenue || 0) / 14, 2);
    const todayMetrics = await this.getDailyMetrics(merchantId, targetDate);
    const actualRevenue = todayMetrics.successfulRevenue;

    const deviationPercent = calculatePercentageChange(actualRevenue, expectedRevenue);
    const isAnomaly = Math.abs(deviationPercent) >= 30; // 30% deviation threshold

    let severity: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (Math.abs(deviationPercent) >= 50) severity = 'HIGH';
    else if (Math.abs(deviationPercent) >= 30) severity = 'MEDIUM';

    let reason = 'Revenue within normal historical range.';
    if (deviationPercent <= -50) {
      reason = 'Severe drop in revenue compared to 14-day rolling baseline.';
    } else if (deviationPercent <= -30) {
      reason = 'Moderate revenue decline detected.';
    } else if (deviationPercent >= 30) {
      reason = 'Unusually high revenue surge compared to 14-day rolling baseline.';
    }

    return {
      detected: isAnomaly,
      date: targetDate,
      metric: 'revenue',
      actualValue: actualRevenue,
      expectedValue: expectedRevenue,
      deviationPercent,
      severity: isAnomaly ? severity : 'NONE',
      reason,
    };
  }
}

export const analyticsService = new AnalyticsService();
