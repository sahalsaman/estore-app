import { Schema, model, models, type Model, type Types } from "mongoose";
import type { UserRole } from "@/lib/session";

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email?: string;
  phone?: string;
  password?: string;
  role: UserRole;
  businessId?: Types.ObjectId | null;
  // Per-member active/disabled flag for vendor (seller) team members.
  status: "active" | "disabled";
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    password: { type: String },
    role: { type: String, enum: ["admin", "vendor", "buyer"], required: true, index: true },
    businessId: { type: Schema.Types.ObjectId, ref: "Business", default: null, index: true },
    status: { type: String, enum: ["active", "disabled"], default: "active", index: true },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 }, { unique: true, sparse: true });
UserSchema.index({ phone: 1 }, { unique: true, sparse: true });

export const User: Model<IUser> =
  (models.User as Model<IUser>) || model<IUser>("User", UserSchema);
