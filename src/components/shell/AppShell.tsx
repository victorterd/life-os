"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Plus } from "lucide-react";
import { useStore } from "@/lib/data/store";
import { useTaskSheet } from "@/components/tasks/TaskSheet";
import { NAV } from "./nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, authReady, loading, error, signOut } = useStore();
  const sheet = useTaskSheet();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const isLogin = pathname === "/login";

  useEffect(() => {
    if (!authReady) return;
    if (!session && !isLogin) router.replace("/login");
    if (session && isLogin) router.replace("/");
  }, [authReady, session, isLogin, router]);

  if (isLogin) return <>{children}</>;
  if (!authReady || !session || loading) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="animate-pulse">
          <Logo size={44} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh lg:pl-[248px]">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col px-4 py-6 lg:flex">
        <Link href="/" className="mb-8 flex items-center gap-2.5 px-3">
          <Logo />
          <span className="text-[19px] font-semibold tracking-tight">LifeOS</span>
        </Link>

        <nav className="flex flex-col gap-0.5">
          {NAV.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-colors ${
                  active ? "bg-surface font-medium text-ink shadow-[var(--shadow-card)]" : "text-ink-2 hover:bg-white/60"
                }`}
              >
                <span
                  className="grid size-7 place-items-center rounded-lg transition-colors"
                  style={{
                    background: active ? item.color : "transparent",
                    color: active ? "white" : item.color,
                  }}
                >
                  <Icon size={16} strokeWidth={2.2} />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button onClick={() => sheet.open()} className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-navy px-4 py-3 text-[15px] font-medium text-white shadow-[var(--shadow-lift)] transition active:scale-[0.98]">
          <Plus size={18} strokeWidth={2.4} />
          Adaugă task
        </button>

        <button onClick={signOut} className="mt-auto flex items-center gap-2 rounded-xl px-3 py-2 text-[14px] text-ink-3 hover:bg-white/60 hover:text-ink">
          <LogOut size={16} />
          Ieși din cont
        </button>
      </aside>

      <main className="mx-auto w-full max-w-[1240px] px-4 pb-32 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">
        {error && (
          <div role="alert" className="mb-4 rounded-2xl bg-danger-soft px-4 py-3 text-[14px] text-danger">
            Nu s-a putut salva: {error}
          </div>
        )}
        {children}
      </main>

      {/* Bară jos pe telefon */}
      <nav className="fixed inset-x-3 bottom-3 z-30 flex items-center justify-around rounded-[22px] border border-line bg-white/85 px-2 py-2 shadow-[var(--shadow-lift)] backdrop-blur-xl lg:hidden pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {[NAV[0], NAV[1]].map((item) => (
          <MobileItem key={item.href} item={item} active={isActive(item.href)} />
        ))}
        <button
          onClick={() => sheet.open()}
          aria-label="Adaugă task"
          className="grid size-12 place-items-center rounded-2xl bg-navy text-white shadow-[var(--shadow-lift)] active:scale-95"
        >
          <Plus size={22} strokeWidth={2.4} />
        </button>
        {[NAV[3], NAV[4]].map((item) => (
          <MobileItem key={item.href} item={item} active={isActive(item.href)} />
        ))}
      </nav>
    </div>
  );
}

function MobileItem({ item, active }: { item: (typeof NAV)[number]; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className="flex w-14 flex-col items-center gap-0.5 py-1 text-[11px] font-medium"
      style={{ color: active ? item.color : "var(--ink-3)" }}
    >
      <Icon size={22} strokeWidth={active ? 2.4 : 2} />
      {item.label}
    </Link>
  );
}

export function Logo({ size = 30 }: { size?: number }) {
  // Trei arce = trei inele ale zilei
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--navy)" />
      <circle cx="16" cy="16" r="9.5" fill="none" stroke="var(--work)" strokeWidth="2.6" strokeDasharray="44 60" strokeLinecap="round" transform="rotate(-90 16 16)" />
      <circle cx="16" cy="16" r="6" fill="none" stroke="var(--health)" strokeWidth="2.6" strokeDasharray="26 38" strokeLinecap="round" transform="rotate(-90 16 16)" />
      <circle cx="16" cy="16" r="2.4" fill="var(--personal)" />
    </svg>
  );
}
