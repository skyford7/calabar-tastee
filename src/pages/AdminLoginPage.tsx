import { useState } from "react";
import { useLocalAuth } from "@/hooks/useLocalAuth";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login, loginError, loginLoading, isSuspended, isLocked } = useLocalAuth();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    login(username, password);
  }

  return (
    <div className="min-h-screen bg-[#1a1410] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gradient font-['Playfair_Display'] mb-2">Calabar Tastee</h1>
          <p className="text-amber-100/60">Staff & Admin Login</p>
        </div>
        <div className="bg-[#231a14] border border-amber-900/30 rounded-2xl p-8">
          <h2 className="text-xl font-bold text-white mb-6 text-center">Sign In</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-amber-100/60 mb-1">Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-[#1a1410] border border-amber-900/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500" required autoComplete="username" />
            </div>
            <div>
              <label className="block text-sm text-amber-100/60 mb-1">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-[#1a1410] border border-amber-900/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500" required autoComplete="current-password" />
            </div>
            {(loginError || isSuspended || isLocked) && (
              <div className={`p-3 rounded-lg text-sm ${isSuspended ? 'bg-red-600/20 border border-red-600/30 text-red-400' : isLocked ? 'bg-amber-600/20 border border-amber-600/30 text-amber-400' : 'bg-red-600/20 border border-red-600/30 text-red-400'}`}>
                {loginError}
              </div>
            )}
            <button type="submit" disabled={loginLoading} className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white py-3 rounded-lg font-semibold transition-colors">
              {loginLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>
          <div className="mt-6 text-center">
            <a href="/" className="text-amber-500 hover:text-amber-400 text-sm transition-colors">← Back to Website</a>
          </div>
        </div>
      </div>
    </div>
  );
}
