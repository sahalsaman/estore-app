import { Schema, model, models, type Model, type Types } from "mongoose";

export interface IBuyerInvite {
  _id: Types.ObjectId;
  vendorId: Types.ObjectId;
  businessId: Types.ObjectId;
  buyerId?: Types.ObjectId | null;
  buyerName: string;
  buyerPhone: string;
  createdAt: Date;
  updatedAt: Date;
}

const BuyerInviteSchema = new Schema<IBuyerInvite>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", required: true, index: true },
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    buyerId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    buyerName: { type: String, required: true, trim: true },
    buyerPhone: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

BuyerInviteSchema.index({ vendorId: 1, buyerPhone: 1 }, { unique: true });

export const BuyerInvite: Model<IBuyerInvite> =
  (models.BuyerInvite as Model<IBuyerInvite>) ||
  model<IBuyerInvite>("BuyerInvite", BuyerInviteSchema);
