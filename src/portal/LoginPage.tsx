import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useLocation } from "react-router";
import { ChefHat, Lock } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { isAdminHost, isConfigured, portalPath } from "@/lib/env";
import { Button, Field, Input } from "./ui";

export function LoginPage() {
  const { session, role, loading, signIn, signOut } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const from = (location.state as { from?: string } | null)?.from;

  // Already signed in (e.g. from an old session) but no portal access: sign out quietly.
  // Fresh sign-ins are checked inside signIn(), which shows its own error.
  useEffect(() => {
    if (!loading && session && !role) void signOut();
  }, [loading, session, role, signOut]);

  if (!loading && session && role) {
    return (
      <Navigate
        to={from && from.startsWith(portalPath("/")) ? from : portalPath("/")}
        replace
      />
    );
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1a1410] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <ChefHat className="mx-auto mb-3 h-12 w-12 text-amber-500" />
          <h1 className="text-2xl font-bold text-white">Staff portal</h1>
          <p className="mt-1 text-sm text-amber-100/50">
            Calabar Tastee team sign-in
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl border border-amber-900/30 bg-[#231a14] p-6"
        >
          {!isConfigured && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              Supabase environment variables are missing. See README →
              Environment variables.
            </div>
          )}
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
            >
              {error}
            </div>
          )}
          <Field label="Email">
            <Input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </Field>
          <Button
            type="submit"
            className="w-full"
            loading={busy || (loading && !!session)}
          >
            <Lock className="h-4 w-4" /> Sign in
          </Button>
          <p className="text-center text-xs text-amber-100/40">
            Forgotten your password? Ask an admin to reset it.
          </p>
        </form>

        {!isAdminHost && (
          <p className="mt-6 text-center text-sm">
            <a href="/" className="text-amber-100/50 hover:text-amber-300">
              ← Back to calabartastee.com
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
