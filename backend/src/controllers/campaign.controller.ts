import { Request, Response, NextFunction } from 'express';
import { campaignService } from '../services/campaign.service';

export class CampaignController {
  async createCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const { merchantId } = req.params;
      const { segment, offer, recipientCount } = req.body;

      const data = await campaignService.createCampaign(merchantId, {
        segment,
        offer,
        recipientCount,
      });

      res.status(201).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async getCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const { merchantId, campaignId } = req.params;
      const data = await campaignService.getCampaign(merchantId, campaignId);

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async getCampaignPerformance(req: Request, res: Response, next: NextFunction) {
    try {
      const { merchantId, campaignId } = req.params;
      const data = await campaignService.getCampaignPerformance(merchantId, campaignId);

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const campaignController = new CampaignController();
