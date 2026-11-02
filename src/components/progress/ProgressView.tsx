"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { Lock } from "lucide-react";
import { AREAS, levelFromXp, type AreaKey } from "@/lib/areas";
import { addDays, labelDay, toISO, todayISO } from "@/lib/dates";
import { useStore } from "@/lib/data/store";
import { useGym } from "@/lib/data/gym";
import { useJournal } from "@/lib/data/journal";
import { computeAchievements, levelTitle, longestDayStreak } from "@/lib/data/achievements";
import { useNow } from "@/lib/hooks/useNow";
import { ColumnChart } from "@/components/charts/Charts";

export function ProgressView() {
  const now = useNow();
  const store = useStore();
  const gym = useGym();
  const journal = useJournal();
  const today = now ? todayISO() : "";

  const achievements = useMemo(
    () =>
      today
        ? computeAchievements({
            tasks: store.tasks,
            habits: store.habits,
            habitLogs: store.habitLogs,
            rituals: store.rituals,
            xpEvents: store.xpEvents,
            workouts: gym.workouts,
            sets: gym.sets,
            moods: journal.moods,
            entries: journal.entries,
            items: journal.items,
            today,
          })
        : [],
    [store.tasks, store.habits, store.habitLogs, store.rituals, store.xpEvents, gym.workouts, gym.sets, journal.moods, journal.entries, journal.items, today],
  );

  if (!now) return null;
  const { level, into, needed } = store.xp.level;
  const unlocked = achievements.filter((a) => a.progress >= a.target);

  const xpByDay = new Map<string, number>();
  for (const e of store.xpEvents) {
    const d = toISO(new Date(e.created_at));
    xpByDay.set(d, (xpByDay.get(d) ?? 0) + e.amount);
  }
  const series = Array.from({ length: 30 }, (_, i) => {
    const d = addDays(today, i - 29);
    return { x: d, y: xpByDay.get(d) ?? 0, label: labelDay(d, { day: "numeric", month: "short" }) };
  });

  const doneWorkouts = gym.workouts.filter((w) => w.ended_at).length;
  const volume = gym.sets.filter((s) => s.done).reduce((v, s) => v + (Number(s.weight_kg) || 0) * (Number(s.reps) || 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[40px] font-semibold leading-none tracking-[-0.03em] sm:text-[52px]">Progres</h1>

      {/* Nivelul */}
      <section className="relative overflow-hidden rounded-[32px] bg-navy p-6 text-white sm:p-9">
        <svg className="pointer-events-none absolute -right-16 -top-16 opacity-[0.14]" width="340" height="340" viewBox="0 0 220 220" aria-hidden>
          <circle cx="110" cy="110" r="96" fill="none" stroke="var(--work)" strokeWidth="22" />
          <circle cx="110" cy="110" r="62" fill="none" stroke="var(--health)" strokeWidth="22" />
          <circle cx="110" cy="110" r="28" fill="none" stroke="var(--personal)" strokeWidth="22" />
        </svg>
        <div className="relative flex flex-wrap items-end gap-x-8 gap-y-4">
          <div>
            <p className="text-[15px] text-white/60">Nivelul</p>
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="tabular text-[120px] font-semibold leading-[0.85] tracking-[-0.05em] sm:text-[160px]">
              {level}
            </motion.p>
          </div>
          <div className="mb-2 min-w-[220px] flex-1">
            <p className="text-[28px] font-semibold tracking-tight">{levelTitle(level)}</p>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/15">
              <motion.div className="h-full rounded-full bg-personal" initial={{ width: 0 }} animate={{ width: `${(into / needed) * 100}%` }} transition={{ type: "spring", stiffness: 60, damping: 18 }} />
            </div>
            <p className="tabular mt-2 text-[14px] text-white/60">
              {into} / {needed} XP până la nivelul {level + 1} · {store.xp.total.toLocaleString("ro-RO")} XP în total
            </p>
          </div>
        </div>
      </section>

      {/* Arii */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {(Object.keys(AREAS) as AreaKey[]).map((k) => {
          const a = AREAS[k];
          const l = levelFromXp(store.xp.byArea[k]);
          return (
            <div key={k} className="rounded-[22px] bg-surface p-4 shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-2 text-[14px] font-medium text-ink-2">
                <span className="size-2.5 rounded-full" style={{ background: a.color }} />
                {a.label}
              </div>
              <p className="tabular mt-2 text-[34px] font-semibold leading-none tracking-tight">{l.level}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: a.soft }}>
                <div className="h-full rounded-full" style={{ width: `${(l.into / l.needed) * 100}%`, background: a.color }} />
              </div>
              <p className="tabular mt-1.5 text-[12px] text-ink-3">{store.xp.byArea[k].toLocaleString("ro-RO")} XP</p>
            </div>
          );
        })}
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="rounded-[26px] bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6 lg:col-span-8">
          <h2 className="text-[18px] font-semibold tracking-tight">XP pe zi, ultimele 30 de zile</h2>
          <div className="mt-4">
            <ColumnChart data={series} ariaLabel="XP câștigat pe zi" unit=" XP" />
          </div>
        </section>
        <section className="grid grid-cols-2 gap-3 lg:col-span-4">
          {[
            [String(longestDayStreak(store.habits, store.habitLogs, today)), "cel mai lung streak (zile)"],
            [String(store.tasks.filter((t) => t.done).length), "taskuri terminate"],
            [String(doneWorkouts), "antrenamente"],
            [`${(volume / 1000).toLocaleString("ro-RO", { maximumFractionDigits: 1 })} t`, "volum ridicat"],
            [String(journal.entries.length), "însemnări în jurnal"],
            [`${unlocked.length}/${achievements.length}`, "achievements"],
          ].map(([v, l]) => (
            <div key={l} className="rounded-[20px] bg-surface p-4 shadow-[var(--shadow-card)]">
              <div className="tabular text-[26px] font-semibold leading-none tracking-tight">{v}</div>
              <div className="mt-1 text-[12px] leading-snug text-ink-3">{l}</div>
            </div>
          ))}
        </section>
      </div>

      {/* Achievements */}
      <section className="flex flex-col gap-3">
        <h2 className="px-1 text-[20px] font-semibold tracking-tight">Achievements</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...achievements]
            .sort((a, b) => Number(b.progress >= b.target) - Number(a.progress >= a.target) || b.progress / b.target - a.progress / a.target)
            .map((a, i) => {
              const done = a.progress >= a.target;
              const pct = Math.min(1, a.progress / a.target);
              return (
                <motion.li
                  key={a.key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0, rotate: done && i % 4 === 1 ? -1 : 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  className={`flex items-center gap-4 rounded-[22px] p-4 ${done ? "bg-surface shadow-[var(--shadow-card)]" : "bg-surface/50"}`}
                >
                  <span className={`grid size-14 shrink-0 place-items-center rounded-2xl text-[28px] ${done ? "bg-personal-soft" : "bg-surface-2 grayscale"}`}>
                    {done ? a.emoji : <Lock size={20} className="text-ink-3" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[15px] font-semibold ${done ? "" : "text-ink-2"}`}>{a.title}</span>
                    <span className="block text-[13px] text-ink-3">{a.text}</span>
                    {!done && (
                      <span className="mt-2 flex items-center gap-2">
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                          <span className="block h-full rounded-full bg-navy" style={{ width: `${pct * 100}%` }} />
                        </span>
                        <span className="tabular text-[11px] text-ink-3">
                          {a.progress.toLocaleString("ro-RO")}/{a.target.toLocaleString("ro-RO")}
                        </span>
                      </span>
                    )}
                  </span>
                </motion.li>
              );
            })}
        </ul>
      </section>
    </div>
  );
}
