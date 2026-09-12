import { Router } from 'express';
import { z } from 'zod';
import { transactionController } from '../controllers/transaction.controller';
import { validateRequest } from '../middleware/validation.middleware';

const router = Router({ mergeParams: true });

const merchantParamSchema = z.object({
  merchantId: z.string().min(1, 'merchantId is required'),
});

const transactionQuerySchema = z.object({
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dateFrom must be YYYY-MM-DD').optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dateTo must be YYYY-MM-DD').optional(),
  status: z.enum(['SUCCESS', 'FAILED', 'PENDING', 'REFUNDED']).optional(),
  customerId: z.string().optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  page: z.string().regex(/^\d+$/).optional(),
});

router.get(
  '/transactions',
  validateRequest({ params: merchantParamSchema, query: transactionQuerySchema }),
  transactionController.getTransactions.bind(transactionController)
);

router.get(
  '/transactions/summary',
  validateRequest({ params: merchantParamSchema }),
  transactionController.getTransactionSummary.bind(transactionController)
);

export default router;
