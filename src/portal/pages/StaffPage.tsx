import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Ban, Copy, KeyRound, Pencil, RotateCcw, Trash2, UserPlus, Wand2 } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { errorMessage, supabase } from "@/lib/supabase";
import { qk } from "@/lib/queries";
import { checkSecret, generateCode } from "@/lib/authApi";
import { createStaff, deleteStaff, generatePassword, joinName, splitName, suggestUsername, updateStaff } from "@/lib/staffApi";
import { ROLE_LABEL, type AppRole, type LoginMethod, type Profile, type TeamMember } from "@/lib/types";
import { portalPath } from "@/lib/env";
import { cn } from "@/lib/utils";
import {
  Badge,
  Button,
  Checkbox,
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

type Cred = { method: LoginMethod; length: 4 | 6 | 8; secret: string; mustChange: boolean };

const newCred = (method: LoginMethod = "password", length: 4 | 6 | 8 = 6): Cred => ({
  method,
  length,
  secret: method === "code" ? generateCode(length) : generatePassword(),
  mustChange: true,
});

type DetailsForm = {
  id?: string;
  username: string;
  usernameTouched: boolean;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  job_title: string;
  role: AppRole;
  cred: Cred;
};

type Shown = { name: string; username: string; method: LoginMethod; secret: string; mustChange: boolean; isNew: boolean };

/** Password / access-code picker. Defined at module level so inputs keep focus while typing. */
function CredentialFields({ value, onChange }: { value: Cred; onChange: (c: Cred) => void }) {
  return (
    <div className="space-y-3 sm:col-span-2">
      <div className="text-xs font-medium uppercase tracking-wide text-amber-100/60">Sign-in method</div>
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-[#1a1410] p-1">
        {(["password", "code"] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => onChange(newCred(m, value.length))}
            className={cn(
              "rounded-md py-2 text-sm font-medium transition-colors",
              value.method === m ? "bg-amber-600 text-white" : "text-amber-100/60 hover:text-amber-200"
            )}
          >
            {m === "password" ? "Password" : "Access code"}
          </button>
        ))}
      </div>
      {value.method === "code" && (
        <Field label="Code length">
          <Select
            value={value.length}
            onChange={e => onChange(newCred("code", Number(e.target.value) as 4 | 6 | 8))}
          >
            <option value={4}>4 digits</option>
            <option value={6}>6 digits</option>
            <option value={8}>8 digits</option>
          </Select>
        </Field>
      )}
      <Field
        label={value.method === "code" ? `${value.length}-digit access code` : "Password"}
        hint={value.method === "code" ? "Numbers only." : "At least 8 characters."}
      >
        <div className="flex gap-2">
          <Input
            required
            inputMode={value.method === "code" ? "numeric" : undefined}
            maxLength={value.method === "code" ? value.length : 72}
            className={value.method === "code" ? "font-mono tracking-[0.3em]" : undefined}
            value={value.secret}
            onChange={e =>
              onChange({
                ...value,
                secret:
                  value.method === "code"
                    ? e.target.value.replace(/\D/g, "").slice(0, value.length)
                    : e.target.value,
              })
            }
          />
          <Button
            type="button"
            variant="secondary"
            title="Generate"
            onClick={() => onChange({ ...newCred(value.method, value.length), mustChange: value.mustChange })}
          >
            <Wand2 className="h-4 w-4" />
          </Button>
        </div>
      </Field>
      <Checkbox
        label="Ask them to choose their own at next sign-in"
        checked={value.mustChange}
        onChange={v => onChange({ ...value, mustChange: v })}
      />
    </div>
  );
}

function statusOf(m: TeamMember): { label: string; tone: "green" | "red" | "neutral" | "amber" } {
  if (m.locked_at) return { label: "Restricted — 5 failed attempts", tone: "red" };
  if (!m.is_active) return { label: "Suspended", tone: "neutral" };
  if (m.locked_until && new Date(m.locked_until).getTime() > Date.now()) return { label: "Locked 15 min", tone: "red" };
  if (m.must_change_credentials) return { label: "Awaiting first sign-in", tone: "amber" };
  return { label: "Active", tone: "green" };
}

export function StaffPage() {
  const { profile: me, role: myRole, can } = useAuth();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [form, setForm] = useState<DetailsForm | null>(null);
  const [credFor, setCredFor] = useState<{ member: TeamMember; cred: Cred } | null>(null);
  const [shown, setShown] = useState<Shown | null>(null);
  const [showInactive, setShowInactive] = useState(true);

  const team = useQuery({
    queryKey: qk.team,
    queryFn: async () => {
      const [p, r] = await Promise.all([
        supabase.from("profiles").select("*").order("full_name"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (p.error) throw p.error;
      if (r.error) throw r.error;
      const roles = new Map((r.data ?? []).map(x => [x.user_id as string, x.role as AppRole]));
      return (p.data as Profile[]).map<TeamMember>(x => ({ ...x, role: roles.get(x.id) ?? null }));
    },
  });

  const refresh = () =>
    Promise.all([qc.invalidateQueries({ queryKey: qk.team }), qc.invalidateQueries({ queryKey: qk.directory })]);

  /** Admins manage staff (or role-less) accounts; Database Administrators manage everyone. Nobody manages themselves here. */
  const canManage = (m: TeamMember) => m.id !== me?.id && (myRole === "dba" || m.role === "staff" || m.role === null);

  const save = useMutation({
    mutationFn: async (f: DetailsForm) => {
      if (f.id) {
        await updateStaff({
          user_id: f.id,
          username: f.username.trim().toLowerCase(),
          full_name: joinName(f.first_name, f.last_name),
          phone: f.phone || null,
          job_title: f.job_title || null,
          ...(can.manageRoles ? { role: f.role } : {}),
        });
      } else {
        const problem = checkSecret(f.cred.method, f.cred.secret, f.cred.method === "code" ? f.cred.length : undefined);
        if (problem) throw new Error(problem);
        await createStaff({
          username: f.username.trim().toLowerCase(),
          email: f.email,
          full_name: joinName(f.first_name, f.last_name),
          phone: f.phone || undefined,
          job_title: f.job_title || undefined,
          role: can.manageRoles ? f.role : "staff",
          credentials: { method: f.cred.method, secret: f.cred.secret, must_change: f.cred.mustChange },
        });
      }
    },
    onSuccess: (_r, f) => {
      toast.success(f.id ? "Account updated" : "Account created");
      if (!f.id) {
        setShown({
          name: joinName(f.first_name, f.last_name),
          username: f.username.trim().toLowerCase(),
          method: f.cred.method,
          secret: f.cred.secret,
          mustChange: f.cred.mustChange,
          isNew: true,
        });
      }
      setForm(null);
      void refresh();
    },
    onError: e => toast.error(errorMessage(e)),
  });

  const setCredentials = useMutation({
    mutationFn: async (v: { member: TeamMember; cred: Cred }) => {
      const problem = checkSecret(v.cred.method, v.cred.secret, v.cred.method === "code" ? v.cred.length : undefined);
      if (problem) throw new Error(problem);
      await updateStaff({
        user_id: v.member.id,
        credentials: { method: v.cred.method, secret: v.cred.secret, must_change: v.cred.mustChange },
      });
    },
    onSuccess: (_r, v) => {
      setCredFor(null);
      setShown({
        name: v.member.full_name,
        username: v.member.username ?? "",
        method: v.cred.method,
        secret: v.cred.secret,
        mustChange: v.cred.mustChange,
        isNew: false,
      });
      void refresh();
    },
    onError: e => toast.error(errorMessage(e)),
  });

  const setActive = useMutation({
    mutationFn: (v: { m: TeamMember; active: boolean }) => updateStaff({ user_id: v.m.id, is_active: v.active }),
    onSuccess: (_r, v) => {
      toast.success(v.active ? `${v.m.full_name} reactivated` : `${v.m.full_name} suspended`);
      void refresh();
    },
    onError: e => toast.error(errorMessage(e)),
  });

  const removeStaff = useMutation({
    mutationFn: (m: TeamMember) => deleteStaff(m.id),
    onSuccess: (_r, m) => {
      toast.success(`${m.full_name} deleted`);
      void refresh();
      void qc.invalidateQueries({ queryKey: ["shifts"] });
    },
    onError: e => toast.error(errorMessage(e)),
  });

  const onDelete = async (m: TeamMember) => {
    const ok = await confirm({
      title: "Delete this account?",
      message: `${m.full_name} will be permanently deleted, along with their shifts. This can't be undone. To keep their history, suspend them instead.`,
      confirmLabel: "Delete permanently",
      danger: true,
    });
    if (ok) removeStaff.mutate(m);
  };

  const onToggleActive = async (m: TeamMember) => {
    const active = !m.is_active;
    const ok = await confirm({
      title: active ? (m.locked_at ? "Reset and reactivate?" : "Reactivate account?") : "Suspend account?",
      message: active
        ? m.locked_at
          ? `This clears the failed-attempts restriction on ${m.full_name} so they can sign in again. Consider setting a new password or code too.`
          : `${m.full_name} will be able to sign in again.`
        : `${m.full_name} will be signed out and blocked from signing in. Their shift history is kept. You can reactivate them later.`,
      confirmLabel: active ? "Reactivate" : "Suspend",
      danger: !active,
    });
    if (ok) setActive.mutate({ m, active });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (form) save.mutate(form);
  };

  const rows = (team.data ?? []).filter(m => showInactive || m.is_active);
  const inactiveCount = (team.data ?? []).filter(m => !m.is_active).length;
  const roleOptions: AppRole[] = can.manageRoles ? ["staff", "admin", "dba"] : ["staff"];

  const shownText = shown
    ? `Calabar Tastee staff portal\n${loginUrl()}\nUsername: ${shown.username}\n${shown.method === "code" ? "Access code" : "Password"}: ${shown.secret}`
    : "";

  return (
    <>
      <PageHeader
        title="Staff"
        description={
"Create accounts, set passwords or access codes, and suspend or reactivate staff."
        }
        actions={
          <Button
            onClick={() =>
              setForm({
                username: "",
                usernameTouched: false,
                email: "",
                first_name: "",
                last_name: "",
                phone: "",
                job_title: "",
                role: "staff",
                cred: newCred(),
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
          Show {inactiveCount} suspended / restricted
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
          {rows.map(m => {
            const st = statusOf(m);
            return (
              <tr key={m.id} className={m.is_active ? "text-amber-100/80" : "text-amber-100/40"}>
                <td className="px-4 py-3">
                  <div className="font-medium text-white">
                    {m.full_name || "—"}{" "}
                    {m.id === me?.id && <span className="text-xs text-amber-500">(you)</span>}
                  </div>
                  <div className="text-xs text-amber-100/50">
                    @{m.username ?? "—"} · {m.login_method === "code" ? `${m.code_length ?? ""}-digit code` : "password"}
                  </div>
                  <div className="text-xs text-amber-100/40">
                    {m.email}
                    {m.job_title && ` · ${m.job_title}`}
                    {m.phone && ` · ${m.phone}`}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {m.role ? (
                    <Badge tone={m.role === "staff" ? "neutral" : "amber"}>{ROLE_LABEL[m.role]}</Badge>
                  ) : (
                    <Badge tone="red">No access</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={st.tone}>{st.label}</Badge>
                </td>
                <td className="px-4 py-3">
                  {canManage(m) ? (
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Edit details"
                        onClick={() =>
                          setForm({
                            id: m.id,
                            username: m.username ?? "",
                            usernameTouched: true,
                            email: m.email,
                            first_name: splitName(m.full_name).first,
                            last_name: splitName(m.full_name).last,
                            phone: m.phone ?? "",
                            job_title: m.job_title ?? "",
                            role: m.role ?? "staff",
                            cred: newCred(),
                          })
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Set password or access code"
                        onClick={() =>
                          setCredFor({
                            member: m,
                            cred: newCred(m.login_method, ([4, 6, 8].includes(m.code_length ?? 0) ? m.code_length : 6) as 4 | 6 | 8),
                          })
                        }
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        title={m.is_active ? "Suspend" : m.locked_at ? "Reset & reactivate" : "Reactivate"}
                        className={m.is_active ? "text-red-400" : "text-green-400"}
                        onClick={() => void onToggleActive(m)}
                      >
                        {m.is_active ? <Ban className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Delete permanently"
                        className="text-red-400"
                        onClick={() => void onDelete(m)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="text-right text-xs text-amber-100/30">
                      {m.id === me?.id ? "You" : ""}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </Table>
      )}

      {/* Create / edit details */}
      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? "Edit team member" : "Add team member"}
        wide
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
          <form id="staff-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <Field label="First name">
              <Input
                required
                maxLength={60}
                value={form.first_name}
                onChange={e =>
                  setForm({
                    ...form,
                    first_name: e.target.value,
                    username: form.usernameTouched ? form.username : suggestUsername(joinName(e.target.value, form.last_name)),
                  })
                }
              />
            </Field>
            <Field label="Surname">
              <Input
                required
                maxLength={60}
                value={form.last_name}
                onChange={e =>
                  setForm({
                    ...form,
                    last_name: e.target.value,
                    username: form.usernameTouched ? form.username : suggestUsername(joinName(form.first_name, e.target.value)),
                  })
                }
              />
            </Field>
            <Field label="Username (used to sign in)" hint="Letters, numbers, dots, dashes. 3–30 characters.">
              <Input
                required
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                minLength={3}
                maxLength={30}
                value={form.username}
                onChange={e =>
                  setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, ""), usernameTouched: true })
                }
              />
            </Field>
            <Field label="Email (for contact)" >
              <Input
                type="email"
                required
                disabled={!!form.id}
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Job title" hint="e.g. Chef, Front of house">
              <Input maxLength={60} value={form.job_title} onChange={e => setForm({ ...form, job_title: e.target.value })} />
            </Field>
            <Field label="Phone number" hint="Optional">
              <Input type="tel" maxLength={30} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field
              label="Role"
              className="sm:col-span-2"
            >
              <Select
                value={form.role}
                disabled={!can.manageRoles}
                onChange={e => setForm({ ...form, role: e.target.value as AppRole })}
              >
                {roleOptions.map(r => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </Select>
            </Field>
            {!form.id && <CredentialFields value={form.cred} onChange={cred => setForm({ ...form, cred })} />}
          </form>
        )}
      </Modal>

      {/* Set password / access code for someone else */}
      <Modal
        open={!!credFor}
        onClose={() => setCredFor(null)}
        title={credFor ? `Sign-in for ${credFor.member.full_name}` : ""}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCredFor(null)}>
              Cancel
            </Button>
            <Button type="submit" form="cred-form" loading={setCredentials.isPending}>
              Save sign-in
            </Button>
          </>
        }
      >
        {credFor && (
          <form
            id="cred-form"
            onSubmit={e => {
              e.preventDefault();
              setCredentials.mutate(credFor);
            }}
            className="grid gap-4"
          >
            <p className="text-sm text-amber-100/60">
              Their current password or code stops working straight away. Username: <b>@{credFor.member.username}</b>
            </p>
            <CredentialFields value={credFor.cred} onChange={cred => setCredFor({ ...credFor, cred })} />
          </form>
        )}
      </Modal>

      {/* Show the details once */}
      <Modal
        open={!!shown}
        onClose={() => setShown(null)}
        title={shown?.isNew ? "Account created" : "Sign-in updated"}
        footer={<Button onClick={() => setShown(null)}>Done</Button>}
      >
        {shown && (
          <div className="space-y-4 text-sm">
            <p className="text-amber-100/70">
              Share these with {shown.name} privately. They won't be shown again.
              {shown.mustChange && " They'll be asked to choose their own at first sign-in."}
            </p>
            <div className="space-y-2 rounded-lg border border-amber-900/40 bg-[#1a1410] p-4 font-mono text-amber-100">
              <div>Sign in: {loginUrl()}</div>
              <div>Username: {shown.username}</div>
              <div>
                {shown.method === "code" ? "Access code" : "Password"}: {shown.secret}
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={() => void navigator.clipboard.writeText(shownText).then(() => toast.success("Copied"))}
            >
              <Copy className="h-4 w-4" /> Copy details
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
}
