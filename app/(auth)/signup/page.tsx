import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VendorSignupForm } from "./signup-tabs";

export const metadata = { title: "Seller signup — order.store" };

export default function SignupPage() {
  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Open your store</CardTitle>
        <CardDescription>
          Seller accounts get a public storefront and product/order management.
          Buyers don&apos;t need accounts — they just enter their mobile number at checkout.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <VendorSignupForm />
        <div className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-brand hover:underline">
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
