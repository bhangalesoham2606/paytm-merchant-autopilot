import { Campaign } from '../models/Campaign';
import { Merchant } from '../models/Merchant';
import { NotFoundError } from '../utils/errors';

export class CampaignService {
  private async ensureMerchant(merchantId: string) {
    const merchant = await Merchant.findOne({ merchantId });
    if (!merchant) {
      throw new NotFoundError(`Merchant with ID '${merchantId}' not found.`, 'MERCHANT_NOT_FOUND');
    }
    return merchant;
  }

  async createCampaign(
    merchantId: string,
    data: { segment: string; offer: string; recipientCount?: number }
  ) {
    await this.ensureMerchant(merchantId);
    const campaignId = `CMP_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const campaign = await Campaign.create({
      campaignId,
      merchantId,
      segment: data.segment,
      offer: data.offer,
      status: 'DRAFT',
      recipientCount: data.recipientCount || 0,
      result: {
        estimatedReach: data.recipientCount || 0,
        dispatchedCount: 0,
        clickThroughRate: 0,
      },
    });

    return campaign;
  }

  async getCampaign(merchantId: string, campaignId: string) {
    await this.ensureMerchant(merchantId);
    const campaign = await Campaign.findOne({ merchantId, campaignId });
    if (!campaign) {
      throw new NotFoundError(
        `Campaign with ID '${campaignId}' not found for this merchant.`,
        'CAMPAIGN_NOT_FOUND'
      );
    }
    return campaign;
  }

  async getCampaignPerformance(merchantId: string, campaignId: string) {
    const campaign = await this.getCampaign(merchantId, campaignId);
    return {
      campaignId: campaign.campaignId,
      merchantId: campaign.merchantId,
      status: campaign.status,
      recipientCount: campaign.recipientCount,
      sentAt: campaign.sentAt || null,
      performance: campaign.result || {
        impressions: 0,
        conversions: 0,
        revenueAttributed: 0,
      },
    };
  }
}

export const campaignService = new CampaignService();
