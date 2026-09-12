import { Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analytics.service';

export class AnalyticsController {
  async getDaily(req: Request, res: Response, next: NextFunction) {
    try {
      const { merchantId } = req.params;
      const { date } = req.query as { date?: string };
      const data = await analyticsService.getDailyMetrics(merchantId, date);
      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async getCompare(req: Request, res: Response, next: NextFunction) {
    try {
      const { merchantId } = req.params;
      const { currentFrom, currentTo, previousFrom, previousTo, preset, referenceDate } = req.query as any;

      const data = await analyticsService.getPeriodComparison(merchantId, {
        currentFrom,
        currentTo,
        previousFrom,
        previousTo,
        preset,
        referenceDate,
      });

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async getRevenueTrend(req: Request, res: Response, next: NextFunction) {
    try {
      const { merchantId } = req.params;
      const { period, granularity } = req.query as any;

      const data = await analyticsService.getRevenueTrend(merchantId, period, granularity);
      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPeakHours(req: Request, res: Response, next: NextFunction) {
    try {
      const { merchantId } = req.params;
      const { date } = req.query as { date?: string };

      const data = await analyticsService.getPeakHours(merchantId, date);
      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async getDayOfWeek(req: Request, res: Response, next: NextFunction) {
    try {
      const { merchantId } = req.params;
      const data = await analyticsService.getDayOfWeekPerformance(merchantId);
      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAnomalies(req: Request, res: Response, next: NextFunction) {
    try {
      const { merchantId } = req.params;
      const { date } = req.query as { date?: string };

      const data = await analyticsService.getSalesAnomalies(merchantId, date);
      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const analyticsController = new AnalyticsController();
