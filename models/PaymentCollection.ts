import { Schema, model, models, type Model, type Types } from "mongoose";

export type PaymentMethod = "cash" | "upi" | "bank_transfer" | "cheque" | "other";

export interface IPaymentCollection {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  buyerId?: Types.ObjectId | null;
  buyerName: string;
  buyerPhone: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  collectedAt: Date;
  invoiceId?: Types.ObjectId | null;
  orderId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentCollectionSchema = new Schema<IPaymentCollection>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    buyerId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    buyerName: { type: String, required: true, trim: true },
    buyerPhone: { type: String, required: true, trim: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    method: {
      type: String,
      enum: ["cash", "upi", "bank_transfer", "cheque", "other"],
      default: "cash",
    },
    reference: { type: String, default: "" },
    notes: { type: String, default: "" },
    collectedAt: { type: Date, required: true, default: Date.now, index: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice", default: null, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", default: null, index: true },
  },
  { timestamps: true }
);

export const PaymentCollection: Model<IPaymentCollection> =
  (models.PaymentCollection as Model<IPaymentCollection>) ||
  model<IPaymentCollection>("PaymentCollection", PaymentCollectionSchema);
