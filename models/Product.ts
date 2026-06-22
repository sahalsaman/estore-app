import { Schema, model, models, type Model, type Types } from "mongoose";

export interface IVariantOption {
  name: string; // e.g. "Color", "Size"
  value: string; // e.g. "Red", "7"
}

export interface IProductVariant {
  _id: Types.ObjectId;
  options: IVariantOption[]; // one entry per dimension defined in optionNames
  price: number; // MRP for this variant
  wholesalePrice: number; // selling price for this variant
  stock: number;
  status: "active" | "inactive";
}

// Image keyed by an option *value* (e.g. "Red" -> url). Shared across the
// other dimensions, so every Red/Size variant shows the same picture.
export interface IVariantImage {
  value: string;
  image: string;
}

export interface IProduct {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  name: string;
  description?: string;
  // For products with variants these are rollups kept in sync on save:
  //   stock          = Σ variant stock
  //   price          = min variant MRP
  //   wholesalePrice = min variant selling price ("from ₹X")
  price: number;
  wholesalePrice: number;
  stock: number;
  category: string;
  status: "active" | "inactive";
  images: string[];
  hasVariants: boolean;
  optionNames: string[]; // 0–2 dimension names, e.g. ["Color", "Size"]
  variants: IProductVariant[]; // empty when hasVariants is false
  variantImages: IVariantImage[]; // per-option-value images (e.g. color swatches)
  createdAt: Date;
  updatedAt: Date;
}

const VariantOptionSchema = new Schema<IVariantOption>(
  {
    name: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const VariantImageSchema = new Schema<IVariantImage>(
  {
    value: { type: String, required: true, trim: true },
    image: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const ProductVariantSchema = new Schema<IProductVariant>({
  options: { type: [VariantOptionSchema], default: [] },
  price: { type: Number, required: true, min: 0, default: 0 },
  wholesalePrice: { type: Number, required: true, min: 0, default: 0 },
  stock: { type: Number, required: true, min: 0, default: 0 },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
});

const ProductSchema = new Schema<IProduct>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0, default: 0 },
    wholesalePrice: { type: Number, required: true, min: 0, default: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    category: { type: String, required: true, trim: true, default: "General" },
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
    images: { type: [String], default: [] },
    hasVariants: { type: Boolean, default: false },
    optionNames: { type: [String], default: [] },
    variants: { type: [ProductVariantSchema], default: [] },
    variantImages: { type: [VariantImageSchema], default: [] },
  },
  { timestamps: true }
);

export const Product: Model<IProduct> =
  (models.Product as Model<IProduct>) || model<IProduct>("Product", ProductSchema);
