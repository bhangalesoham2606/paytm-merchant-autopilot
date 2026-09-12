import { Schema, model, Document } from 'mongoose';

export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'SENT' | 'COMPLETED' | 'CANCELLED';

export interface ICampaign extends Document {
  campaignId: string;
  merchantId: string;
  segment: string;
  offer: string;
  status: CampaignStatus;
  recipientCount: number;
  sentAt?: Date;
  result?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaign>(
  {
    campaignId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    merchantId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    segment: {
      type: String,
      required: true,
      trim: true,
    },
    offer: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['DRAFT', 'SCHEDULED', 'SENT', 'COMPLETED', 'CANCELLED'],
      default: 'DRAFT',
    },
    recipientCount: {
      type: Number,
      default: 0,
    },
    sentAt: {
      type: Date,
    },
    result: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret) => {
        delete (ret as any).__v;
        delete (ret as any)._id;
        return ret;
      },
    },
  }
);

CampaignSchema.index({ merchantId: 1, createdAt: -1 });

export const Campaign = model<ICampaign>('Campaign', CampaignSchema);
