"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { AREAS, levelFromXp } from "@/lib/areas";
import { quoteOfTheDay } from "@/lib/quotes";
import { useNow } from "@/lib/hooks/useNow";
import { MOCK_AREA_XP, MOCK_HABITS, MOCK_TASKS, MOCK_TOTAL_XP, MOCK_WEEK } from "@/lib/mock";
import { DayRings } from "./DayRings";
import { WeekStrip } from "./WeekStrip";
import { QuoteCard } from "./QuoteCard";
import { TodayTasks } from "./TodayTasks";
import { HabitTimeline } from "./HabitTimeline";
import { AreaStats } from "./AreaStats";
import { GymCard } from "./GymCard";
import { MoodCard } from "./MoodCard";

const DAILY_XP_GOAL = 150;
const NAME = "Victor";

function hhmm(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function Dashboard() {
  const now = useNow();
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const [habits, setHabits] = useState(MOCK_HABITS);
  const [areaXp, setAreaXp] = useState(MOCK_AREA_XP);
  const [todayXp, setTodayXp] = useState(40);

  if (!now) return <div className="h-dvh" />;

  function gain(area: keyof typeof AREAS, xp: number) {
    setTodayXp((v) => Math.max(0, v + xp));
    setAreaXp((a) => ({ ...a, [area]: Math.max(0, a[area] + xp) }));
  }

  function toggleTask(id: string) {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    gain(t.area, t.done ? -t.xp : t.xp);
    setTasks((ts) => ts.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  }

  function logHabit(id: string) {
    const h = habits.find((x) => x.id === id);
    if (!h) return;
    gain(h.area, h.loggedAt ? -h.xp : h.xp);
    const loggedAt = h.loggedAt ? undefined : hhmm(new Date());
    setHabits((hs) => hs.map((x) => (x.id === id ? { ...x, loggedAt } : x)));
  }

  function addQuantity(id: string) {
    const h = habits.find((x) => x.id === id);
    if (!h?.goal) return;
    const before = h.goal.value;
    const value = Math.min(h.goal.target, +(before + 0.25).toFixed(2));
    if (before < h.goal.target && value >= h.goal.target) gain(h.area, h.xp);
    setHabits((hs) => hs.map((x) => (x.id === id && x.goal ? { ...x, goal: { ...x.goal, value } } : x)));
  }

  const totalXp = MOCK_TOTAL_XP + todayXp;
  const lvl = levelFromXp(totalXp);
  const habitsDone = habits.filter((h) => h.loggedAt || (h.goal && h.goal.value >= h.goal.target)).length;
  const todayIndex = (now.getDay() + 6) % 7;
  const rawDate = now.toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long" });
  const dateLabel = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);
  const week = MOCK_WEEK.map((_, i) => i < todayIndex);

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      {/* Antet */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[15px] text-ink-3">{dateLabel}</p>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mt-1 text-[44px] font-semibold leading-[0.95] tracking-[-0.035em] sm:text-[60px]"
          >
            Salut, {NAME}!
          </motion.h1>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-surface py-2.5 pl-2.5 pr-4 shadow-[var(--shadow-card)]">
          <span className="tabular grid size-11 place-items-center rounded-xl bg-navy text-[18px] font-semibold text-white">{lvl.level}</span>
          <div className="w-36">
            <div className="flex items-baseline justify-between text-[13px]">
              <span className="font-medium">Nivelul {lvl.level}</span>
              <span className="tabular text-ink-3">{lvl.into}/{lvl.needed}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-navy-soft">
              <motion.div className="h-full rounded-full bg-navy" animate={{ width: `${(lvl.into / lvl.needed) * 100}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
            </div>
          </div>
        </div>
      </header>

      {/* Citat + inele */}
      <div className="grid gap-4 lg:grid-cols-12 lg:gap-6">
        <div className="lg:col-span-7 lg:[&>figure]:h-full">
          <QuoteCard quote={quoteOfTheDay(now)} />
        </div>
        <section className="flex flex-col gap-6 rounded-[28px] bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6 lg:col-span-5">
          <DayRings
            rings={[
              { label: "Taskuri", value: tasks.filter((t) => t.done).length, target: tasks.length, color: "var(--work)" },
              { label: "Obiceiuri", value: habitsDone, target: habits.length, color: "var(--health)" },
              { label: "XP azi", value: todayXp, target: DAILY_XP_GOAL, color: "var(--personal)" },
            ]}
          />
          <WeekStrip week={week} todayIndex={todayIndex} streak={4} />
        </section>
      </div>

      {/* Taskuri + obiceiuri */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <TodayTasks tasks={tasks} onToggle={toggleTask} />
        </div>
        <div className="lg:col-span-5">
          <HabitTimeline habits={habits} nowHHMM={hhmm(now)} onLog={logHabit} onAdd={addQuantity} />
        </div>
      </div>

      {/* Gym, mood, arii */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        <GymCard />
        <MoodCard />
        <div className="sm:col-span-2 lg:col-span-1">
          <AreaStats xp={areaXp} />
        </div>
      </div>
    </div>
  );
}
