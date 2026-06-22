import "server-only";
import { cache } from "react";
import mongoose, { type Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { BuyerInvite, type IBuyerInvite } from "@/models/BuyerInvite";

export type BuyerInviteDTO = {
  id: string;
  buyerId: string | null;
  buyerName: string;
  buyerPhone: string;
  createdAt: string;
};

function toDTO(d: IBuyerInvite): BuyerInviteDTO {
  return {
    id: d._id.toString(),
    buyerId: d.buyerId ? d.buyerId.toString() : null,
    buyerName: d.buyerName,
    buyerPhone: d.buyerPhone,
    createdAt: d.createdAt.toISOString(),
  };
}

export const listBuyerInvites = cache(
  async (businessId: Types.ObjectId | string): Promise<BuyerInviteDTO[]> => {
    await connectDB();
    const docs = await BuyerInvite.find({ businessId })
      .sort({ createdAt: -1 })
      .lean<IBuyerInvite[]>();
    return docs.map(toDTO);
  }
);

export async function upsertBuyerInvite(
  scope: { businessId: Types.ObjectId | string },
  input: { buyerName: string; buyerPhone: string; buyerId?: Types.ObjectId | string | null }
): Promise<
  | { ok: true; invite: BuyerInviteDTO; created: boolean }
  | { ok: false; reason: string }
> {
  await connectDB();
  try {
    const existing = await BuyerInvite.findOne({
      businessId: scope.businessId,
      buyerPhone: input.buyerPhone,
    });
    if (existing) {
      existing.buyerName = input.buyerName;
      if (input.buyerId) {
        existing.buyerId =
          typeof input.buyerId === "string"
            ? new mongoose.Types.ObjectId(input.buyerId)
            : input.buyerId;
      }
      await existing.save();
      return { ok: true, invite: toDTO(existing), created: false };
    }
    const doc = await BuyerInvite.create({
      businessId: scope.businessId,
      buyerId: input.buyerId || null,
      buyerName: input.buyerName,
      buyerPhone: input.buyerPhone,
    });
    return { ok: true, invite: toDTO(doc), created: true };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "unknown error" };
  }
}
