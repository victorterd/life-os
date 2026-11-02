import { addDays, toISO } from "../dates";
import { dayComplete, dayProgress, isDueOn, streak, type Habit, type HabitLog } from "./habits";
import type { Ritual } from "./store";
import type { Task, XpEvent } from "./types";
import { e1rm, type Workout, type WorkoutSet } from "./gym";
import type { Entry, Mood, ReframeItem } from "./journal";
import { AREAS, levelFromXp, type AreaKey } from "../areas";

export const LEVEL_TITLES: [number, string][] = [
  [50, "Legendă"],
  [35, "Maestru"],
  [25, "Neclintit"],
  [18, "Constant"],
  [12, "Disciplinat"],
  [7, "Pe drumul cel bun"],
  [3, "Ucenic"],
  [1, "Începător"],
];

export function levelTitle(level: number) {
  return LEVEL_TITLES.find(([l]) => level >= l)![1];
}

export type Achievement = { key: string; emoji: string; title: string; text: string; progress: number; target: number };

export type Data = {
  tasks: Task[];
  habits: Habit[];
  habitLogs: HabitLog[];
  rituals: Ritual[];
  xpEvents: XpEvent[];
  workouts: Workout[];
  sets: WorkoutSet[];
  moods: Mood[];
  entries: Entry[];
  items: ReframeItem[];
  today: string;
};

/** Cel mai lung șir de zile cu toate obiceiurile bifate, din ultimele 400 de zile. */
export function longestDayStreak(habits: Habit[], logs: HabitLog[], today: string) {
  let best = 0;
  let cur = 0;
  for (let i = 400; i >= 0; i--) {
    const c = dayComplete(habits, logs, addDays(today, -i));
    if (c === true) best = Math.max(best, ++cur);
    else if (c === false) cur = 0;
  }
  return best;
}

export function computeAchievements(d: Data): Achievement[] {
  const tasksDone = d.tasks.filter((t) => t.done).length;
  const doneWorkouts = d.workouts.filter((w) => w.ended_at);
  const plannedDays = d.rituals.filter((r) => r.kind === "plan_day").length;
  const reviews = d.rituals.filter((r) => r.kind === "review_day").length;
  const weeks = d.rituals.filter((r) => r.kind === "plan_week").length;
  const longest = longestDayStreak(d.habits, d.habitLogs, d.today);
  const volume = d.sets.filter((s) => s.done).reduce((v, s) => v + (Number(s.weight_kg) || 0) * (Number(s.reps) || 0), 0);
  const reframed = d.items.filter((x) => x.positive?.trim()).length;
  const bestHabitStreak = Math.max(0, ...d.habits.filter((h) => h.kind === "scheduled").map((h) => streak(h, d.habitLogs, d.today)));

  // recorduri personale: seturi care au depășit tot ce era înainte la acel exercițiu
  const wDate = new Map(d.workouts.map((w) => [w.id, w.started_at]));
  const sorted = d.sets.filter((s) => s.done && s.weight_kg && s.reps).sort((a, b) => (wDate.get(a.workout_id) ?? "").localeCompare(wDate.get(b.workout_id) ?? ""));
  const best = new Map<string, number>();
  let prs = 0;
  for (const s of sorted) {
    const v = e1rm(Number(s.weight_kg), Number(s.reps));
    const prev = best.get(s.exercise_id);
    if (prev !== undefined && v > prev) prs++;
    if (prev === undefined || v > prev) best.set(s.exercise_id, v);
  }

  // cantitate atinsă 7 zile la rând (apă, pași…)
  const quantity7 = d.habits
    .filter((h) => h.kind === "quantity")
    .map((h) => {
      let n = 0;
      let x = d.today;
      if (dayProgress(h, d.habitLogs, x).complete) n++;
      x = addDays(x, -1);
      while (isDueOn(h, x) && dayProgress(h, d.habitLogs, x).complete) {
        n++;
        x = addDays(x, -1);
      }
      return n;
    });

  const checkins = d.moods.length;
  const total = d.xpEvents.reduce((s, e) => s + e.amount, 0);
  const level = levelFromXp(total).level;
  const byArea = Object.fromEntries(Object.keys(AREAS).map((k) => [k, 0])) as Record<AreaKey, number>;
  for (const e of d.xpEvents) byArea[e.area] += e.amount;
  const minAreaLevel = Math.min(...Object.values(byArea).map((x) => levelFromXp(x).level));
  const earlyBird = d.tasks.filter((t) => t.done && t.done_at && new Date(t.done_at).getHours() < 9).length;
  const daysActive = new Set(d.xpEvents.map((e) => toISO(new Date(e.created_at)))).size;

  return [
    { key: "first_task", emoji: "✅", title: "Primul pas", text: "Bifează primul task", progress: tasksDone, target: 1 },
    { key: "tasks_50", emoji: "🧱", title: "Constructor", text: "50 de taskuri terminate", progress: tasksDone, target: 50 },
    { key: "tasks_250", emoji: "🏗️", title: "Arhitect", text: "250 de taskuri terminate", progress: tasksDone, target: 250 },
    { key: "early", emoji: "🌅", title: "Pasăre matinală", text: "10 taskuri terminate înainte de 9:00", progress: earlyBird, target: 10 },
    { key: "plan_7", emoji: "☀️", title: "Planificator", text: "Planifică-ți ziua de 7 ori", progress: plannedDays, target: 7 },
    { key: "review_14", emoji: "🌙", title: "Reflexiv", text: "14 review-uri de seară", progress: reviews, target: 14 },
    { key: "week_4", emoji: "🗓️", title: "Strateg", text: "Planifică 4 săptămâni", progress: weeks, target: 4 },
    { key: "streak_7", emoji: "🔥", title: "O săptămână perfectă", text: "7 zile la rând cu toate obiceiurile", progress: longest, target: 7 },
    { key: "streak_30", emoji: "☄️", title: "De neoprit", text: "30 de zile la rând cu toate obiceiurile", progress: longest, target: 30 },
    { key: "meds_30", emoji: "💊", title: "Tratament fidel", text: "30 de zile la rând fără să ratezi un tratament", progress: bestHabitStreak, target: 30 },
    { key: "hydrated", emoji: "💧", title: "Bine hidratat", text: "Ținta zilnică atinsă 7 zile la rând", progress: Math.max(0, ...quantity7), target: 7 },
    { key: "gym_1", emoji: "🏋️", title: "Prima sesiune", text: "Termină primul antrenament", progress: doneWorkouts.length, target: 1 },
    { key: "gym_25", emoji: "💪", title: "Obișnuit al sălii", text: "25 de antrenamente", progress: doneWorkouts.length, target: 25 },
    { key: "gym_100", emoji: "🦾", title: "Sută", text: "100 de antrenamente", progress: doneWorkouts.length, target: 100 },
    { key: "pr_10", emoji: "🏆", title: "Spărgător de recorduri", text: "10 recorduri personale", progress: prs, target: 10 },
    { key: "tonnes", emoji: "🪨", title: "100 de tone", text: "100.000 kg ridicate în total", progress: Math.round(volume), target: 100_000 },
    { key: "checkin_30", emoji: "🙂", title: "Conștient", text: "30 de check-in-uri de stare", progress: checkins, target: 30 },
    { key: "journal_10", emoji: "📓", title: "Scriitor", text: "10 însemnări în jurnal", progress: d.entries.length, target: 10 },
    { key: "reframe_25", emoji: "🌗", title: "Alt unghi", text: "25 de gânduri reformulate pozitiv", progress: reframed, target: 25 },
    { key: "balance", emoji: "⚖️", title: "Echilibru", text: "Toate cele 5 arii la nivelul 3", progress: minAreaLevel, target: 3 },
    { key: "level_10", emoji: "⭐", title: "Nivelul 10", text: "Ajungi la nivelul 10", progress: level, target: 10 },
    { key: "active_100", emoji: "📅", title: "100 de zile", text: "100 de zile în care ai câștigat XP", progress: daysActive, target: 100 },
  ];
}
