import Link from "next/link";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ListSearch({
  action,
  q,
  placeholder,
}: {
  action: string;
  q?: string;
  placeholder: string;
}) {
  return (
    <form action={action} className="flex w-full max-w-md gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" defaultValue={q ?? ""} placeholder={placeholder} className="pl-9" />
      </div>
      <Button type="submit" variant="outline">Search</Button>
      {q ? (
        <Button type="button" variant="ghost" asChild>
          <Link href={action} aria-label="Clear search">
            <X className="h-4 w-4" />
          </Link>
        </Button>
      ) : null}
    </form>
  );
}
