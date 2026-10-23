import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthProvider";
import { errorMessage, supabase } from "@/lib/supabase";
import { ROLE_LABEL } from "@/lib/types";
import { Badge, Button, Card, Field, Input, PageHeader } from "../ui";

export function AccountPage() {
  const { profile, role, refresh } = useAuth();
  const [details, setDetails] = useState(() => ({
    full_name: profile?.full_name ?? "",
    phone: profile?.phone ?? "",
  }));
  const [savingDetails, setSavingDetails] = useState(false);
  const [pw, setPw] = useState({ next: "", confirm: "" });
  const [savingPw, setSavingPw] = useState(false);

  const saveDetails = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSavingDetails(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: details.full_name.trim(),
        phone: details.phone.trim() || null,
      })
      .eq("id", profile.id);
    setSavingDetails(false);
    if (error) return toast.error(errorMessage(error));
    toast.success("Details saved");
    void refresh();
  };

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (pw.next.length < 10) return toast.error("Use at least 10 characters.");
    if (pw.next !== pw.confirm) return toast.error("Passwords don't match.");
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: pw.next });
    setSavingPw(false);
    if (error) return toast.error(errorMessage(error));
    setPw({ next: "", confirm: "" });
    toast.success("Password changed");
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
            <Field label="Email" hint="Ask an admin if this needs to change.">
              <Input value={profile?.email ?? ""} disabled />
            </Field>
            <Field label="Full name">
              <Input
                required
                maxLength={120}
                value={details.full_name}
                onChange={e =>
                  setDetails({ ...details, full_name: e.target.value })
                }
              />
            </Field>
            <Field label="Phone">
              <Input
                type="tel"
                maxLength={30}
                value={details.phone}
                onChange={e =>
                  setDetails({ ...details, phone: e.target.value })
                }
              />
            </Field>
            <Button type="submit" loading={savingDetails}>
              Save details
            </Button>
          </form>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-semibold text-white">Change password</h2>
          <form onSubmit={savePassword} className="space-y-4">
            <Field label="New password" hint="At least 10 characters.">
              <Input
                type="password"
                autoComplete="new-password"
                required
                minLength={10}
                value={pw.next}
                onChange={e => setPw({ ...pw, next: e.target.value })}
              />
            </Field>
            <Field label="Confirm new password">
              <Input
                type="password"
                autoComplete="new-password"
                required
                value={pw.confirm}
                onChange={e => setPw({ ...pw, confirm: e.target.value })}
              />
            </Field>
            <Button type="submit" loading={savingPw}>
              Change password
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}
