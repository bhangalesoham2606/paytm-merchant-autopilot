import { Router } from 'express';
import { z } from 'zod';
import { campaignController } from '../controllers/campaign.controller';
import { validateRequest } from '../middleware/validation.middleware';

const router = Router({ mergeParams: true });

const merchantParamSchema = z.object({
  merchantId: z.string().min(1, 'merchantId is required'),
});

const campaignParamSchema = z.object({
  merchantId: z.string().min(1, 'merchantId is required'),
  campaignId: z.string().min(1, 'campaignId is required'),
});

const createCampaignBodySchema = z.object({
  segment: z.string().min(1, 'segment is required'),
  offer: z.string().min(1, 'offer is required'),
  recipientCount: z.number().int().nonnegative().optional(),
});

router.post(
  '/campaigns',
  validateRequest({ params: merchantParamSchema, body: createCampaignBodySchema }),
  campaignController.createCampaign.bind(campaignController)
);

router.get(
  '/campaigns/:campaignId',
  validateRequest({ params: campaignParamSchema }),
  campaignController.getCampaign.bind(campaignController)
);

router.get(
  '/campaigns/:campaignId/performance',
  validateRequest({ params: campaignParamSchema }),
  campaignController.getCampaignPerformance.bind(campaignController)
);

export default router;
