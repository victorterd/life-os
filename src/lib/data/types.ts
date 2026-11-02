import type { AreaKey } from "../areas";

export type Horizon = "month" | "week" | "day";
export type Priority = "low" | "medium" | "high";

export type Recurrence = {
  freq: "daily" | "weekdays" | "weekly" | "monthly";
  interval?: number;
};

export type Task = {
  id: string;
  title: string;
  notes: string | null;
  area: AreaKey;
  priority: Priority;
  project_id: string | null;
  parent_id: string | null;
  horizon: Horizon;
  period: string | null;
  start_time: string | null;
  duration_min: number | null;
  recurrence: Recurrence | null;
  done: boolean;
  done_at: string | null;
  sort_order: number;
  created_at: string;
};

export type Subtask = {
  id: string;
  task_id: string;
  title: string;
  done: boolean;
  sort_order: number;
};

export type Project = {
  id: string;
  name: string;
  area: AreaKey;
  color: string | null;
  archived: boolean;
};

export type XpEvent = {
  id: string;
  area: AreaKey;
  amount: number;
  source: string;
  source_id: string;
  created_at: string;
};

export const TASK_XP: Record<Horizon, Record<Priority, number>> = {
  day: { low: 10, medium: 20, high: 30 },
  week: { low: 25, medium: 40, high: 60 },
  month: { low: 80, medium: 120, high: 160 },
};
