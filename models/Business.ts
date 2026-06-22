import { Schema, model, models, type Model, type Types } from "mongoose";

export interface IBusiness {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  logo?: string;
  address?: string;
  phone?: string;
  ownerId: Types.ObjectId;
  teamMembers?: Types.ObjectId[];
  verified: boolean;
  role: "buyer" | "seller";
  status: "active" | "disabled";
  createdAt: Date;
  updatedAt: Date;
}

const BusinessSchema = new Schema<IBusiness>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    logo: String,
    address: String,
    phone: String,
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    teamMembers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    role: { type: String, enum: ["buyer", "seller"], default: "buyer" },
    verified: { type: Boolean, default: false },
    status: { type: String, enum: ["active", "disabled"], default: "active" },
  },
  { timestamps: true }
);

export const Business: Model<IBusiness> =
  (models.Business as Model<IBusiness>) || model<IBusiness>("Business", BusinessSchema);
