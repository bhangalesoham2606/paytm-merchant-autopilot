import { Router } from 'express';
import { z } from 'zod';
import { customerController } from '../controllers/customer.controller';
import { validateRequest } from '../middleware/validation.middleware';

const router = Router({ mergeParams: true });

const merchantParamSchema = z.object({
  merchantId: z.string().min(1, 'merchantId is required'),
});

const inactiveQuerySchema = z.object({
  inactivityDays: z.string().regex(/^\d+$/).optional(),
});

router.get(
  '/customers/summary',
  validateRequest({ params: merchantParamSchema }),
  customerController.getSummary.bind(customerController)
);

router.get(
  '/customers/segments',
  validateRequest({ params: merchantParamSchema }),
  customerController.getSegments.bind(customerController)
);

router.get(
  '/customers/inactive',
  validateRequest({ params: merchantParamSchema, query: inactiveQuerySchema }),
  customerController.getInactive.bind(customerController)
);

router.get(
  '/customers/high-value',
  validateRequest({ params: merchantParamSchema }),
  customerController.getHighValue.bind(customerController)
);

router.get(
  '/customers/at-risk',
  validateRequest({ params: merchantParamSchema }),
  customerController.getAtRisk.bind(customerController)
);

router.get(
  '/customers/activity-trend',
  validateRequest({ params: merchantParamSchema }),
  customerController.getActivityTrend.bind(customerController)
);

export default router;
