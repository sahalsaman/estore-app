import { Schema, model, models, type Model, type Types } from "mongoose";

export interface IInvoiceItem {
  productId: Types.ObjectId;
  variantId?: string | null;
  variantLabel?: string;
  name: string;
  price: number;
  quantity: number;
}

export interface IInvoice {
  _id: Types.ObjectId;
  vendorId: Types.ObjectId;
  businessId: Types.ObjectId;
  orderId: Types.ObjectId;
  buyerId?: Types.ObjectId | null;
  buyerName: string;
  buyerPhone: string;
  invoiceNumber: string;
  items: IInvoiceItem[];
  totalQuantity: number;
  totalAmount: number;
  paymentCollectionId?: Types.ObjectId | null;
  issuedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceItemSchema = new Schema<IInvoiceItem>(
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

const InvoiceSchema = new Schema<IInvoice>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", required: true, index: true },
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, unique: true, index: true },
    buyerId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    buyerName: { type: String, required: true, trim: true },
    buyerPhone: { type: String, required: true, trim: true, index: true },
    invoiceNumber: { type: String, required: true },
    items: { type: [InvoiceItemSchema], required: true },
    totalQuantity: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentCollectionId: { type: Schema.Types.ObjectId, ref: "PaymentCollection", default: null },
    issuedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

InvoiceSchema.index({ vendorId: 1, invoiceNumber: 1 }, { unique: true });

export const Invoice: Model<IInvoice> =
  (models.Invoice as Model<IInvoice>) || model<IInvoice>("Invoice", InvoiceSchema);
