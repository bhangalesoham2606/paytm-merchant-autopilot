import { Request, Response, NextFunction } from 'express';
import { transactionService } from '../services/transaction.service';

export class TransactionController {
  async getTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const { merchantId } = req.params;
      const { dateFrom, dateTo, status, customerId, limit, page } = req.query as any;

      const data = await transactionService.getTransactions(merchantId, {
        dateFrom,
        dateTo,
        status,
        customerId,
        limit: limit ? parseInt(limit, 10) : undefined,
        page: page ? parseInt(page, 10) : undefined,
      });

      res.json({
        success: true,
        data: data.transactions,
        meta: data.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTransactionSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { merchantId } = req.params;
      const data = await transactionService.getTransactionSummary(merchantId);
      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const transactionController = new TransactionController();
