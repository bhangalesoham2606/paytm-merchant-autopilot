import { Transaction, TransactionStatus } from '../models/Transaction';
import { Merchant } from '../models/Merchant';
import { NotFoundError } from '../utils/errors';
import { getDayBounds } from '../utils/date';
import { roundTo } from '../utils/metrics';

export interface TransactionFilterParams {
  dateFrom?: string;
  dateTo?: string;
  status?: TransactionStatus;
  customerId?: string;
  limit?: number;
  page?: number;
}

export class TransactionService {
  private async ensureMerchant(merchantId: string) {
    const merchant = await Merchant.findOne({ merchantId });
    if (!merchant) {
      throw new NotFoundError(`Merchant with ID '${merchantId}' not found.`, 'MERCHANT_NOT_FOUND');
    }
    return merchant;
  }

  async getTransactions(merchantId: string, params: TransactionFilterParams) {
    const merchant = await this.ensureMerchant(merchantId);
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const query: any = { merchantId };

    if (params.status) {
      query.status = params.status;
    }

    if (params.customerId) {
      query.customerId = params.customerId;
    }

    if (params.dateFrom || params.dateTo) {
      query.timestamp = {};
      if (params.dateFrom) {
        query.timestamp.$gte = getDayBounds(params.dateFrom, merchant.timezone).start;
      }
      if (params.dateTo) {
        query.timestamp.$lte = getDayBounds(params.dateTo, merchant.timezone).end;
      }
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .select('-_id transactionId merchantId customerId amount timestamp status paymentMethod refundAmount orderId'),
      Transaction.countDocuments(query),
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTransactionSummary(merchantId: string) {
    await this.ensureMerchant(merchantId);

    const [summary] = await Transaction.aggregate([
      { $match: { merchantId } },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          successfulTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0] },
          },
          failedTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] },
          },
          pendingTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] },
          },
          refundedTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'REFUNDED'] }, 1, 0] },
          },
          successfulRevenue: {
            $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, '$amount', 0] },
          },
        },
      },
    ]);

    return {
      totalTransactions: summary?.totalTransactions || 0,
      successfulTransactions: summary?.successfulTransactions || 0,
      failedTransactions: summary?.failedTransactions || 0,
      pendingTransactions: summary?.pendingTransactions || 0,
      refundedTransactions: summary?.refundedTransactions || 0,
      successfulRevenue: roundTo(summary?.successfulRevenue || 0, 2),
    };
  }
}

export const transactionService = new TransactionService();
