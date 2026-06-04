import { Schema, model, models, type Model, type Types } from "mongoose";

export interface IVendor {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  businessId: Types.ObjectId;
  status: "active" | "disabled";
  createdAt: Date;
  updatedAt: Date;
}

const VendorSchema = new Schema<IVendor>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    status: { type: String, enum: ["active", "disabled"], default: "active", index: true },
  },
  { timestamps: true }
);

export const Vendor: Model<IVendor> =
  (models.Vendor as Model<IVendor>) || model<IVendor>("Vendor", VendorSchema);
