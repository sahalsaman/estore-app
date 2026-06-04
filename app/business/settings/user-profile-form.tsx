"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateOwnProfileAction, type UserProfileFormState } from "@/actions/user";

export function UserProfileForm({
  user,
}: {
  user: { name: string; email: string; phone: string; role: string };
}) {
  const [state, action, pending] = useActionState<UserProfileFormState, FormData>(
    updateOwnProfileAction,
    undefined
  );
  const e = state?.fieldErrors;

  useEffect(() => {
    if (state?.ok) toast.success("Profile updated");
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={user.name} />
        {e?.name && <p className="text-sm text-destructive">{e.name[0]}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={user.email || "—"} disabled readOnly />
        <p className="text-xs text-muted-foreground">
          Email cannot be changed here. Contact support if you need a different login email.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" defaultValue={user.phone} inputMode="tel" />
        {e?.phone && <p className="text-sm text-destructive">{e.phone[0]}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Input id="role" value={user.role} disabled readOnly className="capitalize" />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" variant="brand" disabled={pending}>
        {pending ? "Saving..." : "Save profile"}
      </Button>
    </form>
  );
}
