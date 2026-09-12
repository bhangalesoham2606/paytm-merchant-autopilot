import { Router } from 'express';
import { z } from 'zod';
import { analyticsController } from '../controllers/analytics.controller';
import { validateRequest } from '../middleware/validation.middleware';

const router = Router({ mergeParams: true });

// Schema definitions
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const merchantParamSchema = z.object({
  merchantId: z.string().min(1, 'merchantId is required'),
});

const dailyQuerySchema = z.object({
  date: z.string().regex(datePattern, 'Date must be in YYYY-MM-DD format').optional(),
});

const compareQuerySchema = z.object({
  currentFrom: z.string().regex(datePattern, 'currentFrom must be in YYYY-MM-DD format').optional(),
  currentTo: z.string().regex(datePattern, 'currentTo must be in YYYY-MM-DD format').optional(),
  previousFrom: z.string().regex(datePattern, 'previousFrom must be in YYYY-MM-DD format').optional(),
  previousTo: z.string().regex(datePattern, 'previousTo must be in YYYY-MM-DD format').optional(),
  preset: z
    .enum([
      'today_vs_yesterday',
      'today_vs_same_weekday_last_week',
      'this_week_vs_previous_week',
      'mtd_vs_previous_mtd',
    ])
    .optional(),
  referenceDate: z.string().regex(datePattern, 'referenceDate must be in YYYY-MM-DD format').optional(),
});

const trendQuerySchema = z.object({
  period: z.enum(['7d', '30d', '90d']).optional().default('30d'),
  granularity: z.enum(['day', 'week']).optional().default('day'),
});

// Milestone 1 Routes
router.get(
  '/analytics/daily',
  validateRequest({ params: merchantParamSchema, query: dailyQuerySchema }),
  analyticsController.getDaily.bind(analyticsController)
);

router.get(
  '/analytics/compare',
  validateRequest({ params: merchantParamSchema, query: compareQuerySchema }),
  analyticsController.getCompare.bind(analyticsController)
);

// Phinite Analytics Tools Routes
router.get(
  '/analytics/revenue-trend',
  validateRequest({ params: merchantParamSchema, query: trendQuerySchema }),
  analyticsController.getRevenueTrend.bind(analyticsController)
);

router.get(
  '/analytics/peak-hours',
  validateRequest({ params: merchantParamSchema, query: dailyQuerySchema }),
  analyticsController.getPeakHours.bind(analyticsController)
);

router.get(
  '/analytics/day-of-week',
  validateRequest({ params: merchantParamSchema }),
  analyticsController.getDayOfWeek.bind(analyticsController)
);

router.get(
  '/analytics/anomalies',
  validateRequest({ params: merchantParamSchema, query: dailyQuerySchema }),
  analyticsController.getAnomalies.bind(analyticsController)
);

export default router;
