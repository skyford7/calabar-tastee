import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, KeyRound, Pencil, Power, UserPlus, Wand2 } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { errorMessage, supabase } from "@/lib/supabase";
import { qk } from "@/lib/queries";
import { createStaff, generatePassword, updateStaff } from "@/lib/staffApi";
import {
  ROLE_LABEL,
  type AppRole,
  type Profile,
  type TeamMember,
} from "@/lib/types";
import { portalPath } from "@/lib/env";
import {
  Badge,
  Button,
  ErrorBlock,
  Field,
  Input,
  LoadingBlock,
  Modal,
  PageHeader,
  Select,
  Table,
  useConfirm,
} from "../ui";

const loginUrl = () => `${window.location.origin}${portalPath("/login")}`;

type Form = {
  id?: string;
  email: string;
  full_name: string;
  phone: string;
  job_title: string;
  role: AppRole;
  password: string;
};

export function StaffPage() {
  const { profile: me, role: myRole, can } = useAuth();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [form, setForm] = useState<Form | null>(null);
  const [credentials, setCredentials] = useState<{
    email: string;
    password: string;
    isNew: boolean;
  } | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const team = useQuery({
    queryKey: qk.team,
    queryFn: async () => {
      const [p, r] = await Promise.all([
        supabase.from("profiles").select("*").order("full_name"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (p.error) throw p.error;
      if (r.error) throw r.error;
      const roles = new Map(
        (r.data ?? []).map(x => [x.user_id as string, x.role as AppRole])
      );
      return (p.data as Profile[]).map<TeamMember>(x => ({
        ...x,
        role: roles.get(x.id) ?? null,
      }));
    },
  });

  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: qk.team }),
      qc.invalidateQueries({ queryKey: qk.directory }),
    ]);

  /** Admins may only manage staff (or role-less) accounts; DBAs manage everyone. Nobody manages themselves here. */
  const canManage = (m: TeamMember) =>
    m.id !== me?.id &&
    (myRole === "dba" || m.role === "staff" || m.role === null);

  const save = useMutation({
    mutationFn: async (f: Form) => {
      if (f.id) {
        await updateStaff({
          user_id: f.id,
          full_name: f.full_name,
          phone: f.phone || null,
          job_title: f.job_title || null,
          ...(can.manageRoles ? { role: f.role } : {}),
        });
      } else {
        await createStaff({
          email: f.email,
          password: f.password,
          full_name: f.full_name,
          phone: f.phone || undefined,
          job_title: f.job_title || undefined,
          role: can.manageRoles ? f.role : "staff",
        });
      }
    },
    onSuccess: (_r, f) => {
      toast.success(f.id ? "Account updated" : "Account created");
      if (!f.id)
        setCredentials({ email: f.email, password: f.password, isNew: true });
      setForm(null);
      void refresh();
    },
    onError: e => toast.error(errorMessage(e)),
  });

  const setActive = useMutation({
    mutationFn: (v: { m: TeamMember; active: boolean }) =>
      updateStaff({ user_id: v.m.id, is_active: v.active }),
    onSuccess: (_r, v) => {
      toast.success(
        v.active
          ? `${v.m.full_name} reactivated`
          : `${v.m.full_name} deactivated`
      );
      void refresh();
    },
    onError: e => toast.error(errorMessage(e)),
  });

  const resetPassword = useMutation({
    mutationFn: async (m: TeamMember) => {
      const password = generatePassword();
      await updateStaff({ user_id: m.id, password });
      return { email: m.email, password };
    },
    onSuccess: c => setCredentials({ ...c, isNew: false }),
    onError: e => toast.error(errorMessage(e)),
  });

  const onToggleActive = async (m: TeamMember) => {
    const active = !m.is_active;
    const ok = await confirm({
      title: active ? "Reactivate account?" : "Deactivate account?",
      message: active
        ? `${m.full_name} will be able to sign in again.`
        : `${m.full_name} will be signed out and blocked from the portal. Their shift history is kept. You can reactivate them later.`,
      confirmLabel: active ? "Reactivate" : "Deactivate",
      danger: !active,
    });
    if (ok) setActive.mutate({ m, active });
  };

  const onReset = async (m: TeamMember) => {
    if (
      await confirm({
        title: "Reset password?",
        message: `A new temporary password will be generated for ${m.full_name}. Their old password stops working.`,
        confirmLabel: "Reset",
      })
    ) {
      resetPassword.mutate(m);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (form) save.mutate(form);
  };

  const rows = (team.data ?? []).filter(m => showInactive || m.is_active);
  const inactiveCount = (team.data ?? []).filter(m => !m.is_active).length;
  const roleOptions: AppRole[] = can.manageRoles
    ? ["staff", "admin", "dba"]
    : ["staff"];

  return (
    <>
      <PageHeader
        title="Staff"
        description={
          can.manageRoles
            ? "Create logins and manage roles. Only Database Admins can grant Admin or DBA access."
            : "Create and manage staff logins. Contact the Database Admin to change admin access."
        }
        actions={
          <Button
            onClick={() =>
              setForm({
                email: "",
                full_name: "",
                phone: "",
                job_title: "",
                role: "staff",
                password: generatePassword(),
              })
            }
          >
            <UserPlus className="h-4 w-4" /> Add team member
          </Button>
        }
      />

      {inactiveCount > 0 && (
        <label className="mb-3 inline-flex items-center gap-2 text-sm text-amber-100/60">
          <input
            type="checkbox"
            className="accent-amber-500"
            checked={showInactive}
            onChange={e => setShowInactive(e.target.checked)}
          />
          Show {inactiveCount} deactivated
        </label>
      )}

      {team.error ? (
        <ErrorBlock error={team.error} />
      ) : team.isLoading ? (
        <LoadingBlock />
      ) : (
        <Table
          head={
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          }
        >
          {rows.map(m => (
            <tr
              key={m.id}
              className={
                m.is_active ? "text-amber-100/80" : "text-amber-100/40"
              }
            >
              <td className="px-4 py-3">
                <div className="font-medium text-white">
                  {m.full_name || "—"}{" "}
                  {m.id === me?.id && (
                    <span className="text-xs text-amber-500">(you)</span>
                  )}
                </div>
                <div className="text-xs text-amber-100/40">
                  {m.email}
                  {m.job_title && ` · ${m.job_title}`}
                  {m.phone && ` · ${m.phone}`}
                </div>
              </td>
              <td className="px-4 py-3">
                {m.role ? (
                  <Badge tone={m.role === "staff" ? "neutral" : "amber"}>
                    {ROLE_LABEL[m.role]}
                  </Badge>
                ) : (
                  <Badge tone="red">No access</Badge>
                )}
              </td>
              <td className="px-4 py-3">
                {m.is_active ? (
                  <Badge tone="green">Active</Badge>
                ) : (
                  <Badge>Deactivated</Badge>
                )}
              </td>
              <td className="px-4 py-3">
                {canManage(m) ? (
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Edit"
                      onClick={() =>
                        setForm({
                          id: m.id,
                          email: m.email,
                          full_name: m.full_name,
                          phone: m.phone ?? "",
                          job_title: m.job_title ?? "",
                          role: m.role ?? "staff",
                          password: "",
                        })
                      }
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Reset password"
                      onClick={() => void onReset(m)}
                      disabled={!m.is_active}
                    >
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      title={m.is_active ? "Deactivate" : "Reactivate"}
                      className={
                        m.is_active ? "text-red-400" : "text-green-400"
                      }
                      onClick={() => void onToggleActive(m)}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-right text-xs text-amber-100/30">
                    {m.id === me?.id ? "Edit in My account" : "DBA only"}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}

      {/* Create / edit */}
      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? "Edit team member" : "Add team member"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setForm(null)}>
              Cancel
            </Button>
            <Button type="submit" form="staff-form" loading={save.isPending}>
              {form?.id ? "Save" : "Create account"}
            </Button>
          </>
        }
      >
        {form && (
          <form
            id="staff-form"
            onSubmit={submit}
            className="grid gap-4 sm:grid-cols-2"
          >
            <Field label="Full name" className="sm:col-span-2">
              <Input
                required
                maxLength={120}
                value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })}
              />
            </Field>
            <Field label="Email (used to sign in)" className="sm:col-span-2">
              <Input
                type="email"
                required
                disabled={!!form.id}
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Job title" hint="e.g. Chef, Front of house">
              <Input
                maxLength={60}
                value={form.job_title}
                onChange={e => setForm({ ...form, job_title: e.target.value })}
              />
            </Field>
            <Field label="Phone">
              <Input
                type="tel"
                maxLength={30}
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field
              label="Role"
              className="sm:col-span-2"
              hint={
                can.manageRoles
                  ? undefined
                  : "Admins can create Staff accounts."
              }
            >
              <Select
                value={form.role}
                disabled={!can.manageRoles}
                onChange={e =>
                  setForm({ ...form, role: e.target.value as AppRole })
                }
              >
                {roleOptions.map(r => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </Select>
            </Field>
            {!form.id && (
              <Field
                label="Temporary password"
                className="sm:col-span-2"
                hint="At least 10 characters. Share it privately; they can change it under My account."
              >
                <div className="flex gap-2">
                  <Input
                    required
                    minLength={10}
                    value={form.password}
                    onChange={e =>
                      setForm({ ...form, password: e.target.value })
                    }
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    title="Generate"
                    onClick={() =>
                      setForm({ ...form, password: generatePassword() })
                    }
                  >
                    <Wand2 className="h-4 w-4" />
                  </Button>
                </div>
              </Field>
            )}
          </form>
        )}
      </Modal>

      {/* Show credentials once */}
      <Modal
        open={!!credentials}
        onClose={() => setCredentials(null)}
        title={credentials?.isNew ? "Account created" : "Password reset"}
        footer={<Button onClick={() => setCredentials(null)}>Done</Button>}
      >
        {credentials && (
          <div className="space-y-4 text-sm">
            <p className="text-amber-100/70">
              Share these sign-in details privately. The password won't be shown
              again.
            </p>
            <div className="space-y-2 rounded-lg border border-amber-900/40 bg-[#1a1410] p-4 font-mono text-amber-100">
              <div>Sign in: {loginUrl()}</div>
              <div>Email: {credentials.email}</div>
              <div>Password: {credentials.password}</div>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                void navigator.clipboard
                  .writeText(
                    `Calabar Tastee staff portal\n${loginUrl()}\nEmail: ${credentials.email}\nPassword: ${credentials.password}`
                  )
                  .then(() => toast.success("Copied"));
              }}
            >
              <Copy className="h-4 w-4" /> Copy details
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
}
