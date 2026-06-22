"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { updateOrderStatusAction } from "@/actions/orders";
import type { OrderStatus, PaymentStatus } from "@/models/Order";

const PAYMENT_OPTIONS: PaymentStatus[] = ["pending", "credit", "paid", "failed"];
const ORDER_OPTIONS: OrderStatus[] = [
  "placed",
  "accepted",
  "rejected",
  "packed",
  "shipped",
  "delivered",
];

export function OrderStatusForm({
  orderId,
  paymentStatus,
  orderStatus,
}: {
  orderId: string;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
}) {
  const [pay, setPay] = useState<PaymentStatus>(paymentStatus);
  const [ord, setOrd] = useState<OrderStatus>(orderStatus);
  const [pending, start] = useTransition();
  const dirty = pay !== paymentStatus || ord !== orderStatus;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="orderStatus">Order status</Label>
          <select
            id="orderStatus"
            value={ord}
            onChange={(e) => setOrd(e.target.value as OrderStatus)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={pending}
          >
            {ORDER_OPTIONS.map((o) => (
              <option key={o} value={o} className="capitalize">{o}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentStatus">Payment status</Label>
          <select
            id="paymentStatus"
            value={pay}
            onChange={(e) => setPay(e.target.value as PaymentStatus)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={pending}
          >
            {PAYMENT_OPTIONS.map((o) => (
              <option key={o} value={o} className="capitalize">{o}</option>
            ))}
          </select>
        </div>
      </div>
      <Button
        variant="brand"
        disabled={!dirty || pending}
        onClick={() =>
          start(async () => {
            const res = await updateOrderStatusAction(orderId, { paymentStatus: pay, orderStatus: ord });
            if (res.ok) toast.success("Status updated");
            else toast.error(res.message);
          })
        }
      >
        {pending ? "Saving..." : "Save status"}
      </Button>
    </div>
  );
}
