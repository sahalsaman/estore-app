"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { ImageOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateBusinessProfile, type VendorFormState } from "@/actions/vendor";

export type BusinessProfile = {
  name: string;
  phone: string;
  address: string;
  logo: string;
};

export function SettingsForms({ business }: { business: BusinessProfile }) {
  return (
    <div className="grid gap-6">
      <ProfileCard business={business} />
    </div>
  );
}

function ProfileCard({ business }: { business: BusinessProfile }) {
  const [state, action, pending] = useActionState<VendorFormState, FormData>(
    updateBusinessProfile,
    undefined
  );
  const [logoPreview, setLogoPreview] = useState(business.logo);
  const [logoErrored, setLogoErrored] = useState(false);

  useEffect(() => {
    if (state?.ok) toast.success("Profile saved");
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business profile</CardTitle>
        <CardDescription>Shop details shown to admins and on your storefront.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="businessName">Business name</Label>
            <Input id="businessName" name="businessName" defaultValue={business.name} />
            {state?.fieldErrors?.businessName && (
              <p className="text-sm text-destructive">{state.fieldErrors.businessName[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" defaultValue={business.phone} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" name="address" defaultValue={business.address} rows={2} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo">Logo URL</Label>
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted text-muted-foreground">
                {logoPreview && !logoErrored ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="h-full w-full object-cover"
                    onError={() => setLogoErrored(true)}
                  />
                ) : (
                  <ImageOff className="h-5 w-5" />
                )}
              </div>
              <Input
                id="logo"
                name="logo"
                defaultValue={business.logo}
                placeholder="https://example.com/logo.png"
                onChange={(e) => {
                  setLogoPreview(e.target.value);
                  setLogoErrored(false);
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Paste a public image URL. Shown on your storefront header. Leave blank to use the default icon.
            </p>
          </div>

          <Button type="submit" variant="brand" disabled={pending}>
            {pending ? "Saving..." : "Save profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
