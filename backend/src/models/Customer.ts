import { Schema, model, Document } from 'mongoose';

export interface ICustomer extends Document {
  customerId: string;
  merchantId: string;
  name?: string;
  phone?: string;
  firstPurchaseAt?: Date;
  lastPurchaseAt?: Date;
  totalSpend: number;
  transactionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    customerId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    merchantId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    firstPurchaseAt: {
      type: Date,
    },
    lastPurchaseAt: {
      type: Date,
      index: true,
    },
    totalSpend: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    transactionCount: {
      type: Number,
      default: 0,
      min: 0,
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

CustomerSchema.index({ merchantId: 1, customerId: 1 }, { unique: true });
CustomerSchema.index({ merchantId: 1, totalSpend: -1 });
CustomerSchema.index({ merchantId: 1, lastPurchaseAt: -1 });

export const Customer = model<ICustomer>('Customer', CustomerSchema);
