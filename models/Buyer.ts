import { Schema, model, models, type Model, type Types } from "mongoose";

export interface IBuyer {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BuyerSchema = new Schema<IBuyer>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    address: String,
  },
  { timestamps: true }
);

export const Buyer: Model<IBuyer> =
  (models.Buyer as Model<IBuyer>) || model<IBuyer>("Buyer", BuyerSchema);
