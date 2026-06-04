"use client";

import { useActionState } from "react";
import { vendorSignupAction, type AuthState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function FieldError({ msg }: { msg?: string[] }) {
  if (!msg?.length) return null;
  return <p className="text-sm text-destructive">{msg[0]}</p>;
}

export function VendorSignupForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(vendorSignupAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="v-name">Your name</Label>
          <Input id="v-name" name="name" placeholder="Owner name" />
          <FieldError msg={state?.fieldErrors?.name} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="v-email">Email</Label>
          <Input id="v-email" name="email" type="email" placeholder="owner@shop.com" />
          <FieldError msg={state?.fieldErrors?.email} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="v-business">Business name</Label>
          <Input id="v-business" name="businessName" placeholder="My Store" />
          <FieldError msg={state?.fieldErrors?.businessName} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="v-phone">Phone</Label>
          <Input id="v-phone" name="phone" placeholder="9876543210" inputMode="tel" />
          <FieldError msg={state?.fieldErrors?.phone} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="v-address">Business address (optional)</Label>
        <Textarea id="v-address" name="address" rows={2} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="v-password">Password</Label>
        <Input id="v-password" name="password" type="password" />
        <FieldError msg={state?.fieldErrors?.password} />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" variant="brand" className="w-full" disabled={pending}>
        {pending ? "Creating shop..." : "Create vendor account"}
      </Button>
    </form>
  );
}
