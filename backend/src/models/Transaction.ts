import { Schema, model, Document } from 'mongoose';

export type TransactionStatus = 'SUCCESS' | 'FAILED' | 'PENDING' | 'REFUNDED';

export interface ITransaction extends Document {
  transactionId: string;
  merchantId: string;
  customerId: string;
  amount: number;
  timestamp: Date;
  status: TransactionStatus;
  paymentMethod: string;
  refundAmount: number;
  orderId?: string;
  createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    transactionId: {
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
    customerId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['SUCCESS', 'FAILED', 'PENDING', 'REFUNDED'],
      index: true,
    },
    paymentMethod: {
      type: String,
      required: true,
      default: 'UPI',
    },
    refundAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    orderId: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform: (_, ret) => {
        delete (ret as any).__v;
        delete (ret as any)._id;
        return ret;
      },
    },
  }
);

TransactionSchema.index({ merchantId: 1, timestamp: -1 });
TransactionSchema.index({ merchantId: 1, status: 1, timestamp: -1 });
TransactionSchema.index({ merchantId: 1, customerId: 1 });

export const Transaction = model<ITransaction>('Transaction', TransactionSchema);
