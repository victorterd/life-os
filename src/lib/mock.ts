// Date de exemplu pentru machetă. Vor fi înlocuite cu date din Supabase.
import type { AreaKey } from "./areas";

export type MockHabit = {
  id: string;
  name: string;
  emoji: string;
  area: AreaKey;
  time?: string; // ora programată
  detail?: string;
  loggedAt?: string; // ora la care a fost bifat
  goal?: { value: number; target: number; unit: string };
  weekly?: { done: number; target: number };
  streak: number;
  xp: number;
};

export const MOCK_HABITS: MockHabit[] = [
  { id: "h1", name: "Vitamina D3 + K2", emoji: "💊", area: "health", time: "08:00", detail: "1 capsulă", loggedAt: "08:12", streak: 23, xp: 10 },
  { id: "h2", name: "Omega 3", emoji: "🐟", area: "health", time: "08:00", detail: "2 capsule", loggedAt: "08:12", streak: 23, xp: 10 },
  { id: "h3", name: "Apă", emoji: "💧", area: "health", goal: { value: 1.5, target: 2.5, unit: "L" }, streak: 9, xp: 10 },
  { id: "h4", name: "Sală", emoji: "🏋️", area: "fitness", time: "18:30", weekly: { done: 2, target: 4 }, streak: 6, xp: 40 },
  { id: "h5", name: "Magneziu", emoji: "🌙", area: "health", time: "22:00", detail: "1 pastilă", streak: 23, xp: 10 },
  { id: "h6", name: "Meditație", emoji: "🧘", area: "mind", time: "22:15", detail: "10 min", streak: 3, xp: 15 },
];

// Zilele săptămânii curente: true = zi „completă” (toate obiceiurile bifate)
export const MOCK_WEEK = [true, true, true, true, false, false, false];

export const MOCK_NEXT_WORKOUT = {
  name: "Push",
  exercises: ["Împins la piept", "Presă umeri", "Fluturări", "Triceps la helcometru"],
  last: { date: "joi", volume: 8420, pr: "Împins la piept 82.5 kg × 6" },
};
