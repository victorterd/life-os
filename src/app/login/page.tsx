"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Logo } from "@/components/shell/AppShell";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError(error.message === "Invalid login credentials" ? "Email sau parolă greșită." : error.message);
      return;
    }
    router.replace("/");
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <form onSubmit={submit} className="flex w-full max-w-[380px] flex-col gap-6">
        <div className="flex flex-col items-start gap-5">
          <Logo size={48} />
          <h1 className="text-[40px] font-semibold leading-none tracking-[-0.03em]">Bine ai revenit.</h1>
        </div>

        <div className="flex flex-col gap-3">
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            aria-label="Email"
            className="h-13 rounded-2xl border border-line bg-surface px-4 text-[16px] outline-none focus:border-navy"
          />
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Parolă"
            aria-label="Parolă"
            className="h-13 rounded-2xl border border-line bg-surface px-4 text-[16px] outline-none focus:border-navy"
          />
          {error && <p className="px-1 text-[14px] text-danger">{error}</p>}
        </div>

        <button
          type="submit"
          disabled={busy}
          className="h-13 rounded-2xl bg-navy text-[16px] font-medium text-white shadow-[var(--shadow-lift)] transition active:scale-[0.98] disabled:opacity-60"
        >
          {busy ? "Se conectează…" : "Intră în cont"}
        </button>
      </form>
    </div>
  );
}
