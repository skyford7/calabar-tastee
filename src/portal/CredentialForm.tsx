import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ChefHat, KeyRound, Lock } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { changeOwnCredentials, checkSecret } from "@/lib/authApi";
import type { LoginMethod } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button, Field, Input, Select } from "./ui";

/** Choose password or access code, then set it. Used in My account and after a reset. */
export function CredentialForm({
  initialMethod = "password",
  initialLength = 6,
  submitLabel = "Save",
  onDone,
}: {
  initialMethod?: LoginMethod;
  initialLength?: number;
  submitLabel?: string;
  onDone?: () => void;
}) {
  const { refresh } = useAuth();
  const [method, setMethod] = useState<LoginMethod>(initialMethod);
  const [length, setLength] = useState<number>([4, 6, 8].includes(initialLength) ? initialLength : 6);
  const [value, setValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const problem = checkSecret(method, value, method === "code" ? length : undefined);
    if (problem) return toast.error(problem);
    if (value !== confirm) return toast.error(method === "code" ? "Codes don't match." : "Passwords don't match.");
    setBusy(true);
    try {
      await changeOwnCredentials(method, value);
      setValue("");
      setConfirm("");
      toast.success(method === "code" ? "Access code saved" : "Password saved");
      await refresh();
      onDone?.();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const digitsOnly = (s: string) => s.replace(/\D/g, "").slice(0, length);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-[#1a1410] p-1">
        {(["password", "code"] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMethod(m);
              setValue("");
              setConfirm("");
            }}
            className={cn(
              "flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors",
              method === m ? "bg-amber-600 text-white" : "text-amber-100/60 hover:text-amber-200"
            )}
          >
            {m === "password" ? <Lock className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
            {m === "password" ? "Password" : "Access code"}
          </button>
        ))}
      </div>

      {method === "code" ? (
        <>
          <Field label="Code length">
            <Select
              value={length}
              onChange={e => {
                setLength(Number(e.target.value));
                setValue("");
                setConfirm("");
              }}
            >
              <option value={4}>4 digits</option>
              <option value={6}>6 digits</option>
              <option value={8}>8 digits</option>
            </Select>
          </Field>
          <Field label={`New ${length}-digit code`}>
            <Input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="new-password"
              maxLength={length}
              className="text-center font-mono text-lg tracking-[0.4em]"
              value={value}
              onChange={e => setValue(digitsOnly(e.target.value))}
            />
          </Field>
          <Field label="Confirm code">
            <Input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="new-password"
              maxLength={length}
              className="text-center font-mono text-lg tracking-[0.4em]"
              value={confirm}
              onChange={e => setConfirm(digitsOnly(e.target.value))}
            />
          </Field>
        </>
      ) : (
        <>
          <Field label="New password" hint="At least 8 characters.">
            <Input
              type="password"
              autoComplete="new-password"
              value={value}
              onChange={e => setValue(e.target.value)}
            />
          </Field>
          <Field label="Confirm password">
            <Input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
            />
          </Field>
        </>
      )}

      <Button type="submit" className="w-full" loading={busy}>
        {submitLabel}
      </Button>
    </form>
  );
}

/** Full-screen step shown when a manager has reset someone's sign-in details. */
export function ForceChangeScreen() {
  const { profile, signOut } = useAuth();
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1a1410] px-4 py-10">
      <div className="w-full max-w-sm animate-[fadeInUp_0.4s_ease-out]">
        <div className="mb-6 text-center">
          <ChefHat className="mx-auto mb-3 h-12 w-12 text-amber-500" />
          <h1 className="text-2xl font-bold text-white">Set your own sign-in</h1>
          <p className="mt-2 text-sm text-amber-100/60">
            Your sign-in details were set by a manager. Choose your own password or access code to continue.
          </p>
        </div>
        <div className="rounded-2xl border border-amber-900/30 bg-[#231a14] p-6">
          <CredentialForm
            initialMethod={profile?.login_method ?? "password"}
            initialLength={profile?.code_length ?? 6}
            submitLabel="Save and continue"
          />
        </div>
        <button
          onClick={() => void signOut()}
          className="mx-auto mt-6 block text-sm text-amber-100/50 hover:text-amber-300"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
