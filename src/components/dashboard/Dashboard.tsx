"use client";

import { motion } from "motion/react";
import { quoteOfTheDay } from "@/lib/quotes";
import { useNow } from "@/lib/hooks/useNow";
import { useStore } from "@/lib/data/store";
import { useTodayTasks } from "@/components/tasks/TasksView";
import { DayRings } from "./DayRings";
import { WeekStrip } from "./WeekStrip";
import { QuoteCard } from "./QuoteCard";
import { TodayTasks } from "./TodayTasks";
import { HabitToday } from "@/components/habits/HabitToday";
import { dayComplete, dayProgress, dayStreak, isDueOn } from "@/lib/data/habits";
import { todayISO, weekDays, weekStart } from "@/lib/dates";
import { AreaStats } from "./AreaStats";
import { GymCard } from "./GymCard";
import { MoodCard } from "./MoodCard";

const DAILY_XP_GOAL = 150;
const NAME = "Victor";

export function Dashboard() {
  const now = useNow();
  const { xp, habits, habitLogs } = useStore();
  const tasks = useTodayTasks();

  if (!now) return <div className="h-dvh" />;

  const lvl = xp.level;
  const todayXp = xp.today;
  const today = todayISO();
  const dueToday = habits.filter((h) => h.kind !== "weekly" && isDueOn(h, today));
  const habitsDone = dueToday.filter((h) => dayProgress(h, habitLogs, today).complete).length;
  const todayIndex = (now.getDay() + 6) % 7;
  const rawDate = now.toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long" });
  const dateLabel = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);
  const week = weekDays(weekStart(today)).map((d) => d <= today && dayComplete(habits, habitLogs, d) === true);
  const streakDays = dayStreak(habits, habitLogs, today);

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
              { label: "Obiceiuri", value: habitsDone, target: dueToday.length, color: "var(--health)" },
              { label: "XP azi", value: todayXp, target: DAILY_XP_GOAL, color: "var(--personal)" },
            ]}
          />
          <WeekStrip week={week} todayIndex={todayIndex} streak={streakDays} />
        </section>
      </div>

      {/* Taskuri + obiceiuri */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <TodayTasks tasks={tasks} />
        </div>
        <div className="lg:col-span-5">
          <HabitToday date={today} today={today} />
        </div>
      </div>

      {/* Gym, mood, arii */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        <GymCard />
        <MoodCard />
        <div className="sm:col-span-2 lg:col-span-1">
          <AreaStats xp={xp.byArea} />
        </div>
      </div>
    </div>
  );
}
