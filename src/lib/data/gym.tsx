"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import { addDays, todayISO } from "../dates";
import { useStore } from "./store";
import { fetchAll } from "./fetchAll";

export type Exercise = { id: string; name: string; muscle_group: string | null; equipment: string | null; archived: boolean };
export type Template = { id: string; name: string; color: string | null; sort_order: number; archived: boolean };
export type TemplateExercise = {
  id: string;
  template_id: string;
  exercise_id: string;
  target_sets: number;
  target_reps: string | null;
  rest_sec: number;
  sort_order: number;
};
export type Workout = { id: string; template_id: string | null; name: string; started_at: string; ended_at: string | null; notes: string | null };
export type WorkoutSet = {
  id: string;
  workout_id: string;
  exercise_id: string;
  set_index: number;
  weight_kg: number | null;
  reps: number | null;
  done: boolean;
  done_at: string | null;
};

export const MUSCLES = ["Piept", "Spate", "Umeri", "Biceps", "Triceps", "Picioare", "Fesieri", "Abdomen", "Cardio"];

const STARTER: { name: string; muscle_group: string; equipment: string }[] = [
  { name: "Împins la piept cu bara", muscle_group: "Piept", equipment: "Bară" },
  { name: "Împins înclinat cu gantere", muscle_group: "Piept", equipment: "Gantere" },
  { name: "Fluturări la aparat", muscle_group: "Piept", equipment: "Aparat" },
  { name: "Presă umeri cu gantere", muscle_group: "Umeri", equipment: "Gantere" },
  { name: "Ridicări laterale", muscle_group: "Umeri", equipment: "Gantere" },
  { name: "Face pull", muscle_group: "Umeri", equipment: "Helcometru" },
  { name: "Extensii triceps la helcometru", muscle_group: "Triceps", equipment: "Helcometru" },
  { name: "Flotări la paralele", muscle_group: "Triceps", equipment: "Greutatea corpului" },
  { name: "Tracțiuni", muscle_group: "Spate", equipment: "Greutatea corpului" },
  { name: "Ramat cu bara", muscle_group: "Spate", equipment: "Bară" },
  { name: "Ramat la helcometru", muscle_group: "Spate", equipment: "Helcometru" },
  { name: "Lat pulldown", muscle_group: "Spate", equipment: "Aparat" },
  { name: "Flexii biceps cu bara", muscle_group: "Biceps", equipment: "Bară" },
  { name: "Flexii ciocan", muscle_group: "Biceps", equipment: "Gantere" },
  { name: "Genuflexiuni", muscle_group: "Picioare", equipment: "Bară" },
  { name: "Îndreptări românești", muscle_group: "Fesieri", equipment: "Bară" },
  { name: "Presă picioare", muscle_group: "Picioare", equipment: "Aparat" },
  { name: "Fandări", muscle_group: "Picioare", equipment: "Gantere" },
  { name: "Extensii cvadriceps", muscle_group: "Picioare", equipment: "Aparat" },
  { name: "Flexii femurali", muscle_group: "Picioare", equipment: "Aparat" },
  { name: "Ridicări pe vârfuri", muscle_group: "Picioare", equipment: "Aparat" },
  { name: "Plank", muscle_group: "Abdomen", equipment: "Greutatea corpului" },
  { name: "Abdomene la helcometru", muscle_group: "Abdomen", equipment: "Helcometru" },
];

const STARTER_TEMPLATES: { name: string; color: string; exercises: string[] }[] = [
  { name: "Push", color: "#ff7a45", exercises: ["Împins la piept cu bara", "Împins înclinat cu gantere", "Presă umeri cu gantere", "Ridicări laterale", "Extensii triceps la helcometru"] },
  { name: "Pull", color: "#2e7cf6", exercises: ["Tracțiuni", "Ramat cu bara", "Lat pulldown", "Face pull", "Flexii biceps cu bara", "Flexii ciocan"] },
  { name: "Legs", color: "#22b07d", exercises: ["Genuflexiuni", "Îndreptări românești", "Presă picioare", "Flexii femurali", "Ridicări pe vârfuri"] },
];

export const WORKOUT_XP = (setsDone: number) => 40 + Math.min(60, setsDone * 2);

/** Estimare 1RM (Epley). */
export const e1rm = (w: number, r: number) => (r <= 1 ? w : w * (1 + r / 30));

type Gym = {
  ready: boolean;
  exercises: Exercise[];
  templates: Template[];
  templateExercises: TemplateExercise[];
  workouts: Workout[];
  sets: WorkoutSet[];
  active: Workout | null;

  seedStarter: () => Promise<void>;
  addExercise: (e: { name: string; muscle_group?: string | null; equipment?: string | null }) => Promise<Exercise | null>;
  saveTemplate: (t: { id?: string; name: string; color?: string | null }, items: { exercise_id: string; target_sets: number; target_reps: string | null; rest_sec: number }[]) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;

  startWorkout: (template: Template | null) => Promise<Workout | null>;
  addSet: (workoutId: string, exerciseId: string, prefill?: { weight_kg: number | null; reps: number | null }) => Promise<void>;
  updateSet: (id: string, patch: Partial<Pick<WorkoutSet, "weight_kg" | "reps" | "done" | "done_at">>) => Promise<void>;
  deleteSet: (id: string) => Promise<void>;
  removeExerciseFromWorkout: (workoutId: string, exerciseId: string) => Promise<void>;
  finishWorkout: (id: string, notes?: string | null) => Promise<void>;
  discardWorkout: (id: string) => Promise<void>;
  deleteWorkout: (id: string) => Promise<void>;

  lastPerformance: (exerciseId: string, beforeWorkoutId?: string) => WorkoutSet[];
  bestE1rm: (exerciseId: string, beforeDate?: string) => number;
};

const Ctx = createContext<Gym | null>(null);
export function useGym() {
  const g = useContext(Ctx);
  if (!g) throw new Error("useGym must be used inside <GymProvider>");
  return g;
}

export function GymProvider({ children }: { children: React.ReactNode }) {
  const { session, grantXp, revokeXp, habits, habitLogs, logHabit } = useStore();
  const userId = session?.user.id ?? null;
  const [ready, setReady] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateExercises, setTemplateExercises] = useState<TemplateExercise[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [sets, setSets] = useState<WorkoutSet[]>([]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const since = new Date(Date.now() - 730 * 86_400_000).toISOString();
      const [e, t, te, w] = await Promise.all([
        supabase.from("exercises").select("*").eq("archived", false).order("name"),
        supabase.from("workout_templates").select("*").eq("archived", false).order("sort_order").order("created_at"),
        supabase.from("template_exercises").select("*").order("sort_order"),
        fetchAll<Workout>((a, b) => supabase.from("workouts").select("*").gte("started_at", since).order("started_at").range(a, b)),
      ]);
      const ids = (w.data ?? []).map((x) => x.id);
      const s = ids.length
        ? await fetchAll<WorkoutSet>((a, b) => supabase.from("workout_sets").select("*").gte("created_at", since).order("created_at").order("set_index").range(a, b))
        : { data: [] as WorkoutSet[], error: null };
      if (cancelled) return;
      setExercises((e.data as Exercise[]) ?? []);
      setTemplates((t.data as Template[]) ?? []);
      setTemplateExercises((te.data as TemplateExercise[]) ?? []);
      setWorkouts(w.data);
      setSets(s.data);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const active = useMemo(() => workouts.find((w) => !w.ended_at) ?? null, [workouts]);

  const seedStarter = useCallback(async () => {
    const { data: ex } = await supabase.from("exercises").insert(STARTER).select("*");
    const all = (ex as Exercise[]) ?? [];
    setExercises((xs) => [...xs, ...all].sort((a, b) => a.name.localeCompare(b.name, "ro")));
    for (const [i, t] of STARTER_TEMPLATES.entries()) {
      const { data: tpl } = await supabase.from("workout_templates").insert({ name: t.name, color: t.color, sort_order: i }).select("*").single();
      if (!tpl) continue;
      const rows = t.exercises
        .map((name, j) => ({ template_id: tpl.id, exercise_id: all.find((x) => x.name === name)?.id, target_sets: 3, target_reps: "8-12", rest_sec: 90, sort_order: j }))
        .filter((r) => r.exercise_id);
      const { data: te } = await supabase.from("template_exercises").insert(rows).select("*");
      setTemplates((ts) => [...ts, tpl as Template]);
      setTemplateExercises((xs) => [...xs, ...((te as TemplateExercise[]) ?? [])]);
    }
  }, []);

  const addExercise = useCallback<Gym["addExercise"]>(async (e) => {
    const { data } = await supabase.from("exercises").insert(e).select("*").single();
    if (!data) return null;
    setExercises((xs) => [...xs, data as Exercise].sort((a, b) => a.name.localeCompare(b.name, "ro")));
    return data as Exercise;
  }, []);

  const saveTemplate = useCallback<Gym["saveTemplate"]>(
    async (t, items) => {
      let tpl: Template | null = null;
      if (t.id) {
        const { data } = await supabase.from("workout_templates").update({ name: t.name, color: t.color ?? null }).eq("id", t.id).select("*").single();
        tpl = data as Template;
        await supabase.from("template_exercises").delete().eq("template_id", t.id);
      } else {
        const { data } = await supabase
          .from("workout_templates")
          .insert({ name: t.name, color: t.color ?? null, sort_order: templates.length })
          .select("*")
          .single();
        tpl = data as Template;
      }
      if (!tpl) return;
      const { data: te } = items.length
        ? await supabase.from("template_exercises").insert(items.map((it, i) => ({ ...it, template_id: tpl!.id, sort_order: i }))).select("*")
        : { data: [] };
      setTemplates((ts) => [...ts.filter((x) => x.id !== tpl!.id), tpl!].sort((a, b) => a.sort_order - b.sort_order));
      setTemplateExercises((xs) => [...xs.filter((x) => x.template_id !== tpl!.id), ...((te as TemplateExercise[]) ?? [])]);
    },
    [templates.length],
  );

  const deleteTemplate = useCallback<Gym["deleteTemplate"]>(async (id) => {
    setTemplates((ts) => ts.filter((t) => t.id !== id));
    await supabase.from("workout_templates").update({ archived: true }).eq("id", id);
  }, []);

  const lastPerformance = useCallback<Gym["lastPerformance"]>(
    (exerciseId, beforeWorkoutId) => {
      const done = sets.filter((s) => s.exercise_id === exerciseId && s.done && s.workout_id !== beforeWorkoutId);
      if (!done.length) return [];
      const byWorkout = new Map<string, WorkoutSet[]>();
      for (const s of done) byWorkout.set(s.workout_id, [...(byWorkout.get(s.workout_id) ?? []), s]);
      const latest = workouts.filter((w) => byWorkout.has(w.id)).sort((a, b) => b.started_at.localeCompare(a.started_at))[0];
      return latest ? byWorkout.get(latest.id)!.sort((a, b) => a.set_index - b.set_index) : [];
    },
    [sets, workouts],
  );

  const bestE1rm = useCallback<Gym["bestE1rm"]>(
    (exerciseId, beforeDate) => {
      const allowed = beforeDate ? new Set(workouts.filter((w) => w.started_at < beforeDate).map((w) => w.id)) : null;
      return sets
        .filter((s) => s.exercise_id === exerciseId && s.done && s.weight_kg && s.reps && (!allowed || allowed.has(s.workout_id)))
        .reduce((m, s) => Math.max(m, e1rm(Number(s.weight_kg), Number(s.reps))), 0);
    },
    [sets, workouts],
  );

  const startWorkout = useCallback<Gym["startWorkout"]>(
    async (template) => {
      const { data, error } = await supabase
        .from("workouts")
        .insert({ template_id: template?.id ?? null, name: template?.name ?? "Antrenament liber" })
        .select("*")
        .single();
      if (error || !data) return null;
      const w = data as Workout;
      setWorkouts((ws) => [...ws, w]);
      if (template) {
        const items = templateExercises.filter((x) => x.template_id === template.id).sort((a, b) => a.sort_order - b.sort_order);
        const rows = items.flatMap((it) => {
          const last = lastPerformance(it.exercise_id);
          return Array.from({ length: Math.max(it.target_sets, last.length) }, (_, i) => ({
            workout_id: w.id,
            exercise_id: it.exercise_id,
            set_index: i + 1,
            weight_kg: last[i]?.weight_kg ?? last.at(-1)?.weight_kg ?? null,
            reps: last[i]?.reps ?? null,
          }));
        });
        if (rows.length) {
          const res = await supabase.from("workout_sets").insert(rows).select("*");
          setSets((ss) => [...ss, ...((res.data as WorkoutSet[]) ?? [])]);
        }
      }
      return w;
    },
    [templateExercises, lastPerformance],
  );

  const addSet = useCallback<Gym["addSet"]>(
    async (workoutId, exerciseId, prefill) => {
      const existing = sets.filter((s) => s.workout_id === workoutId && s.exercise_id === exerciseId);
      const prev = existing.at(-1);
      const { data } = await supabase
        .from("workout_sets")
        .insert({
          workout_id: workoutId,
          exercise_id: exerciseId,
          set_index: existing.length + 1,
          weight_kg: prefill?.weight_kg ?? prev?.weight_kg ?? null,
          reps: prefill?.reps ?? prev?.reps ?? null,
        })
        .select("*")
        .single();
      if (data) setSets((ss) => [...ss, data as WorkoutSet]);
    },
    [sets],
  );

  const updateSet = useCallback<Gym["updateSet"]>(async (id, patch) => {
    setSets((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    await supabase.from("workout_sets").update(patch).eq("id", id);
  }, []);

  const deleteSet = useCallback<Gym["deleteSet"]>(async (id) => {
    setSets((ss) => ss.filter((s) => s.id !== id));
    await supabase.from("workout_sets").delete().eq("id", id);
  }, []);

  const removeExerciseFromWorkout = useCallback<Gym["removeExerciseFromWorkout"]>(async (workoutId, exerciseId) => {
    setSets((ss) => ss.filter((s) => !(s.workout_id === workoutId && s.exercise_id === exerciseId)));
    await supabase.from("workout_sets").delete().eq("workout_id", workoutId).eq("exercise_id", exerciseId);
  }, []);

  const finishWorkout = useCallback<Gym["finishWorkout"]>(
    async (id, notes = null) => {
      const ended_at = new Date().toISOString();
      // seturile necompletate nu rămân în istoric
      const empty = sets.filter((s) => s.workout_id === id && !s.done).map((s) => s.id);
      setSets((ss) => ss.filter((s) => !empty.includes(s.id)));
      if (empty.length) await supabase.from("workout_sets").delete().in("id", empty);
      setWorkouts((ws) => ws.map((w) => (w.id === id ? { ...w, ended_at, notes } : w)));
      await supabase.from("workouts").update({ ended_at, notes }).eq("id", id);
      const doneCount = sets.filter((s) => s.workout_id === id && s.done).length;
      await grantXp("fitness", WORKOUT_XP(doneCount), "workout", id);

      // Bifează automat obiceiul „Sală”, dacă există
      const today = todayISO();
      const gymHabit = habits.find((h) => h.kind !== "quantity" && /sal[aă]|gym|antrenament/i.test(h.name));
      if (gymHabit && !habitLogs.some((l) => l.habit_id === gymHabit.id && l.date === today)) {
        await logHabit(gymHabit, { date: today, slot: gymHabit.kind === "scheduled" ? (gymHabit.times[0] ?? null) : null });
      }
    },
    [sets, grantXp, habits, habitLogs, logHabit],
  );

  const discardWorkout = useCallback<Gym["discardWorkout"]>(async (id) => {
    setWorkouts((ws) => ws.filter((w) => w.id !== id));
    setSets((ss) => ss.filter((s) => s.workout_id !== id));
    await supabase.from("workouts").delete().eq("id", id);
  }, []);

  const deleteWorkout = useCallback<Gym["deleteWorkout"]>(
    async (id) => {
      await discardWorkout(id);
      await revokeXp("workout", id);
    },
    [discardWorkout, revokeXp],
  );

  const value: Gym = {
    ready,
    exercises,
    templates,
    templateExercises,
    workouts,
    sets,
    active,
    seedStarter,
    addExercise,
    saveTemplate,
    deleteTemplate,
    startWorkout,
    addSet,
    updateSet,
    deleteSet,
    removeExerciseFromWorkout,
    finishWorkout,
    discardWorkout,
    deleteWorkout,
    lastPerformance,
    bestE1rm,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function workoutStats(w: Workout, sets: WorkoutSet[]) {
  const ws = sets.filter((s) => s.workout_id === w.id && s.done);
  const volume = ws.reduce((v, s) => v + (Number(s.weight_kg) || 0) * (Number(s.reps) || 0), 0);
  const exercises = new Set(ws.map((s) => s.exercise_id)).size;
  const minutes = w.ended_at ? Math.round((new Date(w.ended_at).getTime() - new Date(w.started_at).getTime()) / 60000) : null;
  return { volume, sets: ws.length, exercises, minutes };
}

export function weekWorkouts(workouts: Workout[], today = todayISO()) {
  const from = addDays(today, -6);
  return workouts.filter((w) => w.ended_at && w.started_at.slice(0, 10) >= from).length;
}
