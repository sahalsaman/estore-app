import { Schema, model, models, type Model, type Types } from "mongoose";

export type ReturnStatus = "requested" | "approved" | "rejected";

export interface IReturnItem {
  productId: Types.ObjectId;
  variantId?: string | null;
  variantLabel?: string;
  name: string;
  price: number;
  quantity: number;
}

export interface IReturnRequest {
  _id: Types.ObjectId;
  businessId: Types.ObjectId; // the seller — scope key
  orderId: Types.ObjectId;
  buyerId?: Types.ObjectId | null;
  buyerName: string;
  buyerPhone: string;
  items: IReturnItem[];
  totalQuantity: number;
  totalAmount: number;
  reason?: string;
  status: ReturnStatus;
  resolvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ReturnItemSchema = new Schema<IReturnItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: String, default: null },
    variantLabel: { type: String, default: "" },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const ReturnRequestSchema = new Schema<IReturnRequest>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    buyerId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    buyerName: { type: String, required: true, trim: true },
    buyerPhone: { type: String, required: true, trim: true, index: true },
    items: { type: [ReturnItemSchema], required: true },
    totalQuantity: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    reason: { type: String, default: "" },
    status: {
      type: String,
      enum: ["requested", "approved", "rejected"],
      default: "requested",
      index: true,
    },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const ReturnRequest: Model<IReturnRequest> =
  (models.ReturnRequest as Model<IReturnRequest>) ||
  model<IReturnRequest>("ReturnRequest", ReturnRequestSchema);
