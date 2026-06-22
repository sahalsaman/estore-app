import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BuyerAuthForm } from "./buyer-auth-form";

export const metadata = { title: "Buyer sign in — order.store" };

export default function BuyerLoginPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Buyer account</CardTitle>
        <CardDescription>
          Sign in with your mobile number to track orders, invoices and balances. New buyers can create an account in seconds.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <BuyerAuthForm />
        <div className="text-center text-sm text-muted-foreground">
          Are you a seller?{" "}
          <Link href="/login" className="text-brand hover:underline">
            Seller sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
