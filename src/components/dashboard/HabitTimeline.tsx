"use client";

import { useState } from "react";
import { Flame, Plus } from "lucide-react";
import { AREAS } from "@/lib/areas";
import type { MockHabit } from "@/lib/mock";
import { CheckCircle } from "./CheckCircle";
import { XpBurst } from "./XpBurst";

export function HabitTimeline({
  habits,
  nowHHMM,
  onLog,
  onAdd,
}: {
  habits: MockHabit[];
  nowHHMM: string;
  onLog: (id: string) => void;
  onAdd: (id: string) => void;
}) {
  const scheduled = habits.filter((h) => h.time).sort((a, b) => a.time!.localeCompare(b.time!));
  const anytime = habits.filter((h) => !h.time);

  return (
    <section className="rounded-[28px] bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-[20px] font-semibold tracking-tight">Obiceiuri și tratamente</h2>
      </div>

      <ol className="relative flex flex-col">
        {scheduled.map((h, i) => {
          const overdue = !h.loggedAt && h.time! < nowHHMM;
          return (
            <li key={h.id} className="relative flex gap-3 pb-4 last:pb-0">
              {i < scheduled.length - 1 && <span className="absolute left-[21px] top-8 bottom-0 w-px bg-line" aria-hidden />}
              <span className={`tabular w-11 shrink-0 pt-1 text-[13px] font-medium ${overdue ? "text-danger" : "text-ink-3"}`}>{h.time}</span>
              <HabitRow habit={h} overdue={overdue} onLog={onLog} />
            </li>
          );
        })}
      </ol>

      {anytime.length > 0 && (
        <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4">
          <h3 className="text-[13px] font-medium text-ink-3">Oricând azi</h3>
          {anytime.map((h) => (
            <QuantityRow key={h.id} habit={h} onAdd={onAdd} />
          ))}
        </div>
      )}
    </section>
  );
}

function HabitRow({ habit, overdue, onLog }: { habit: MockHabit; overdue: boolean; onLog: (id: string) => void }) {
  const [burst, setBurst] = useState(false);
  const area = AREAS[habit.area];
  const done = Boolean(habit.loggedAt);

  function toggle() {
    if (!done) {
      setBurst(true);
      setTimeout(() => setBurst(false), 900);
    }
    onLog(habit.id);
  }

  return (
    <div className="relative flex min-w-0 flex-1 items-center gap-3">
      <XpBurst show={burst} xp={habit.xp} color={area.color} />
      <span className="grid size-9 shrink-0 place-items-center rounded-xl text-[18px]" style={{ background: area.soft }} aria-hidden>
        {habit.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[15px] font-medium ${done ? "text-ink-3" : ""}`}>{habit.name}</p>
        <p className="text-[12px] text-ink-3">
          {done ? (
            <span style={{ color: area.ink }}>Luat la {habit.loggedAt}</span>
          ) : overdue ? (
            <span className="text-danger">Întârziat</span>
          ) : habit.weekly ? (
            <span className="tabular">{habit.weekly.done} din {habit.weekly.target} săptămâna asta</span>
          ) : (
            habit.detail
          )}
          {habit.streak >= 3 && (
            <span className="ml-2 inline-flex items-center gap-0.5 text-fitness">
              <Flame size={11} strokeWidth={2.6} />
              <span className="tabular">{habit.streak}</span>
            </span>
          )}
        </p>
      </div>
      <CheckCircle checked={done} color={area.color} onToggle={toggle} label={habit.name} />
    </div>
  );
}

function QuantityRow({ habit, onAdd }: { habit: MockHabit; onAdd: (id: string) => void }) {
  const area = AREAS[habit.area];
  const g = habit.goal!;
  const pct = Math.min(g.value / g.target, 1);
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl text-[18px]" style={{ background: area.soft }} aria-hidden>
        {habit.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between">
          <p className="text-[15px] font-medium">{habit.name}</p>
          <span className="tabular text-[13px] text-ink-2">
            {g.value.toLocaleString("ro-RO")} / {g.target.toLocaleString("ro-RO")} {g.unit}
          </span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full" style={{ background: area.soft }}>
          <div className="h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${pct * 100}%`, background: area.color }} />
        </div>
      </div>
      <button
        onClick={() => onAdd(habit.id)}
        aria-label={`Adaugă 0,25 ${g.unit} la ${habit.name}`}
        className="grid size-9 shrink-0 place-items-center rounded-full transition active:scale-90"
        style={{ background: area.soft, color: area.ink }}
      >
        <Plus size={18} strokeWidth={2.4} />
      </button>
    </div>
  );
}
