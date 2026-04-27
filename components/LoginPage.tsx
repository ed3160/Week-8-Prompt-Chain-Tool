"use client";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const handleLogin = async () => {
    const supabase = createClient();
    const path = window.location.pathname + window.location.search;
    const next = path && path !== "/" ? `?next=${encodeURIComponent(path)}` : "";
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback${next}`,
      },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-lg p-8 max-w-sm w-full text-center border border-neutral-200 dark:border-neutral-800">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
          Flavor Studio
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 mb-6">
          Humor flavor prompt chain tool
        </p>
        <button
          onClick={handleLogin}
          className="w-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg px-4 py-2.5 font-medium hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors cursor-pointer"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
