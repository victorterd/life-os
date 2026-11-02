"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabase";
import { AREAS, levelFromXp, type AreaKey } from "../areas";
import { addDays, addMonths, isoWeekday, monthStart, todayISO, weekStart } from "../dates";
import { TASK_XP, type Project, type Recurrence, type Subtask, type Task, type XpEvent } from "./types";

type NewTask = Partial<Omit<Task, "id" | "created_at">> & { title: string };

type Store = {
  session: Session | null;
  authReady: boolean;
  loading: boolean;
  error: string | null;

  tasks: Task[];
  subtasks: Subtask[];
  projects: Project[];
  xpEvents: XpEvent[];

  xp: {
    total: number;
    today: number;
    byArea: Record<AreaKey, number>;
    level: ReturnType<typeof levelFromXp>;
  };

  addTask: (t: NewTask, subtasks?: string[]) => Promise<Task | null>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  addSubtask: (taskId: string, title: string) => Promise<void>;
  toggleSubtask: (id: string) => Promise<void>;
  deleteSubtask: (id: string) => Promise<void>;

  addProject: (name: string, area: AreaKey) => Promise<Project | null>;

  signOut: () => Promise<void>;
};

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside <StoreProvider>");
  return s;
}

/** Următoarea apariție a unui task recurent, după `from`. */
export function nextOccurrence(r: Recurrence, from: string): string {
  const n = r.interval ?? 1;
  switch (r.freq) {
    case "daily":
      return addDays(from, n);
    case "weekdays": {
      let d = addDays(from, 1);
      while (isoWeekday(d) > 5) d = addDays(d, 1);
      return d;
    }
    case "weekly":
      return addDays(from, 7 * n);
    case "monthly": {
      const day = Number(from.slice(8, 10));
      const target = addMonths(from, n);
      const lastDay = new Date(Number(target.slice(0, 4)), Number(target.slice(5, 7)), 0).getDate();
      return `${target.slice(0, 8)}${String(Math.min(day, lastDay)).padStart(2, "0")}`;
    }
  }
}

function fail(e: { message: string } | null, set: (m: string) => void) {
  if (e) {
    console.error(e);
    set(e.message);
    return true;
  }
  return false;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [xpEvents, setXpEvents] = useState<XpEvent[]>([]);

  // ---------- Auth ----------
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;

  // ---------- Încărcare date ----------
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      // Taskuri nefăcute + tot ce ține de ultimele ~3 luni
      const since = addMonths(monthStart(todayISO()), -2);
      const [t, s, p, x] = await Promise.all([
        supabase.from("tasks").select("*").or(`done.eq.false,period.gte.${since},period.is.null`).order("sort_order").order("created_at"),
        supabase.from("subtasks").select("*").order("sort_order"),
        supabase.from("projects").select("*").eq("archived", false).order("created_at"),
        supabase.from("xp_events").select("id,area,amount,source,source_id,created_at"),
      ]);
      if (cancelled) return;
      for (const r of [t, s, p, x]) if (fail(r.error, setError)) break;
      setTasks((t.data as Task[]) ?? []);
      setSubtasks((s.data as Subtask[]) ?? []);
      setProjects((p.data as Project[]) ?? []);
      setXpEvents((x.data as XpEvent[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // ---------- XP ----------
  const grantXp = useCallback(async (area: AreaKey, amount: number, source: string, sourceId: string) => {
    const temp: XpEvent = { id: `tmp-${sourceId}`, area, amount, source, source_id: sourceId, created_at: new Date().toISOString() };
    setXpEvents((xs) => [...xs.filter((e) => !(e.source === source && e.source_id === sourceId)), temp]);
    const { data, error } = await supabase
      .from("xp_events")
      .upsert({ area, amount, source, source_id: sourceId }, { onConflict: "source,source_id" })
      .select("id,area,amount,source,source_id,created_at")
      .single();
    if (fail(error, setError)) return;
    setXpEvents((xs) => xs.map((e) => (e.id === temp.id ? (data as XpEvent) : e)));
  }, []);

  const revokeXp = useCallback(async (source: string, sourceId: string) => {
    setXpEvents((xs) => xs.filter((e) => !(e.source === source && e.source_id === sourceId)));
    const { error } = await supabase.from("xp_events").delete().eq("source", source).eq("source_id", sourceId);
    fail(error, setError);
  }, []);

  // ---------- Taskuri ----------
  const addTask = useCallback<Store["addTask"]>(async (input, subtaskTitles = []) => {
    const { data, error } = await supabase.from("tasks").insert(input).select("*").single();
    if (fail(error, setError)) return null;
    const task = data as Task;
    setTasks((ts) => [...ts, task]);
    if (subtaskTitles.length) {
      const rows = subtaskTitles.map((title, i) => ({ task_id: task.id, title, sort_order: i }));
      const res = await supabase.from("subtasks").insert(rows).select("*");
      if (!fail(res.error, setError)) setSubtasks((ss) => [...ss, ...((res.data as Subtask[]) ?? [])]);
    }
    return task;
  }, []);

  const updateTask = useCallback<Store["updateTask"]>(async (id, patch) => {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    const { error } = await supabase.from("tasks").update(patch).eq("id", id);
    fail(error, setError);
  }, []);

  const toggleTask = useCallback<Store["toggleTask"]>(
    async (id) => {
      const t = tasks.find((x) => x.id === id);
      if (!t) return;
      const done = !t.done;
      await updateTask(id, { done, done_at: done ? new Date().toISOString() : null });

      if (done) {
        await grantXp(t.area, TASK_XP[t.horizon][t.priority], "task", t.id);
        // Recurență: creează următoarea apariție (o singură dată)
        if (t.recurrence && t.period) {
          const next = nextOccurrence(t.recurrence, t.period);
          const exists = tasks.some((x) => x.title === t.title && x.period === next && x.recurrence);
          if (!exists) {
            const rest = {
              title: t.title, notes: t.notes, area: t.area, priority: t.priority, project_id: t.project_id,
              parent_id: t.parent_id, horizon: t.horizon, start_time: t.start_time, duration_min: t.duration_min,
              recurrence: t.recurrence, sort_order: t.sort_order,
            };
            const nextPeriod = t.horizon === "week" ? weekStart(next) : t.horizon === "month" ? monthStart(next) : next;
            const created = await addTask({ ...rest, period: nextPeriod });
            const subs = subtasks.filter((s) => s.task_id === t.id);
            if (created && subs.length) {
              const res = await supabase
                .from("subtasks")
                .insert(subs.map((s) => ({ task_id: created.id, title: s.title, sort_order: s.sort_order })))
                .select("*");
              if (!fail(res.error, setError)) setSubtasks((ss) => [...ss, ...((res.data as Subtask[]) ?? [])]);
            }
          }
        }
      } else {
        await revokeXp("task", t.id);
      }
    },
    [tasks, subtasks, updateTask, grantXp, revokeXp, addTask],
  );

  const deleteTask = useCallback<Store["deleteTask"]>(
    async (id) => {
      setTasks((ts) => ts.filter((t) => t.id !== id).map((t) => (t.parent_id === id ? { ...t, parent_id: null } : t)));
      setSubtasks((ss) => ss.filter((s) => s.task_id !== id));
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      fail(error, setError);
      await revokeXp("task", id);
    },
    [revokeXp],
  );

  // ---------- Subtaskuri ----------
  const addSubtask = useCallback<Store["addSubtask"]>(
    async (taskId, title) => {
      const order = subtasks.filter((s) => s.task_id === taskId).length;
      const { data, error } = await supabase.from("subtasks").insert({ task_id: taskId, title, sort_order: order }).select("*").single();
      if (!fail(error, setError)) setSubtasks((ss) => [...ss, data as Subtask]);
    },
    [subtasks],
  );

  const toggleSubtask = useCallback<Store["toggleSubtask"]>(
    async (id) => {
      const s = subtasks.find((x) => x.id === id);
      if (!s) return;
      setSubtasks((ss) => ss.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
      const { error } = await supabase.from("subtasks").update({ done: !s.done }).eq("id", id);
      fail(error, setError);
    },
    [subtasks],
  );

  const deleteSubtask = useCallback<Store["deleteSubtask"]>(async (id) => {
    setSubtasks((ss) => ss.filter((x) => x.id !== id));
    const { error } = await supabase.from("subtasks").delete().eq("id", id);
    fail(error, setError);
  }, []);

  // ---------- Proiecte ----------
  const addProject = useCallback<Store["addProject"]>(async (name, area) => {
    const { data, error } = await supabase.from("projects").insert({ name, area }).select("*").single();
    if (fail(error, setError)) return null;
    setProjects((ps) => [...ps, data as Project]);
    return data as Project;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setTasks([]);
    setSubtasks([]);
    setProjects([]);
    setXpEvents([]);
  }, []);

  // ---------- XP derivat ----------
  const xp = useMemo(() => {
    const byArea = Object.fromEntries(Object.keys(AREAS).map((k) => [k, 0])) as Record<AreaKey, number>;
    let total = 0;
    let today = 0;
    // Fără evenimente nu citim ora (altfel Next.js se plânge la pre-randare)
    const t = xpEvents.length ? todayISO() : "";
    for (const e of xpEvents) {
      byArea[e.area] += e.amount;
      total += e.amount;
      if (e.created_at && toLocalISO(e.created_at) === t) today += e.amount;
    }
    return { total, today, byArea, level: levelFromXp(total) };
  }, [xpEvents]);

  const value: Store = {
    session,
    authReady,
    loading,
    error,
    tasks,
    subtasks,
    projects,
    xpEvents,
    xp,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    addProject,
    signOut,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function toLocalISO(ts: string): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
