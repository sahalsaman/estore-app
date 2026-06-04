import { Schema, model, models, type Model, type Types } from "mongoose";

export type PaymentStatus = "pending" | "paid" | "failed";
export type OrderStatus =
  | "placed"
  | "accepted"
  | "rejected"
  | "packed"
  | "shipped"
  | "delivered";

export interface IOrderItem {
  productId: Types.ObjectId;
  variantId?: string | null;
  variantLabel?: string;
  name: string;
  price: number;
  quantity: number;
  included: boolean;
}

export interface IOrder {
  _id: Types.ObjectId;
  vendorId: Types.ObjectId;
  businessId: Types.ObjectId;
  buyerId?: Types.ObjectId | null;
  buyerName: string;
  buyerPhone: string;
  items: IOrderItem[];
  totalQuantity: number;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: String, default: null },
    variantLabel: { type: String, default: "" },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    included: { type: Boolean, default: true },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", required: true, index: true },
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    buyerId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    buyerName: { type: String, required: true, trim: true },
    buyerPhone: { type: String, required: true, trim: true, index: true },
    items: { type: [OrderItemSchema], required: true },
    totalQuantity: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentStatus: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
    orderStatus: {
      type: String,
      enum: ["placed", "accepted", "rejected", "packed", "shipped", "delivered"],
      default: "placed",
      index: true,
    },
  },
  { timestamps: true }
);

export const Order: Model<IOrder> =
  (models.Order as Model<IOrder>) || model<IOrder>("Order", OrderSchema);
