import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Users } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { TeamMemberDTO } from "@/services/team";
import { InviteMemberDialog } from "./invite-member-dialog";
import { EditMemberDialog } from "./edit-member-dialog";

export function TeamSection({
  members,
  currentUserId,
  isOwner,
}: {
  members: TeamMemberDTO[];
  currentUserId: string;
  isOwner: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {members.length} {members.length === 1 ? "person" : "people"} on the team.
          {!isOwner && " Only the owner can invite or remove members."}
        </p>
        {isOwner && <InviteMemberDialog />}
      </div>

      {members.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="No team members yet"
          description="Invite someone to help you run this business."
          action={isOwner ? <InviteMemberDialog /> : undefined}
        />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => {
                const isSelf = m.userId === currentUserId;
                return (
                  <TableRow key={m.userId}>
                    <TableCell className="font-medium">
                      {m.name}
                      {isSelf && (
                        <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                      )}
                    </TableCell>
                    <TableCell>{m.email || "—"}</TableCell>
                    <TableCell>
                      {m.isOwner ? (
                        <Badge variant="default">Owner</Badge>
                      ) : (
                        <Badge variant="secondary">Member</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(m.joinedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {isOwner && !m.isOwner ? (
                        <EditMemberDialog
                          memberUserId={m.userId}
                          initialName={m.name}
                          email={m.email}
                          canRemove
                        />
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
