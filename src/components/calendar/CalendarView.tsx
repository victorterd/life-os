"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, Dumbbell, Plus } from "lucide-react";
import { AREAS } from "@/lib/areas";
import { addDays, addMonths, fromISO, labelDay, labelMonth, labelWeek, monthStart, toISO, todayISO, weekDays, weekStart } from "@/lib/dates";
import { useStore } from "@/lib/data/store";
import { useGym } from "@/lib/data/gym";
import { useJournal, MOODS } from "@/lib/data/journal";
import { dayComplete, hhmm, isDueOn } from "@/lib/data/habits";
import type { Task } from "@/lib/data/types";
import { useNow } from "@/lib/hooks/useNow";
import { TaskItem } from "@/components/tasks/TaskItem";
import { useTaskSheet } from "@/components/tasks/TaskSheet";
import { sortTasks } from "@/components/tasks/TasksView";

type Mode = "month" | "week";
const HOUR = 52;
const START_H = 6;
const END_H = 24;

export function CalendarView() {
  const now = useNow();
  const [mode, setMode] = useState<Mode>("week");
  const [anchor, setAnchor] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  if (!now) return null;
  const today = todayISO();
  const a = anchor ?? today;

  const label = mode === "month" ? labelMonth(a) : labelWeek(weekStart(a));
  const shift = (n: number) => setAnchor(mode === "month" ? addMonths(monthStart(a), n) : addDays(a, 7 * n));

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[40px] font-semibold leading-none tracking-[-0.03em] sm:text-[52px]">Calendar</h1>
        <div role="tablist" className="flex rounded-2xl bg-surface p-1 shadow-[var(--shadow-card)]">
          {(
            [
              ["week", "Săptămână"],
              ["month", "Lună"],
            ] as const
          ).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={mode === k} onClick={() => setMode(k)} className="relative rounded-xl px-4 py-2 text-[14px] font-medium" style={{ color: mode === k ? "white" : "var(--ink-2)" }}>
              {mode === k && <motion.span layoutId="cal-tab" className="absolute inset-0 rounded-xl bg-mind" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
              <span className="relative">{l}</span>
            </button>
          ))}
        </div>
      </header>

      <div className="flex items-center gap-1">
        <button onClick={() => shift(-1)} aria-label="Înapoi" className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-surface">
          <ChevronLeft size={20} />
        </button>
        <button onClick={() => shift(1)} aria-label="Înainte" className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-surface">
          <ChevronRight size={20} />
        </button>
        <h2 className="ml-1 text-[20px] font-semibold tracking-tight">{label}</h2>
        {anchor && anchor !== today && (
          <button onClick={() => setAnchor(null)} className="ml-2 rounded-full bg-navy-soft px-3 py-1 text-[13px] font-medium text-navy">
            Azi
          </button>
        )}
      </div>

      {mode === "month" ? (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <MonthGrid month={monthStart(a)} today={today} selected={selected ?? today} onSelect={setSelected} />
          </div>
          <div className="lg:col-span-4">
            <DayPanel date={selected ?? today} today={today} />
          </div>
        </div>
      ) : (
        <WeekGrid start={weekStart(a)} today={today} now={now} />
      )}
    </div>
  );
}

// ------------------------------------------------------------------ Lună

function MonthGrid({ month, today, selected, onSelect }: { month: string; today: string; selected: string; onSelect: (d: string) => void }) {
  const { tasks, habits, habitLogs } = useStore();
  const { workouts } = useGym();
  const { moods } = useJournal();
  const start = weekStart(month);
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const gymDays = new Set(workouts.filter((w) => w.ended_at).map((w) => toISO(new Date(w.started_at))));
  const moodBy = new Map(moods.map((m) => [m.date, m.mood]));
  const m = fromISO(month).getMonth();

  return (
    <div className="overflow-hidden rounded-[26px] bg-surface shadow-[var(--shadow-card)]">
      <div className="grid grid-cols-7 border-b border-line">
        {["Lu", "Ma", "Mi", "Jo", "Vi", "Sâ", "Du"].map((d) => (
          <div key={d} className="py-2.5 text-center text-[12px] font-medium text-ink-3">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          const inMonth = fromISO(d).getMonth() === m;
          const dayTasks = tasks.filter((t) => t.horizon === "day" && t.period === d).sort(sortTasks);
          const complete = d <= today ? dayComplete(habits, habitLogs, d) : null;
          const mood = moodBy.get(d);
          const isSel = d === selected;
          return (
            <button
              key={d}
              onClick={() => onSelect(d)}
              aria-pressed={isSel}
              aria-label={labelDay(d)}
              className={`relative flex min-h-[74px] flex-col gap-1 p-1.5 text-left transition sm:min-h-[104px] sm:p-2 ${i % 7 ? "border-l border-line" : ""} ${i >= 7 ? "border-t border-line" : ""} ${
                isSel ? "bg-mind-soft" : "hover:bg-surface-2"
              } ${inMonth ? "" : "opacity-40"}`}
            >
              <div className="flex items-center justify-between">
                <span className={`tabular grid size-6 place-items-center rounded-full text-[13px] font-semibold ${d === today ? "bg-navy text-white" : ""}`}>{fromISO(d).getDate()}</span>
                <span className="flex items-center gap-0.5">
                  {gymDays.has(d) && <Dumbbell size={12} className="text-fitness" aria-label="sală" />}
                  {mood && <span className="text-[12px]">{MOODS[mood - 1].emoji}</span>}
                </span>
              </div>
              <ul className="hidden flex-col gap-0.5 sm:flex">
                {dayTasks.slice(0, 3).map((t) => (
                  <li key={t.id} className={`flex items-center gap-1 truncate text-[11px] leading-tight ${t.done ? "text-ink-3 line-through" : "text-ink-2"}`}>
                    <span className="size-1.5 shrink-0 rounded-full" style={{ background: AREAS[t.area].color }} />
                    <span className="truncate">{t.title}</span>
                  </li>
                ))}
                {dayTasks.length > 3 && <li className="text-[11px] text-ink-3">+{dayTasks.length - 3}</li>}
              </ul>
              <span className="flex gap-0.5 sm:hidden">
                {dayTasks.slice(0, 4).map((t) => (
                  <span key={t.id} className="size-1.5 rounded-full" style={{ background: AREAS[t.area].color, opacity: t.done ? 0.35 : 1 }} />
                ))}
              </span>
              {complete === true && <span className="absolute inset-x-2 bottom-1 h-[3px] rounded-full bg-health" aria-label="toate obiceiurile bifate" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DayPanel({ date, today }: { date: string; today: string }) {
  const { tasks, habits, habitLogs } = useStore();
  const { workouts } = useGym();
  const { moods } = useJournal();
  const sheet = useTaskSheet();
  const list = tasks.filter((t) => t.horizon === "day" && t.period === date).sort(sortTasks);
  const due = habits.filter((h) => h.kind !== "weekly" && isDueOn(h, date));
  const doneH = due.filter((h) => dayComplete([h], habitLogs, date)).length;
  const ws = workouts.filter((w) => w.ended_at && toISO(new Date(w.started_at)) === date);
  const mood = moods.find((m) => m.date === date);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[18px] font-semibold tracking-tight">{date === today ? "Azi" : labelDay(date)}</h3>
        <button onClick={() => sheet.open({ horizon: "day", period: date })} className="flex items-center gap-1 text-[13px] font-medium text-navy">
          <Plus size={15} />
          Task
        </button>
      </div>
      <div className="flex flex-wrap gap-2 px-1 text-[13px] text-ink-2">
        {due.length > 0 && date <= today && (
          <span className="rounded-full bg-health-soft px-2.5 py-1 font-medium text-[#13805a]">
            Obiceiuri {doneH}/{due.length}
          </span>
        )}
        {ws.map((w) => (
          <span key={w.id} className="rounded-full bg-fitness-soft px-2.5 py-1 font-medium text-[#c4501f]">
            🏋️ {w.name}
          </span>
        ))}
        {mood && <span className="rounded-full bg-personal-soft px-2.5 py-1 font-medium text-[#946200]">{MOODS[mood.mood - 1].emoji} {MOODS[mood.mood - 1].label}</span>}
      </div>
      {list.map((t) => (
        <TaskItem key={t.id} task={t} />
      ))}
      {!list.length && <p className="px-1 py-4 text-[14px] text-ink-3">Niciun task în ziua asta.</p>}
    </section>
  );
}

// ------------------------------------------------------------------ Săptămână (time blocking)

function WeekGrid({ start, today, now }: { start: string; today: string; now: Date }) {
  const { tasks, habits, habitLogs } = useStore();
  const { workouts } = useGym();
  const sheet = useTaskSheet();
  const days = weekDays(start);
  const [mobileDay, setMobileDay] = useState(days.includes(today) ? today : start);
  const scroller = useRef<HTMLDivElement>(null);
  const shownMobile = days.includes(mobileDay) ? mobileDay : start;

  useEffect(() => {
    // derulează la ora curentă
    const h = Math.max(START_H, new Date().getHours() - 1);
    scroller.current?.scrollTo({ top: (h - START_H) * HOUR });
  }, []);

  const hours = Array.from({ length: END_H - START_H }, (_, i) => START_H + i);
  const nowTop = ((now.getHours() + now.getMinutes() / 60 - START_H) * HOUR);

  const column = (d: string) => {
    const timed = tasks.filter((t) => t.horizon === "day" && t.period === d && t.start_time);
    const ws = workouts.filter((w) => toISO(new Date(w.started_at)) === d);
    const slots = habits
      .filter((h) => h.kind === "scheduled" && isDueOn(h, d))
      .flatMap((h) => h.times.map((t) => ({ h, t, done: habitLogs.some((l) => l.habit_id === h.id && l.date === d && l.slot === t) })));
    return { timed, ws, slots };
  };

  const top = (hhmmStr: string) => {
    const [h, m] = hhmmStr.split(":").map(Number);
    return (h + m / 60 - START_H) * HOUR;
  };

  return (
    <div className="flex flex-col gap-3">
      {/* zile, pe telefon se alege una */}
      <div className="grid grid-cols-7 gap-1 md:hidden">
        {days.map((d) => (
          <button
            key={d}
            onClick={() => setMobileDay(d)}
            aria-pressed={d === shownMobile}
            className={`flex flex-col items-center rounded-2xl py-2 ${d === shownMobile ? "bg-mind text-white" : d === today ? "bg-mind-soft" : ""}`}
          >
            <span className="text-[11px] font-medium opacity-70">{labelDay(d, { weekday: "short" }).slice(0, 2)}</span>
            <span className="tabular text-[16px] font-semibold">{fromISO(d).getDate()}</span>
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-[26px] bg-surface shadow-[var(--shadow-card)]">
        {/* antet desktop + taskuri fără oră */}
        <div className="hidden grid-cols-[3.25rem_repeat(7,1fr)] border-b border-line md:grid">
          <span />
          {days.map((d) => {
            const allDay = tasks.filter((t) => t.horizon === "day" && t.period === d && !t.start_time).sort(sortTasks);
            return (
              <div key={d} className={`flex min-w-0 flex-col gap-1 border-l border-line p-2 ${d === today ? "bg-mind-soft/60" : ""}`}>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[12px] font-medium text-ink-3">{labelDay(d, { weekday: "short" })}</span>
                  <span className={`tabular text-[17px] font-semibold ${d === today ? "text-mind" : ""}`}>{fromISO(d).getDate()}</span>
                  {dayComplete(habits, habitLogs, d) === true && d <= today && <span className="ml-auto size-2 rounded-full bg-health" aria-label="obiceiuri complete" />}
                </div>
                {allDay.slice(0, 3).map((t) => (
                  <AllDayChip key={t.id} task={t} />
                ))}
                {allDay.length > 3 && <span className="text-[11px] text-ink-3">+{allDay.length - 3}</span>}
              </div>
            );
          })}
        </div>
        <div className="flex flex-col gap-1 border-b border-line p-2 md:hidden">
          {tasks
            .filter((t) => t.horizon === "day" && t.period === shownMobile && !t.start_time)
            .sort(sortTasks)
            .map((t) => (
              <AllDayChip key={t.id} task={t} />
            ))}
        </div>

        <div ref={scroller} className="relative max-h-[64dvh] overflow-y-auto">
          <div className="grid grid-cols-[3.25rem_1fr] md:grid-cols-[3.25rem_repeat(7,1fr)]" style={{ height: hours.length * HOUR }}>
            <div className="relative">
              {hours.map((h) => (
                <span key={h} className="tabular absolute right-2 -translate-y-1/2 text-[11px] text-ink-3" style={{ top: (h - START_H) * HOUR }}>
                  {h > START_H ? `${String(h).padStart(2, "0")}:00` : ""}
                </span>
              ))}
            </div>
            {days.map((d) => {
              const { timed, ws, slots } = column(d);
              return (
                <div key={d} className={`relative border-l border-line ${d === shownMobile ? "" : "hidden md:block"} ${d === today ? "bg-mind-soft/25" : ""}`}>
                  {hours.map((h) => (
                    <button
                      key={h}
                      onClick={() => sheet.open({ horizon: "day", period: d, start_time: `${String(h).padStart(2, "0")}:00` })}
                      aria-label={`Task nou ${labelDay(d)} la ${h}:00`}
                      className="absolute inset-x-0 border-t border-line/70 hover:bg-navy-soft/40"
                      style={{ top: (h - START_H) * HOUR, height: HOUR }}
                    />
                  ))}
                  {ws.map((w) => {
                    const s = new Date(w.started_at);
                    const e = w.ended_at ? new Date(w.ended_at) : now;
                    const t0 = (s.getHours() + s.getMinutes() / 60 - START_H) * HOUR;
                    const hgt = Math.max(24, ((e.getTime() - s.getTime()) / 3_600_000) * HOUR);
                    return (
                      <div key={w.id} className="absolute inset-x-1 overflow-hidden rounded-xl bg-fitness px-2 py-1 text-[12px] font-semibold text-ink" style={{ top: t0, height: hgt }}>
                        🏋️ {w.name}
                      </div>
                    );
                  })}
                  {timed.map((t) => {
                    const area = AREAS[t.area];
                    return (
                      <button
                        key={t.id}
                        onClick={() => sheet.open(t)}
                        className={`absolute inset-x-1 overflow-hidden rounded-xl border-l-[3px] px-2 py-1 text-left text-[12px] leading-tight shadow-[var(--shadow-card)] ${t.done ? "opacity-50" : ""}`}
                        style={{ top: top(t.start_time!) + 1, height: Math.max(22, ((t.duration_min ?? 30) / 60) * HOUR - 2), background: area.soft, borderColor: area.color }}
                      >
                        <span className={`block font-semibold ${t.done ? "line-through" : ""}`} style={{ color: area.ink }}>
                          {t.title}
                        </span>
                        <span className="tabular text-ink-3">{hhmm(t.start_time!)}</span>
                      </button>
                    );
                  })}
                  {slots.map(({ h, t, done }) => (
                    <span
                      key={`${h.id}-${t}`}
                      title={`${h.name} ${hhmm(t)}`}
                      className={`pointer-events-none absolute right-1 z-10 -translate-y-1/2 rounded-full px-1.5 py-0.5 text-[11px] shadow-[var(--shadow-card)] ${done ? "bg-health text-white" : "bg-white"}`}
                      style={{ top: top(t) }}
                    >
                      {h.emoji ?? "•"}
                    </span>
                  ))}
                  {d === today && nowTop > 0 && (
                    <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center" style={{ top: nowTop }}>
                      <span className="-ml-1 size-2.5 rounded-full bg-danger" />
                      <span className="h-[2px] flex-1 bg-danger" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <p className="px-1 text-[13px] text-ink-3">Atinge o oră liberă ca să programezi un task. Iconițele din dreapta sunt tratamentele și obiceiurile cu oră.</p>
    </div>
  );
}

function AllDayChip({ task }: { task: Task }) {
  const sheet = useTaskSheet();
  const area = AREAS[task.area];
  return (
    <button onClick={() => sheet.open(task)} className={`truncate rounded-lg px-1.5 py-0.5 text-left text-[11px] font-medium ${task.done ? "line-through opacity-50" : ""}`} style={{ background: area.soft, color: area.ink }}>
      {task.title}
    </button>
  );
}
