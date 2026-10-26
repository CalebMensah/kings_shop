"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { HiOutlineMail, HiOutlineLockClosed } from "react-icons/hi";
import Link from "next/link";

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/admin/dashboard";
  const authError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (signInError) {
      setError("Incorrect email or password.");
      return;
    }

    window.location.href = redirectTo;
    
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-900 px-4">
      <div className="w-full max-w-sm bg-white rounded-lg p-6 md:p-8">
        <h1 className="text-xl font-display font-semibold text-navy-900 mb-1">
          Kings Shop and Imports Admin
        </h1>
        <p className="text-sm text-navy-500 mb-6">Sign in to manage your store</p>

        {authError === "not_authorized" && (
          <p className="text-sm text-red-600 bg-red-50 rounded p-3 mb-4">
            That account isn&apos;t authorized for admin access.
          </p>
        )}
        {error && <p className="text-sm text-red-600 bg-red-50 rounded p-3 mb-4">{error}</p>}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm text-navy-700 mb-1">Email</label>
            <div className="relative">
              <HiOutlineMail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-300" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-navy-100 rounded pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-turquoise"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-navy-700 mb-1">Password</label>
            <div className="relative">
              <HiOutlineLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-300" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-navy-100 rounded pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-turquoise"
              />
            </div>
          </div>
                    <div className="text-right">
            <Link href="/admin/forgot-password" className="text-xs text-ocean hover:underline">
              Forgot password?
            </Link>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-navy-800 text-white rounded py-2 text-sm font-medium hover:bg-navy-700 transition disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
