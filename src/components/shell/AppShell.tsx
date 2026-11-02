"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CheckCircle2, Dumbbell, LogOut, MoreHorizontal, NotebookPen, Plus, Repeat, Smile, X } from "lucide-react";
import { useHabitSheet } from "@/components/habits/HabitSheet";
import { levelTitle } from "@/lib/data/achievements";
import { useStore } from "@/lib/data/store";
import { useTaskSheet } from "@/components/tasks/TaskSheet";
import { NAV } from "./nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, authReady, loading, error, signOut, xp } = useStore();
  const sheet = useTaskSheet();
  const habitSheet = useHabitSheet();
  const [menu, setMenu] = useState<null | "more" | "add">(null);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const prevLevel = useRef<number | null>(null);

  // Level up: compară cu nivelul anterior (după ce s-au încărcat datele)
  useEffect(() => {
    if (loading || !session) return;
    const lvl = xp.level.level;
    if (prevLevel.current !== null && lvl > prevLevel.current) {
      setLevelUp(lvl);
      navigator.vibrate?.([30, 50, 30]);
      const t = setTimeout(() => setLevelUp(null), 4200);
      prevLevel.current = lvl;
      return () => clearTimeout(t);
    }
    prevLevel.current = lvl;
  }, [xp.level.level, loading, session]);

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
          onClick={() => setMenu(menu === "add" ? null : "add")}
          aria-label="Adaugă"
          aria-expanded={menu === "add"}
          className="grid size-12 place-items-center rounded-2xl bg-navy text-white shadow-[var(--shadow-lift)] active:scale-95"
        >
          <motion.span animate={{ rotate: menu === "add" ? 45 : 0 }}>
            <Plus size={22} strokeWidth={2.4} />
          </motion.span>
        </button>
        <MobileItem item={NAV[3]} active={isActive(NAV[3].href)} />
        <button
          onClick={() => setMenu(menu === "more" ? null : "more")}
          aria-expanded={menu === "more"}
          className="flex w-14 flex-col items-center gap-0.5 py-1 text-[11px] font-medium"
          style={{ color: menu === "more" || ["/calendar", "/gym", "/jurnal", "/progres"].some((h) => pathname.startsWith(h)) ? "var(--navy)" : "var(--ink-3)" }}
        >
          <MoreHorizontal size={22} />
          Mai mult
        </button>
      </nav>

      {/* Meniuri telefon */}
      <AnimatePresence>
        {menu && (
          <>
            <motion.div className="fixed inset-0 z-20 bg-ink/20 backdrop-blur-[2px] lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenu(null)} />
            <motion.div
              className="fixed inset-x-3 bottom-[88px] z-30 grid grid-cols-2 gap-2 rounded-[26px] bg-surface p-3 shadow-[var(--shadow-lift)] lg:hidden"
              initial={{ y: 20, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 500, damping: 36 }}
            >
              {menu === "more" ? (
                <>
                  {NAV.filter((n) => ["/calendar", "/gym", "/jurnal", "/progres"].includes(n.href)).map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link key={item.href} href={item.href} onClick={() => setMenu(null)} className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3.5 text-[15px] font-medium">
                        <span className="grid size-9 place-items-center rounded-xl text-white" style={{ background: item.color }}>
                          <Icon size={18} />
                        </span>
                        {item.label}
                      </Link>
                    );
                  })}
                  <button onClick={signOut} className="col-span-2 flex items-center justify-center gap-2 rounded-2xl py-2.5 text-[14px] text-ink-3">
                    <LogOut size={16} />
                    Ieși din cont
                  </button>
                </>
              ) : (
                <>
                  {[
                    { label: "Task", Icon: CheckCircle2, color: "var(--work)", run: () => sheet.open() },
                    { label: "Obicei", Icon: Repeat, color: "var(--health)", run: () => habitSheet.open() },
                    { label: "Cum mă simt", Icon: Smile, color: "var(--personal)", run: () => router.push("/jurnal") },
                    { label: "Antrenament", Icon: Dumbbell, color: "var(--fitness)", run: () => router.push("/gym") },
                    { label: "Jurnal", Icon: NotebookPen, color: "var(--mind)", run: () => router.push("/jurnal") },
                  ].map(({ label, Icon, color, run }) => (
                    <button
                      key={label}
                      onClick={() => {
                        setMenu(null);
                        run();
                      }}
                      className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3.5 text-left text-[15px] font-medium"
                    >
                      <span className="grid size-9 place-items-center rounded-xl text-white" style={{ background: color }}>
                        <Icon size={18} />
                      </span>
                      {label}
                    </button>
                  ))}
                  <button onClick={() => setMenu(null)} aria-label="Închide" className="flex items-center justify-center rounded-2xl text-ink-3">
                    <X size={20} />
                  </button>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Level up */}
      <AnimatePresence>
        {levelUp && (
          <motion.div
            role="status"
            className="fixed inset-x-0 top-6 z-[60] mx-auto flex w-fit items-center gap-4 rounded-[24px] bg-navy py-3 pl-3 pr-6 text-white shadow-[var(--shadow-lift)]"
            initial={{ y: -80, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 22 }}
            onClick={() => setLevelUp(null)}
          >
            <motion.span
              className="tabular grid size-14 place-items-center rounded-2xl bg-personal text-[26px] font-semibold text-ink"
              initial={{ rotate: -20, scale: 0.6 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 10, delay: 0.15 }}
            >
              {levelUp}
            </motion.span>
            <span>
              <span className="block text-[13px] text-white/60">Nivel nou!</span>
              <span className="block text-[19px] font-semibold tracking-tight">{levelTitle(levelUp)}</span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
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
