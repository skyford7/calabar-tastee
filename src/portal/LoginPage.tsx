import { useEffect, useRef, useState, type FormEvent } from "react";
import { Navigate, useLocation } from "react-router";
import { ArrowLeft, ChefHat, KeyRound, Lock, ShieldAlert, User } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { LoginError, lookupUsername, type LookupResult } from "@/lib/authApi";
import { SITE_ORIGIN, isConfigured, portalPath } from "@/lib/env";
import { Button, Field, Input } from "./ui";
import { OtpBoxes } from "./OtpBoxes";

type Step = { kind: "username" } | { kind: "secret"; username: string; lookup: LookupResult };

export function LoginPage() {
  const { session, role, loading, signIn, signOut } = useAuth();
  const location = useLocation();
  const [step, setStep] = useState<Step>({ kind: "username" });
  const [username, setUsername] = useState("");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<{ message: string; restricted: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const secretRef = useRef<HTMLInputElement>(null);

  const from = (location.state as { from?: string } | null)?.from;

  // Old session without portal access: sign out quietly.
  useEffect(() => {
    if (!loading && session && !role) void signOut();
  }, [loading, session, role, signOut]);

  // Focus the password / code box once, when that step opens.
  useEffect(() => {
    if (step.kind === "secret") secretRef.current?.focus();
  }, [step.kind]);

  if (!loading && session && role) {
    return <Navigate to={from && from.startsWith(portalPath("/")) ? from : portalPath("/")} replace />;
  }

  const showError = (err: unknown) => {
    const e = err as LoginError;
    setError({
      message: e.message || "Something went wrong.",
      restricted: e.code === "restricted" || e.code === "suspended" || e.code === "locked",
    });
  };

  const onUsername = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const lookup = await lookupUsername(username);
      setSecret("");
      setStep({ kind: "secret", username: username.trim().toLowerCase(), lookup });
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  };

  const onSecret = async (e: FormEvent) => {
    e.preventDefault();
    if (step.kind !== "secret") return;
    setError(null);
    setBusy(true);
    try {
      await signIn(step.username, secret);
    } catch (err) {
      showError(err);
      setSecret("");
    } finally {
      setBusy(false);
    }
  };

  const isCode = step.kind === "secret" && step.lookup.method === "code";
  const codeLength = step.kind === "secret" ? (step.lookup.code_length ?? 8) : 8;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1a1410] px-4">
      <div className="w-full max-w-sm animate-[fadeInUp_0.4s_ease-out]">
        <div className="mb-8 text-center">
          <ChefHat className="mx-auto mb-3 h-12 w-12 text-amber-500" />
          <h1 className="text-2xl font-bold text-white">Staff portal</h1>
          <p className="mt-1 text-sm text-amber-100/50">Calabar Tastee team sign-in</p>
        </div>

        <div className="rounded-2xl border border-amber-900/30 bg-[#231a14] p-6">
          {!isConfigured && (
            <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              Supabase environment variables are missing.
            </div>
          )}
          {error && (
            <div
              role="alert"
              className={
                error.restricted
                  ? "mb-4 flex gap-2 rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-3 text-sm text-red-200"
                  : "mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
              }
            >
              {error.restricted && <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />}
              <span>{error.message}</span>
            </div>
          )}

          {step.kind === "username" ? (
            <form onSubmit={onUsername} className="space-y-4">
              <Field label="Username">
                <Input
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                  autoFocus
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                />
              </Field>
              <Button type="submit" className="w-full" loading={busy}>
                <User className="h-4 w-4" /> Continue
              </Button>
            </form>
          ) : (
            <form onSubmit={onSecret} className="space-y-4">
              <button
                type="button"
                onClick={() => {
                  setStep({ kind: "username" });
                  setError(null);
                  setSecret("");
                }}
                className="flex items-center gap-1.5 text-sm text-amber-100/60 hover:text-amber-300"
              >
                <ArrowLeft className="h-4 w-4" /> {step.username}
              </button>
              {isCode ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="font-semibold text-white">Enter your access code</div>
                    <p className="mt-1 text-xs text-amber-100/50">Your {codeLength}-digit code for @{step.username}</p>
                  </div>
                  <OtpBoxes
                    length={codeLength}
                    value={secret}
                    onChange={setSecret}
                    autoFocus
                    invalid={!!error}
                    disabled={busy}
                    label={`${codeLength}-digit access code`}
                  />
                </div>
              ) : (
                <Field label="Password">
                  <Input
                    ref={secretRef}
                    type="password"
                    autoComplete="current-password"
                    required
                    value={secret}
                    onChange={e => setSecret(e.target.value)}
                  />
                </Field>
              )}
              <Button
                type="submit"
                className="w-full"
                loading={busy || (loading && !!session)}
                disabled={isCode && secret.length !== codeLength}
              >
                {isCode ? <KeyRound className="h-4 w-4" /> : <Lock className="h-4 w-4" />} Sign in
              </Button>
              <p className="text-center text-xs text-amber-100/40">
                Forgotten it? Ask your manager to reset it.
              </p>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm">
          <a href={SITE_ORIGIN} className="text-amber-100/50 hover:text-amber-300">
            ← Back to calabartastee.com
          </a>
        </p>
      </div>
    </div>
  );
}
