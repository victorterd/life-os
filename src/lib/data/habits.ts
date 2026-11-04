import type { AreaKey } from "../areas";
import { addDays, isoWeekday, weekStart } from "../dates";

export type HabitKind = "scheduled" | "weekly" | "quantity";

export type Habit = {
  id: string;
  name: string;
  emoji: string | null;
  area: AreaKey;
  kind: HabitKind;
  times: string[]; // "08:00:00"
  days_of_week: number[]; // 1 = luni … 7 = duminică
  weekly_target: number | null;
  target_value: number | null;
  unit: string | null;
  step_value: number | null;
  detail: string | null;
  notify: boolean;
  xp: number;
  archived: boolean;
  sort_order: number;
  created_at: string;
};

export type HabitLog = {
  id: string;
  habit_id: string;
  date: string;
  slot: string | null;
  logged_at: string;
  value: number | null;
  note: string | null;
};

export const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];
export const DAY_SHORT = ["L", "Ma", "Mi", "J", "V", "S", "D"];

export const hhmm = (t: string) => t.slice(0, 5);

/** Are obiceiul ceva de făcut în ziua asta? */
export function isDueOn(h: Habit, date: string): boolean {
  if (h.archived) return false;
  if (h.created_at.slice(0, 10) > date) return false;
  if (h.kind === "weekly") return true; // oricând în săptămână
  return h.days_of_week.includes(isoWeekday(date));
}

export function logsOn(logs: HabitLog[], habitId: string, date: string) {
  return logs.filter((l) => l.habit_id === habitId && l.date === date);
}

export function quantityOn(logs: HabitLog[], habitId: string, date: string) {
  const sum = logsOn(logs, habitId, date).reduce((s, l) => s + (Number(l.value) || 0), 0);
  return Math.round(sum * 1e6) / 1e6;
}

export function weekCount(logs: HabitLog[], habitId: string, date: string) {
  const start = weekStart(date);
  const end = addDays(start, 6);
  return new Set(logs.filter((l) => l.habit_id === habitId && l.date >= start && l.date <= end).map((l) => l.date)).size;
}

/** Progresul unei zile: câte „bucăți” sunt gata din câte. */
export function dayProgress(h: Habit, logs: HabitLog[], date: string): { done: number; total: number; complete: boolean } {
  if (h.kind === "scheduled") {
    const slots = h.times.length || 1;
    const day = logsOn(logs, h.id, date);
    const done = h.times.length ? h.times.filter((t) => day.some((l) => l.slot === t)).length : Math.min(day.length, 1);
    return { done, total: slots, complete: done >= slots };
  }
  if (h.kind === "quantity") {
    const v = quantityOn(logs, h.id, date);
    const target = Number(h.target_value) || 1;
    return { done: v, total: target, complete: v >= target };
  }
  const done = logsOn(logs, h.id, date).length > 0;
  return { done: done ? 1 : 0, total: 1, complete: done };
}

/** Zilele (sau săptămânile, pentru „weekly”) consecutive în care obiceiul a fost respectat. */
export function streak(h: Habit, logs: HabitLog[], today: string): number {
  if (h.kind === "weekly") {
    const target = h.weekly_target ?? 1;
    let n = 0;
    let w = weekStart(today);
    // săptămâna curentă contează doar dacă e deja atinsă ținta
    if (weekCount(logs, h.id, w) >= target) n++;
    w = addDays(w, -7);
    while (weekCount(logs, h.id, w) >= target) {
      n++;
      w = addDays(w, -7);
    }
    return n;
  }
  let n = 0;
  let d = today;
  // azi nu rupe streak-ul dacă încă nu e gata
  if (isDueOn(h, d) && dayProgress(h, logs, d).complete) n++;
  d = addDays(d, -1);
  for (let i = 0; i < 400; i++) {
    if (h.created_at.slice(0, 10) > d) break;
    if (isDueOn(h, d)) {
      if (!dayProgress(h, logs, d).complete) break;
      n++;
    }
    d = addDays(d, -1);
  }
  return n;
}

/** O zi e „completă” dacă toate obiceiurile datorate în ea sunt gata (cele săptămânale nu contează pe zi). */
export function dayComplete(habits: Habit[], logs: HabitLog[], date: string): boolean | null {
  const due = habits.filter((h) => h.kind !== "weekly" && isDueOn(h, date));
  if (!due.length) return null;
  return due.every((h) => dayProgress(h, logs, date).complete);
}

export function dayStreak(habits: Habit[], logs: HabitLog[], today: string): number {
  let n = dayComplete(habits, logs, today) ? 1 : 0;
  let d = addDays(today, -1);
  for (let i = 0; i < 400; i++) {
    const c = dayComplete(habits, logs, d);
    if (c === false) break;
    if (c === true) n++;
    if (c === null && !habits.some((h) => h.created_at.slice(0, 10) <= d)) break;
    d = addDays(d, -1);
  }
  return n;
}

export function describeHabit(h: Habit): string {
  if (h.kind === "weekly") return `De ${h.weekly_target ?? 1} ori pe săptămână`;
  if (h.kind === "quantity") return `${fmtNum(Number(h.target_value) || 0)} ${h.unit ?? ""} pe zi`.trim();
  const days =
    h.days_of_week.length === 7
      ? "Zilnic"
      : h.days_of_week.length === 5 && [1, 2, 3, 4, 5].every((d) => h.days_of_week.includes(d))
        ? "Luni – vineri"
        : h.days_of_week.map((d) => DAY_SHORT[d - 1]).join(", ");
  return h.times.length ? `${days} la ${h.times.map(hhmm).join(", ")}` : days;
}

export function fmtNum(n: number) {
  return n.toLocaleString("ro-RO", { maximumFractionDigits: 2 });
}

export function localTime(ts: string) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
