import "server-only";
import { cache } from "react";
import mongoose, { type Types } from "mongoose";
import { connectDB } from "@/lib/db";
import {
  PaymentCollection,
  type IPaymentCollection,
  type PaymentMethod,
} from "@/models/PaymentCollection";

export type PaymentCollectionDTO = {
  id: string;
  buyerId: string | null;
  buyerName: string;
  buyerPhone: string;
  amount: number;
  method: PaymentMethod;
  reference: string;
  notes: string;
  collectedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type PaymentCollectionInput = {
  buyerId?: string | null;
  buyerName: string;
  buyerPhone: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  collectedAt: Date;
};

function toDTO(d: IPaymentCollection): PaymentCollectionDTO {
  return {
    id: d._id.toString(),
    buyerId: d.buyerId ? d.buyerId.toString() : null,
    buyerName: d.buyerName,
    buyerPhone: d.buyerPhone,
    amount: d.amount,
    method: d.method,
    reference: d.reference ?? "",
    notes: d.notes ?? "",
    collectedAt: d.collectedAt.toISOString(),
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

export const listPaymentCollections = cache(
  async (vendorId: Types.ObjectId | string): Promise<PaymentCollectionDTO[]> => {
    await connectDB();
    const docs = await PaymentCollection.find({ vendorId })
      .sort({ collectedAt: -1, createdAt: -1 })
      .lean<IPaymentCollection[]>();
    return docs.map(toDTO);
  }
);

export async function listCollectionsForBuyer(
  vendorId: Types.ObjectId | string,
  buyerPhone: string
): Promise<PaymentCollectionDTO[]> {
  if (!buyerPhone) return [];
  await connectDB();
  const docs = await PaymentCollection.find({ vendorId, buyerPhone })
    .sort({ collectedAt: -1, createdAt: -1 })
    .lean<IPaymentCollection[]>();
  return docs.map(toDTO);
}

export async function getPaymentCollection(
  vendorId: Types.ObjectId | string,
  id: string
): Promise<PaymentCollectionDTO | null> {
  if (!mongoose.isValidObjectId(id)) return null;
  await connectDB();
  const doc = await PaymentCollection.findOne({ _id: id, vendorId }).lean<IPaymentCollection>();
  return doc ? toDTO(doc) : null;
}

export async function createPaymentCollection(
  scope: { vendorId: Types.ObjectId | string; businessId: Types.ObjectId | string },
  input: PaymentCollectionInput
): Promise<{ ok: true; collection: PaymentCollectionDTO } | { ok: false; reason: string }> {
  await connectDB();
  try {
    const doc = await PaymentCollection.create({
      vendorId: scope.vendorId,
      businessId: scope.businessId,
      buyerId: input.buyerId || null,
      buyerName: input.buyerName,
      buyerPhone: input.buyerPhone,
      amount: input.amount,
      method: input.method,
      reference: input.reference ?? "",
      notes: input.notes ?? "",
      collectedAt: input.collectedAt,
    });
    return { ok: true, collection: toDTO(doc) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "unknown error" };
  }
}

export async function updatePaymentCollection(
  vendorId: Types.ObjectId | string,
  id: string,
  input: PaymentCollectionInput
): Promise<{ ok: true; collection: PaymentCollectionDTO } | { ok: false; reason: string }> {
  if (!mongoose.isValidObjectId(id)) return { ok: false, reason: "Invalid id" };
  await connectDB();
  const doc = await PaymentCollection.findOneAndUpdate(
    { _id: id, vendorId },
    {
      $set: {
        buyerId: input.buyerId || null,
        buyerName: input.buyerName,
        buyerPhone: input.buyerPhone,
        amount: input.amount,
        method: input.method,
        reference: input.reference ?? "",
        notes: input.notes ?? "",
        collectedAt: input.collectedAt,
      },
    },
    { new: true }
  ).lean<IPaymentCollection>();
  if (!doc) return { ok: false, reason: "Not found" };
  return { ok: true, collection: toDTO(doc) };
}

export async function deletePaymentCollection(
  vendorId: Types.ObjectId | string,
  id: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!mongoose.isValidObjectId(id)) return { ok: false, reason: "Invalid id" };
  await connectDB();
  const res = await PaymentCollection.deleteOne({ _id: id, vendorId });
  if (res.deletedCount === 0) return { ok: false, reason: "Not found" };
  return { ok: true };
}
