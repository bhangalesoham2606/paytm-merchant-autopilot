import { Schema, model, Document } from 'mongoose';

export interface IMerchant extends Document {
  merchantId: string;
  businessName: string;
  businessCategory: string;
  timezone: string;
  currency: string;
  operatingHours?: {
    open: string;
    close: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const MerchantSchema = new Schema<IMerchant>(
  {
    merchantId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    businessName: {
      type: String,
      required: true,
      trim: true,
    },
    businessCategory: {
      type: String,
      required: true,
      trim: true,
    },
    timezone: {
      type: String,
      required: true,
      default: 'Asia/Kolkata',
    },
    currency: {
      type: String,
      required: true,
      default: 'INR',
    },
    operatingHours: {
      open: { type: String, default: '09:00' },
      close: { type: String, default: '22:00' },
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

export const Merchant = model<IMerchant>('Merchant', MerchantSchema);
