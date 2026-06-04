"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  editMemberAction,
  removeMemberAction,
  type EditMemberState,
} from "@/actions/team";

export function EditMemberDialog({
  memberUserId,
  initialName,
  email,
  canRemove,
}: {
  memberUserId: string;
  initialName: string;
  email: string;
  canRemove: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [pending, startSave] = useTransition();
  const [removing, startRemove] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const onSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startSave(async () => {
      setFieldErrors({});
      const bound = editMemberAction.bind(null, memberUserId);
      const res: EditMemberState = await bound(undefined, fd);
      if (res?.ok) {
        toast.success("Member updated");
        setOpen(false);
        router.refresh();
      } else if (res?.fieldErrors) {
        setFieldErrors(res.fieldErrors);
      } else if (res?.error) {
        toast.error(res.error);
      }
    });
  };

  const onRemove = () => {
    if (!confirm(`Remove ${initialName} from the team? They will lose access immediately.`)) return;
    startRemove(async () => {
      const res = await removeMemberAction(memberUserId);
      if (res.ok) {
        toast.success("Member removed");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit team member</DialogTitle>
          <DialogDescription>{email}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={initialName} disabled={pending || removing} />
            {fieldErrors.name && <p className="text-sm text-destructive">{fieldErrors.name[0]}</p>}
          </div>
          <DialogFooter className="gap-2 pt-2">
            {canRemove && (
              <Button
                type="button"
                variant="outline"
                onClick={onRemove}
                disabled={pending || removing}
                className="mr-auto text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                {removing ? "Removing..." : "Remove from team"}
              </Button>
            )}
            <Button type="submit" variant="brand" disabled={pending || removing}>
              {pending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
