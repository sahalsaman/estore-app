import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function ThanksPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ o?: string }>;
}) {
  const { slug } = await params;
  const { o } = await searchParams;
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-semibold">Order placed</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Thank you! The seller has been notified and will reach you on your mobile shortly.
        </p>
        {o && <p className="text-xs text-muted-foreground">Order ID: {o}</p>}
        <Button variant="brand" asChild className="mt-2">
          <Link href={`/store/${slug}`}>Keep browsing</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
