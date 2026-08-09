import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Lock, Mail } from "lucide-react";

export function AdminLoginPage() {
  const [email, setEmail] = useState("admin@calabartastee.com");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState("");
  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      if (data.success && data.token) {
        localStorage.setItem("admin_token", data.token);
        window.location.href = "/admin";
      }
    },
    onError: (err) => {
      setError(err.message || "Login failed");
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen bg-[#1a1410] flex items-center justify-center px-4">
      <div className="bg-[#231a14] border border-amber-900/30 rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Calabar Tastee</h1>
          <p className="text-amber-100/60 text-sm">Admin Dashboard Login</p>
        </div>

        {error && (
          <div className="bg-red-600/20 border border-red-600/30 text-red-400 px-4 py-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm text-amber-100/60 mb-1 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-100/40" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#1a1410] border border-amber-900/30 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-amber-100/60 mb-1 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-100/40" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#1a1410] border border-amber-900/30 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white py-3 rounded-lg font-semibold transition-colors"
          >
            {loginMutation.isPending ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="/" className="text-amber-100/40 hover:text-amber-400 text-sm transition-colors">
            &larr; Back to website
          </a>
        </div>
      </div>
    </div>
  );
}
