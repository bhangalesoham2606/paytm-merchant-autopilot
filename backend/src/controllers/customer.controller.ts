import { Request, Response, NextFunction } from 'express';
import { customerService } from '../services/customer.service';

export class CustomerController {
  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { merchantId } = req.params;
      const data = await customerService.getCustomerSummary(merchantId);
      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async getSegments(req: Request, res: Response, next: NextFunction) {
    try {
      const { merchantId } = req.params;
      const data = await customerService.getCustomerSegments(merchantId);
      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async getInactive(req: Request, res: Response, next: NextFunction) {
    try {
      const { merchantId } = req.params;
      const { inactivityDays } = req.query as { inactivityDays?: string };
      const days = inactivityDays ? parseInt(inactivityDays, 10) : undefined;

      const data = await customerService.getInactiveCustomers(merchantId, days);
      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async getHighValue(req: Request, res: Response, next: NextFunction) {
    try {
      const { merchantId } = req.params;
      const data = await customerService.getHighValueCustomers(merchantId);
      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAtRisk(req: Request, res: Response, next: NextFunction) {
    try {
      const { merchantId } = req.params;
      const data = await customerService.getAtRiskCustomers(merchantId);
      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async getActivityTrend(req: Request, res: Response, next: NextFunction) {
    try {
      const { merchantId } = req.params;
      const data = await customerService.getCustomerActivityTrend(merchantId);
      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const customerController = new CustomerController();
