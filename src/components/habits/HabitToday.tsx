"use client";

import { useState } from "react";
import { Flame, Minus, Plus } from "lucide-react";
import { AREAS } from "@/lib/areas";
import { nowHHMM } from "@/lib/dates";
import { useStore } from "@/lib/data/store";
import {
  fmtNum,
  hhmm,
  isDueOn,
  localTime,
  logsOn,
  quantityOn,
  streak,
  weekCount,
  type Habit,
  type HabitLog,
} from "@/lib/data/habits";
import { CheckCircle } from "@/components/dashboard/CheckCircle";
import { XpBurst } from "@/components/dashboard/XpBurst";
import { useHabitSheet } from "./HabitSheet";
import { AnimatePresence } from "motion/react";
import { WaterSheet, isWater } from "./WaterSheet";

type Row = { habit: Habit; slot: string | null };

export function HabitToday({ date, title = "Obiceiuri și tratamente", today }: { date: string; title?: string; today: string }) {
  const { habits, habitLogs } = useStore();
  const sheet = useHabitSheet();
  const due = habits.filter((h) => isDueOn(h, date));

  const scheduled: Row[] = due
    .filter((h) => h.kind === "scheduled" && h.times.length)
    .flatMap((h) => h.times.map((slot) => ({ habit: h, slot })))
    .sort((a, b) => a.slot!.localeCompare(b.slot!));
  const anytime = due.filter((h) => !(h.kind === "scheduled" && h.times.length));
  const now = date === today ? nowHHMM() : date < today ? "99:99" : "00:00";

  return (
    <section className="rounded-[28px] bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-[20px] font-semibold tracking-tight">{title}</h2>
        <button onClick={() => sheet.open()} className="flex shrink-0 items-center gap-1 text-[13px] font-medium text-navy">
          <Plus size={15} />
          Obicei nou
        </button>
      </div>

      {due.length === 0 && (
        <p className="py-4 text-[14px] text-ink-3">
          Nimic programat. Adaugă tratamentele, suplimentele sau obiceiurile pe care vrei să le urmărești.
        </p>
      )}

      {scheduled.length > 0 && (
        <ol className="relative flex flex-col">
          {scheduled.map((r, i) => {
            const log = habitLogs.find((l) => l.habit_id === r.habit.id && l.date === date && l.slot === r.slot);
            const overdue = !log && hhmm(r.slot!) < now;
            return (
              <li key={`${r.habit.id}-${r.slot}`} className="relative flex gap-3 pb-4 last:pb-0">
                {i < scheduled.length - 1 && <span className="absolute bottom-0 left-[21px] top-8 w-px bg-line" aria-hidden />}
                <span className={`tabular w-11 shrink-0 pt-1.5 text-[13px] font-medium ${overdue ? "text-danger" : "text-ink-3"}`}>{hhmm(r.slot!)}</span>
                <CheckRow habit={r.habit} slot={r.slot} date={date} today={today} log={log} overdue={overdue} />
              </li>
            );
          })}
        </ol>
      )}

      {anytime.length > 0 && (
        <div className={`flex flex-col gap-4 ${scheduled.length ? "mt-5 border-t border-line pt-4" : ""}`}>
          {scheduled.length > 0 && <h3 className="-mb-1 text-[13px] font-medium text-ink-3">Oricând azi</h3>}
          {anytime.map((h) =>
            h.kind === "quantity" ? (
              <QuantityRow key={h.id} habit={h} date={date} />
            ) : (
              <CheckRow key={h.id} habit={h} slot={null} date={date} today={today} log={logsOn(habitLogs, h.id, date)[0]} overdue={false} />
            ),
          )}
        </div>
      )}
    </section>
  );
}

function CheckRow({ habit, slot, date, today, log, overdue }: { habit: Habit; slot: string | null; date: string; today: string; log?: HabitLog; overdue: boolean }) {
  const { habitLogs, logHabit, unlogHabit, updateLog } = useStore();
  const sheet = useHabitSheet();
  const [burst, setBurst] = useState(false);
  const [editTime, setEditTime] = useState(false);
  const area = AREAS[habit.area];
  const s = streak(habit, habitLogs, today);

  function toggle() {
    if (log) return unlogHabit(log.id);
    setBurst(true);
    setTimeout(() => setBurst(false), 900);
    // Pentru zile trecute, ora implicită e chiar ora programată
    const loggedAt = date !== today ? new Date(`${date}T${slot ? hhmm(slot) : "12:00"}:00`).toISOString() : undefined;
    logHabit(habit, { date, slot, loggedAt });
  }

  let sub: React.ReactNode = habit.detail;
  if (log) {
    sub = editTime ? (
      <input
        type="time"
        autoFocus
        defaultValue={localTime(log.logged_at)}
        onBlur={(e) => {
          if (e.target.value) updateLog(log.id, { logged_at: new Date(`${date}T${e.target.value}:00`).toISOString() });
          setEditTime(false);
        }}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        aria-label="Ora la care l-ai bifat"
        className="tabular rounded-md border border-line px-1 text-[13px]"
      />
    ) : (
      <button onClick={() => setEditTime(true)} className="underline decoration-dotted underline-offset-2" style={{ color: area.ink }} title="Schimbă ora">
        {habit.kind === "scheduled" ? "Luat" : "Bifat"} la {localTime(log.logged_at)}
      </button>
    );
  } else if (overdue) {
    sub = <span className="text-danger">Întârziat{habit.detail ? ` · ${habit.detail}` : ""}</span>;
  } else if (habit.kind === "weekly") {
    sub = (
      <span className="tabular">
        {weekCount(habitLogs, habit.id, date)} din {habit.weekly_target} săptămâna asta
      </span>
    );
  }

  return (
    <div className="relative flex min-w-0 flex-1 items-center gap-3">
      <XpBurst show={burst} xp={habit.xp} color={area.color} />
      <button onClick={() => sheet.open(habit)} aria-label={`Editează ${habit.name}`} className="grid size-9 shrink-0 place-items-center rounded-xl text-[18px]" style={{ background: area.soft }}>
        {habit.emoji ?? "•"}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[15px] font-medium ${log ? "text-ink-3" : ""}`}>{habit.name}</p>
        <p className="flex items-center text-[12px] text-ink-3">
          {sub}
          {s >= 2 && (
            <span className="ml-2 inline-flex items-center gap-0.5 text-fitness" title={habit.kind === "weekly" ? "Săptămâni la rând" : "Zile la rând"}>
              <Flame size={11} strokeWidth={2.6} />
              <span className="tabular">{s}</span>
            </span>
          )}
        </p>
      </div>
      <CheckCircle checked={Boolean(log)} color={area.color} onToggle={toggle} label={habit.name} />
    </div>
  );
}

function QuantityRow({ habit, date }: { habit: Habit; date: string }) {
  const { habitLogs, logHabit, unlogHabit } = useStore();
  const sheet = useHabitSheet();
  const [burst, setBurst] = useState(false);
  const [water, setWater] = useState(false);
  const area = AREAS[habit.area];
  const value = quantityOn(habitLogs, habit.id, date);
  const target = Number(habit.target_value) || 1;
  const step = Number(habit.step_value) || 1;
  const pct = Math.min(value / target, 1);
  const last = logsOn(habitLogs, habit.id, date).at(-1);

  function add() {
    if (value < target && value + step >= target) {
      setBurst(true);
      setTimeout(() => setBurst(false), 900);
    }
    logHabit(habit, { date, value: step });
  }

  return (
    <div className="relative flex items-center gap-3">
      <XpBurst show={burst} xp={habit.xp} color={area.color} />
      <button onClick={() => sheet.open(habit)} aria-label={`Editează ${habit.name}`} className="grid size-9 shrink-0 place-items-center rounded-xl text-[18px]" style={{ background: area.soft }}>
        {habit.emoji ?? "•"}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-[15px] font-medium">{habit.name}</p>
          <span className="tabular shrink-0 text-[13px] text-ink-2">
            {fmtNum(value)} / {fmtNum(target)} {habit.unit}
          </span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full" style={{ background: area.soft }}>
          <div className="h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${pct * 100}%`, background: area.color }} />
        </div>
      </div>
      {last && (
        <button onClick={() => unlogHabit(last.id)} aria-label={`Scade ${fmtNum(Number(last.value))} ${habit.unit ?? ""}`} className="grid size-8 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-surface-2">
          <Minus size={16} />
        </button>
      )}
      <button
        onClick={isWater(habit) ? () => setWater(true) : add}
        aria-label={isWater(habit) ? `Adaugă apă la ${habit.name}` : `Adaugă ${fmtNum(step)} ${habit.unit ?? ""} la ${habit.name}`}
        className="grid size-9 shrink-0 place-items-center rounded-full transition active:scale-90"
        style={{ background: area.soft, color: area.ink }}
      >
        <Plus size={18} strokeWidth={2.4} />
      </button>
      <AnimatePresence>{water && <WaterSheet habit={habit} date={date} onClose={() => setWater(false)} />}</AnimatePresence>
    </div>
  );
}
