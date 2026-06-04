import { Building2, ShoppingBag, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { connectDB } from "@/lib/db";
import { Business } from "@/models/Business";
import { Vendor } from "@/models/Vendor";
import { Buyer } from "@/models/Buyer";
import { AdminChart } from "./admin-chart";

async function getCounts() {
  await connectDB();
  const [businesses, vendors, buyers] = await Promise.all([
    Business.countDocuments(),
    Vendor.countDocuments(),
    Buyer.countDocuments(),
  ]);
  return { businesses, vendors, buyers };
}

async function getVendorGrowth() {
  await connectDB();
  const since = new Date();
  since.setDate(since.getDate() - 29);
  const rows = await Vendor.aggregate<{ _id: string; count: number }>([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  const map = new Map(rows.map((r) => [r._id, r.count]));
  const days: { date: string; vendors: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key.slice(5), vendors: map.get(key) ?? 0 });
  }
  return days;
}

export default async function AdminDashboardPage() {
  const [counts, growth] = await Promise.all([getCounts(), getVendorGrowth()]);
  return (
    <div>
      <PageHeader title="Overview" description="Platform-wide health at a glance." />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Businesses" value={counts.businesses} icon={<Building2 className="h-5 w-5" />} />
        <StatCard label="Vendors" value={counts.vendors} accent="emerald" icon={<ShoppingBag className="h-5 w-5" />} />
        <StatCard label="Buyers" value={counts.buyers} accent="amber" icon={<Users className="h-5 w-5" />} />
      </div>
      <div className="mt-6">
        <AdminChart data={growth} />
      </div>
    </div>
  );
}
