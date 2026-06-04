"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Copy, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inviteMemberAction, type InviteMemberState } from "@/actions/team";

export function InviteMemberDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, formAction, pending] = useActionState<InviteMemberState, FormData>(
    inviteMemberAction,
    undefined
  );
  const e = state?.fieldErrors;
  const [copied, setCopied] = useState<"email" | "password" | null>(null);

  useEffect(() => {
    if (state?.ok) toast.success(`Invited ${state.sharedName}`);
    if (state?.error) toast.error(state.error);
  }, [state]);

  const copy = async (text: string, key: "email" | "password") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) router.refresh();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="brand">
          <UserPlus className="h-4 w-4" /> Invite member
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite team member</DialogTitle>
          <DialogDescription>
            Create login credentials. Share them with your teammate so they can sign in.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={state?.sharedName} />
            {e?.name && <p className="text-sm text-destructive">{e.name[0]}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={state?.sharedEmail} />
            {e?.email && <p className="text-sm text-destructive">{e.email[0]}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Temporary password</Label>
            <Input id="password" name="password" type="text" placeholder="Min 6 characters" />
            {e?.password && <p className="text-sm text-destructive">{e.password[0]}</p>}
            <p className="text-xs text-muted-foreground">
              Share this password with them so they can sign in. They can change it later.
            </p>
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" variant="brand" disabled={pending}>
            {pending ? "Inviting..." : "Invite member"}
          </Button>
        </form>

        {state?.ok && state.sharedEmail && state.sharedPassword && (
          <div className="space-y-3 rounded-md border bg-muted/30 p-4">
            <p className="text-sm font-medium">Credentials for {state.sharedName}</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <code className="flex-1 truncate rounded bg-background px-2 py-1 font-mono text-xs">
                  {state.sharedEmail}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => copy(state.sharedEmail!, "email")}
                >
                  {copied === "email" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <code className="flex-1 truncate rounded bg-background px-2 py-1 font-mono text-xs">
                  {state.sharedPassword}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => copy(state.sharedPassword!, "password")}
                >
                  {copied === "password" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              They sign in at <code>/login</code> with this email and password.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
