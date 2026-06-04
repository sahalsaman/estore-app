import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { connectDB } from "@/lib/db";
import { Business } from "@/models/Business";
import { User } from "@/models/User";
import { requireRole } from "@/lib/dal";
import { listTeamMembers } from "@/services/team";
import { SettingsForms } from "./settings-forms";
import { UserProfileForm } from "./user-profile-form";
import { TeamSection } from "./team-section";

const TABS = [
  { key: "profile", label: "Business profile" },
  { key: "user", label: "User profile" },
  { key: "team", label: "Team" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default async function VendorSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await requireRole("vendor");
  const { tab: rawTab } = await searchParams;
  const tab: TabKey = (TABS.some((t) => t.key === rawTab) ? rawTab : "profile") as TabKey;

  await connectDB();
  const [business, userDoc, members] = await Promise.all([
    session.businessId ? Business.findById(session.businessId).lean() : null,
    User.findById(session.userId).lean(),
    session.businessId ? listTeamMembers(session.businessId) : [],
  ]);

  const isOwner =
    !!business && business.ownerId.toString() === session.userId;

  return (
    <div>
      <PageHeader title="Settings" description="Manage your business, your account, and your team." />

      <div className="mb-6 border-b">
        <nav className="-mb-px flex gap-6 overflow-x-auto" aria-label="Settings tabs">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <Link
                key={t.key}
                href={`/business/settings?tab=${t.key}`}
                className={
                  active
                    ? "border-b-2 border-brand pb-3 text-sm font-medium text-brand"
                    : "border-b-2 border-transparent pb-3 text-sm font-medium text-muted-foreground hover:text-foreground"
                }
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {tab === "profile" && (
        <SettingsForms
          business={{
            name: business?.name ?? "",
            phone: business?.phone ?? "",
            address: business?.address ?? "",
            logo: business?.logo ?? "",
          }}
        />
      )}

      {tab === "user" && (
        <Card>
          <CardHeader>
            <CardTitle>Your account</CardTitle>
            <CardDescription>Update your personal details. These are only visible to you.</CardDescription>
          </CardHeader>
          <CardContent>
            <UserProfileForm
              user={{
                name: userDoc?.name ?? "",
                email: userDoc?.email ?? "",
                phone: userDoc?.phone ?? "",
                role: userDoc?.role ?? "vendor",
              }}
            />
          </CardContent>
        </Card>
      )}

      {tab === "team" && (
        <Card>
          <CardHeader>
            <CardTitle>Team</CardTitle>
            <CardDescription>
              People who can sign in and manage this business. Each member has full vendor access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TeamSection
              members={members}
              currentUserId={session.userId}
              isOwner={isOwner}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
