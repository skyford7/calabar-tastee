import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthProvider";
import { errorMessage, supabase } from "@/lib/supabase";
import { ROLE_LABEL } from "@/lib/types";
import { joinName, splitName } from "@/lib/staffApi";
import { CredentialForm } from "../CredentialForm";
import { Badge, Button, Card, Field, Input, PageHeader } from "../ui";

export function AccountPage() {
  const { profile, role, refresh } = useAuth();
  const [details, setDetails] = useState(() => ({
    first_name: splitName(profile?.full_name).first,
    last_name: splitName(profile?.full_name).last,
    phone: profile?.phone ?? "",
  }));
  const [savingDetails, setSavingDetails] = useState(false);

  const saveDetails = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSavingDetails(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: joinName(details.first_name, details.last_name), phone: details.phone.trim() || null })
      .eq("id", profile.id);
    setSavingDetails(false);
    if (error) return toast.error(errorMessage(error));
    toast.success("Details saved");
    void refresh();
  };

  return (
    <>
      <PageHeader title="My account" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-white">Your details</h2>
            {role && <Badge tone="amber">{ROLE_LABEL[role]}</Badge>}
          </div>
          <form onSubmit={saveDetails} className="space-y-4">
            <Field label="Username">
              <Input value={profile?.username ?? ""} disabled />
            </Field>
            <Field label="Email (for contact)">
              <Input value={profile?.email ?? ""} disabled />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name">
                <Input
                  required
                  maxLength={60}
                  value={details.first_name}
                  onChange={e => setDetails({ ...details, first_name: e.target.value })}
                />
              </Field>
              <Field label="Surname">
                <Input
                  required
                  maxLength={60}
                  value={details.last_name}
                  onChange={e => setDetails({ ...details, last_name: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Phone number">
              <Input
                type="tel"
                maxLength={30}
                value={details.phone}
                onChange={e => setDetails({ ...details, phone: e.target.value })}
              />
            </Field>
            <Button type="submit" loading={savingDetails}>
              Save details
            </Button>
          </form>
        </Card>

        <Card className="p-5">
          <h2 className="mb-1 font-semibold text-white">Sign-in</h2>
          <p className="mb-4 text-sm text-amber-100/50">
            You currently sign in with{" "}
            {profile?.login_method === "code" ? `a ${profile.code_length ?? ""}-digit access code` : "a password"}. You can
            switch at any time.
          </p>
          <CredentialForm
            initialMethod={profile?.login_method ?? "password"}
            initialLength={profile?.code_length ?? 6}
            submitLabel="Update sign-in"
          />
        </Card>
      </div>
    </>
  );
}
