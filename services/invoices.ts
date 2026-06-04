import "server-only";
import mongoose, { type Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { Invoice, type IInvoice, type IInvoiceItem } from "@/models/Invoice";
import { Order } from "@/models/Order";
import { PaymentCollection } from "@/models/PaymentCollection";

export type InvoiceItemDTO = {
  productId: string;
  variantId: string | null;
  variantLabel: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
};

export type InvoiceDTO = {
  id: string;
  orderId: string;
  invoiceNumber: string;
  buyerName: string;
  buyerPhone: string;
  items: InvoiceItemDTO[];
  totalQuantity: number;
  totalAmount: number;
  paymentCollectionId: string | null;
  issuedAt: string;
  createdAt: string;
};

function toDTO(d: IInvoice): InvoiceDTO {
  return {
    id: d._id.toString(),
    orderId: d.orderId.toString(),
    invoiceNumber: d.invoiceNumber,
    buyerName: d.buyerName,
    buyerPhone: d.buyerPhone,
    items: d.items.map((it) => ({
      productId: it.productId.toString(),
      variantId: it.variantId ?? null,
      variantLabel: it.variantLabel ?? "",
      name: it.name,
      price: it.price,
      quantity: it.quantity,
      subtotal: it.price * it.quantity,
    })),
    totalQuantity: d.totalQuantity,
    totalAmount: d.totalAmount,
    paymentCollectionId: d.paymentCollectionId ? d.paymentCollectionId.toString() : null,
    issuedAt: d.issuedAt.toISOString(),
    createdAt: d.createdAt.toISOString(),
  };
}

export async function getInvoiceForOrder(
  vendorId: Types.ObjectId | string,
  orderId: string
): Promise<InvoiceDTO | null> {
  if (!mongoose.isValidObjectId(orderId)) return null;
  await connectDB();
  const doc = await Invoice.findOne({ vendorId, orderId }).lean<IInvoice>();
  return doc ? toDTO(doc) : null;
}

export async function generateInvoiceForOrder(
  vendorId: Types.ObjectId | string,
  businessId: Types.ObjectId | string,
  orderId: string
): Promise<{ ok: true; invoice: InvoiceDTO } | { ok: false; reason: string }> {
  if (!mongoose.isValidObjectId(orderId)) return { ok: false, reason: "Invalid order id" };
  await connectDB();

  const existing = await Invoice.findOne({ vendorId, orderId }).lean<IInvoice>();
  if (existing) return { ok: false, reason: "Invoice already exists for this order" };

  const order = await Order.findOne({ _id: orderId, vendorId }).lean();
  if (!order) return { ok: false, reason: "Order not found" };

  const includedItems = order.items.filter((it) => it.included !== false);
  if (includedItems.length === 0) {
    return { ok: false, reason: "No items selected to ship — tick at least one item first" };
  }

  const invoiceId = new mongoose.Types.ObjectId();
  const collectionId = new mongoose.Types.ObjectId();
  const invoiceNumber = `INV-${invoiceId.toString().slice(-6).toUpperCase()}`;

  const items: IInvoiceItem[] = includedItems.map((it) => ({
    productId: it.productId,
    variantId: it.variantId ?? null,
    variantLabel: it.variantLabel ?? "",
    name: it.name,
    price: it.price,
    quantity: it.quantity,
  }));
  const totalQuantity = items.reduce((s, i) => s + i.quantity, 0);
  const totalAmount = items.reduce((s, i) => s + i.price * i.quantity, 0);

  try {
    await PaymentCollection.create({
      _id: collectionId,
      vendorId,
      businessId,
      buyerId: order.buyerId ?? null,
      buyerName: order.buyerName,
      buyerPhone: order.buyerPhone,
      amount: totalAmount,
      method: "cash",
      reference: invoiceNumber,
      notes: `Auto-recorded from invoice ${invoiceNumber}`,
      collectedAt: new Date(),
      invoiceId,
      orderId: order._id,
    });

    const invoice = await Invoice.create({
      _id: invoiceId,
      vendorId,
      businessId,
      orderId: order._id,
      buyerId: order.buyerId ?? null,
      buyerName: order.buyerName,
      buyerPhone: order.buyerPhone,
      invoiceNumber,
      items,
      totalQuantity,
      totalAmount,
      paymentCollectionId: collectionId,
      issuedAt: new Date(),
    });

    return { ok: true, invoice: toDTO(invoice) };
  } catch (err) {
    // Best-effort cleanup if invoice failed after collection was created
    await PaymentCollection.deleteOne({ _id: collectionId }).catch(() => undefined);
    return { ok: false, reason: err instanceof Error ? err.message : "unknown error" };
  }
}
