"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, Clock, Dumbbell, GripVertical, Pencil, Play, Plus, Search, Timer, Trash2, Trophy, X } from "lucide-react";
import { useGym, e1rm, workoutStats, MUSCLES, WORKOUT_XP, type Exercise, type Template, type Workout, type WorkoutSet } from "@/lib/data/gym";
import { labelDay, relativeDay, toISO } from "@/lib/dates";
import { LineChart } from "@/components/charts/Charts";
import { useNow } from "@/lib/hooks/useNow";

type Tab = "start" | "history" | "progress" | "programs";
const TABS: { key: Tab; label: string }[] = [
  { key: "start", label: "Antrenează" },
  { key: "history", label: "Istoric" },
  { key: "progress", label: "Progres" },
  { key: "programs", label: "Programe" },
];

const kg = (n: number) => n.toLocaleString("ro-RO", { maximumFractionDigits: 1 });

export function GymView() {
  const gym = useGym();
  const [tab, setTab] = useState<Tab>("start");

  if (!gym.ready) return <div className="py-20 text-center text-ink-3">Se încarcă…</div>;
  if (gym.active) return <LiveWorkout workout={gym.active} />;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[40px] font-semibold leading-none tracking-[-0.03em] sm:text-[52px]">Gym</h1>
        <div role="tablist" className="flex rounded-2xl bg-surface p-1 shadow-[var(--shadow-card)]">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className="relative rounded-xl px-3 py-2 text-[14px] font-medium sm:px-4"
              style={{ color: tab === t.key ? "white" : "var(--ink-2)" }}
            >
              {tab === t.key && <motion.span layoutId="gym-tab" className="absolute inset-0 rounded-xl bg-fitness" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
              <span className="relative">{t.label}</span>
            </button>
          ))}
        </div>
      </header>

      {gym.exercises.length === 0 ? (
        <Onboarding />
      ) : (
        <>
          {tab === "start" && <StartTab />}
          {tab === "history" && <HistoryTab />}
          {tab === "progress" && <ProgressTab />}
          {tab === "programs" && <ProgramsTab />}
        </>
      )}
    </div>
  );
}

function Onboarding() {
  const { seedStarter } = useGym();
  const [busy, setBusy] = useState(false);
  return (
    <div className="relative overflow-hidden rounded-[28px] bg-fitness p-7 text-ink sm:p-10">
      <Dumbbell className="absolute -bottom-6 -right-4 rotate-[-18deg] opacity-20" size={180} strokeWidth={1.4} aria-hidden />
      <h2 className="max-w-[18ch] text-[32px] font-semibold leading-tight tracking-tight">Hai să-ți pregătim sala.</h2>
      <p className="mt-3 max-w-[46ch] text-[15px] text-ink/80">
        Pornim cu 23 de exerciții de bază și trei programe (Push, Pull, Legs). Le poți modifica oricând sau îți poți face programele tale.
      </p>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await seedStarter();
          setBusy(false);
        }}
        className="relative mt-6 rounded-full bg-ink px-5 py-3 text-[15px] font-semibold text-white active:scale-[0.98] disabled:opacity-60"
      >
        {busy ? "Se pregătește…" : "Pregătește exercițiile"}
      </button>
    </div>
  );
}

// ------------------------------------------------------------------ Antrenează

function StartTab() {
  const { templates, templateExercises, exercises, workouts, sets, startWorkout } = useGym();
  const done = workouts.filter((w) => w.ended_at).sort((a, b) => b.started_at.localeCompare(a.started_at));
  const lastByTemplate = new Map<string, Workout>();
  for (const w of done) if (w.template_id && !lastByTemplate.has(w.template_id)) lastByTemplate.set(w.template_id, w);
  // următorul program = cel făcut cel mai demult
  const next = [...templates].sort((a, b) => (lastByTemplate.get(a.id)?.started_at ?? "").localeCompare(lastByTemplate.get(b.id)?.started_at ?? ""))[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {templates.map((t, i) => {
          const items = templateExercises.filter((x) => x.template_id === t.id).sort((a, b) => a.sort_order - b.sort_order);
          const last = lastByTemplate.get(t.id);
          const isNext = t.id === next?.id;
          return (
            <motion.div
              key={t.id}
              animate={{ rotate: isNext ? -1.2 : 0 }}
              className={`relative flex flex-col gap-3 overflow-hidden rounded-[26px] p-5 ${isNext ? "bg-fitness shadow-[var(--shadow-lift)]" : "bg-surface shadow-[var(--shadow-card)]"}`}
            >
              {isNext && <span className="text-[12px] font-semibold text-ink/70">Urmează</span>}
              <div className="flex items-center gap-2.5">
                <span className="size-3 rounded-full" style={{ background: isNext ? "var(--ink)" : (t.color ?? "var(--fitness)") }} />
                <h3 className="text-[26px] font-semibold leading-none tracking-tight">{t.name}</h3>
              </div>
              <p className={`text-[14px] leading-snug ${isNext ? "text-ink/80" : "text-ink-2"}`}>
                {items.map((x) => exercises.find((e) => e.id === x.exercise_id)?.name).filter(Boolean).join(", ") || "Niciun exercițiu"}
              </p>
              <p className={`text-[13px] ${isNext ? "text-ink/70" : "text-ink-3"}`}>
                {last ? `Ultima dată: ${relativeDay(toISO(new Date(last.started_at)))}, ${kg(workoutStats(last, sets).volume)} kg volum` : `Încă nefăcut · ${i + 1}`}
              </p>
              <button
                onClick={() => startWorkout(t)}
                className={`mt-auto flex items-center gap-2 self-start rounded-full px-4 py-2.5 text-[14px] font-semibold active:scale-[0.97] ${isNext ? "bg-ink text-white" : "bg-fitness-soft text-[#c4501f]"}`}
              >
                <Play size={15} fill="currentColor" />
                Începe
              </button>
            </motion.div>
          );
        })}
        <button
          onClick={() => startWorkout(null)}
          className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-[26px] border-2 border-dashed border-line text-ink-3 transition hover:border-fitness hover:text-[#c4501f]"
        >
          <Plus size={22} />
          <span className="text-[15px] font-medium">Antrenament liber</span>
        </button>
      </div>

      {done.length > 0 && <WeekSummary workouts={done} sets={sets} />}
    </div>
  );
}

function WeekSummary({ workouts, sets }: { workouts: Workout[]; sets: WorkoutSet[] }) {
  const now = useNow();
  if (!now) return null;
  const since = now.getTime() - 7 * 86_400_000;
  const week = workouts.filter((w) => new Date(w.started_at).getTime() >= since);
  const volume = week.reduce((v, w) => v + workoutStats(w, sets).volume, 0);
  const minutes = week.reduce((v, w) => v + (workoutStats(w, sets).minutes ?? 0), 0);
  return (
    <div className="grid grid-cols-3 gap-3 rounded-[24px] bg-surface p-5 shadow-[var(--shadow-card)]">
      <Stat value={String(week.length)} label="antrenamente în 7 zile" />
      <Stat value={`${kg(volume / 1000)} t`} label="volum ridicat" />
      <Stat value={`${Math.floor(minutes / 60)}h ${minutes % 60}m`} label="la sală" />
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="tabular text-[28px] font-semibold leading-none tracking-tight sm:text-[34px]">{value}</div>
      <div className="mt-1 text-[13px] text-ink-3">{label}</div>
    </div>
  );
}

// ------------------------------------------------------------------ Antrenament live

function useElapsed(since: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const s = Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h ? `${h}:` : ""}${String(m).padStart(h ? 2 : 1, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function LiveWorkout({ workout }: { workout: Workout }) {
  const gym = useGym();
  const elapsed = useElapsed(workout.started_at);
  const [picker, setPicker] = useState(false);
  const [rest, setRest] = useState<{ until: number; total: number } | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [summary, setSummary] = useState<null | { volume: number; sets: number; minutes: number; prs: string[]; xp: number }>(null);

  const wsets = gym.sets.filter((s) => s.workout_id === workout.id);
  const order: string[] = [];
  for (const s of wsets) if (!order.includes(s.exercise_id)) order.push(s.exercise_id);
  const restFor = (exId: string) => gym.templateExercises.find((x) => x.template_id === workout.template_id && x.exercise_id === exId)?.rest_sec ?? 90;
  const doneSets = wsets.filter((s) => s.done);
  const volume = doneSets.reduce((v, s) => v + (Number(s.weight_kg) || 0) * (Number(s.reps) || 0), 0);

  async function finish() {
    setFinishing(true);
    const prs = order
      .map((exId) => {
        const before = gym.bestE1rm(exId, workout.started_at);
        const now = wsets.filter((s) => s.exercise_id === exId && s.done && s.weight_kg && s.reps).reduce((m, s) => Math.max(m, e1rm(Number(s.weight_kg), Number(s.reps))), 0);
        return before > 0 && now > before ? gym.exercises.find((e) => e.id === exId)?.name : null;
      })
      .filter((x): x is string => Boolean(x));
    const minutes = Math.round((new Date().getTime() - new Date(workout.started_at).getTime()) / 60000);
    const stats = { volume, sets: doneSets.length, minutes, prs, xp: WORKOUT_XP(doneSets.length) };
    setSummary(stats);
  }

  return (
    <div className="flex flex-col gap-5 pb-24">
      <header className="sticky top-0 z-20 -mx-4 flex items-center gap-3 bg-canvas/90 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-ink-3">În desfășurare</p>
          <h1 className="truncate text-[28px] font-semibold leading-tight tracking-tight">{workout.name}</h1>
        </div>
        <div className="text-right">
          <div className="tabular text-[22px] font-semibold">{elapsed}</div>
          <div className="tabular text-[12px] text-ink-3">
            {doneSets.length} seturi · {kg(volume)} kg
          </div>
        </div>
        <button onClick={finish} disabled={finishing} className="rounded-xl bg-fitness px-4 py-2.5 text-[15px] font-semibold text-ink active:scale-[0.97]">
          Termină
        </button>
      </header>

      {order.map((exId) => (
        <ExerciseBlock
          key={exId}
          workout={workout}
          exercise={gym.exercises.find((e) => e.id === exId)}
          sets={wsets.filter((s) => s.exercise_id === exId).sort((a, b) => a.set_index - b.set_index)}
          onSetDone={() => setRest({ until: Date.now() + restFor(exId) * 1000, total: restFor(exId) })}
        />
      ))}

      <button onClick={() => setPicker(true)} className="flex items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-line py-5 text-[15px] font-medium text-ink-3 hover:border-fitness hover:text-[#c4501f]">
        <Plus size={18} />
        Adaugă exercițiu
      </button>

      <button
        onClick={async () => {
          if (confirm("Renunți la antrenament? Seturile nu se salvează.")) await gym.discardWorkout(workout.id);
        }}
        className="self-center text-[14px] text-danger"
      >
        Renunță la antrenament
      </button>

      <AnimatePresence>
        {rest && <RestTimer key={rest.until} until={rest.until} total={rest.total} onDone={() => setRest(null)} onAdjust={(d) => setRest((r) => (r ? { ...r, until: r.until + d * 1000, total: r.total + d } : r))} />}
      </AnimatePresence>

      <AnimatePresence>
        {picker && (
          <ExercisePicker
            exclude={order}
            onClose={() => setPicker(false)}
            onPick={async (ex) => {
              setPicker(false);
              const last = gym.lastPerformance(ex.id);
              const n = Math.max(3, last.length);
              for (let i = 0; i < n; i++) await gym.addSet(workout.id, ex.id, { weight_kg: last[i]?.weight_kg ?? last.at(-1)?.weight_kg ?? null, reps: last[i]?.reps ?? null });
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {summary && (
          <Modal onClose={() => {}}>
            <div className="flex flex-col items-center gap-4 p-7 text-center">
              <motion.div initial={{ scale: 0.6, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 300, damping: 14 }} className="grid size-20 place-items-center rounded-[26px] bg-fitness">
                <Trophy size={38} className="text-ink" />
              </motion.div>
              <h2 className="text-[28px] font-semibold tracking-tight">Antrenament gata!</h2>
              <div className="grid w-full grid-cols-3 gap-3">
                <Stat value={`${summary.minutes}m`} label="durată" />
                <Stat value={String(summary.sets)} label="seturi" />
                <Stat value={`${kg(summary.volume)}`} label="kg volum" />
              </div>
              {summary.prs.length > 0 && (
                <div className="w-full rounded-2xl bg-personal-soft p-4 text-left">
                  <p className="text-[14px] font-semibold">🏆 Recorduri noi</p>
                  <p className="mt-1 text-[14px] text-ink-2">{summary.prs.join(", ")}</p>
                </div>
              )}
              <p className="text-[15px] font-semibold text-[#c4501f]">+{summary.xp} XP Fitness</p>
              <button
                onClick={async () => {
                  await gym.finishWorkout(workout.id);
                  setSummary(null);
                  setFinishing(false);
                }}
                className="w-full rounded-2xl bg-ink py-3.5 text-[16px] font-semibold text-white active:scale-[0.98]"
              >
                Salvează
              </button>
              <button
                onClick={() => {
                  setSummary(null);
                  setFinishing(false);
                }}
                className="text-[14px] text-ink-3"
              >
                Înapoi la antrenament
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

function ExerciseBlock({ workout, exercise, sets, onSetDone }: { workout: Workout; exercise?: Exercise; sets: WorkoutSet[]; onSetDone: () => void }) {
  const gym = useGym();
  const last = exercise ? gym.lastPerformance(exercise.id, workout.id) : [];
  const best = exercise ? gym.bestE1rm(exercise.id, workout.started_at) : 0;
  if (!exercise) return null;

  return (
    <section className="rounded-[24px] bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[18px] font-semibold tracking-tight">{exercise.name}</h2>
          <p className="text-[13px] text-ink-3">
            {last.length ? `Data trecută: ${last.map((s) => `${kg(Number(s.weight_kg) || 0)}×${s.reps ?? "–"}`).join(", ")}` : "Prima dată"}
          </p>
        </div>
        <button onClick={() => gym.removeExerciseFromWorkout(workout.id, exercise.id)} aria-label={`Scoate ${exercise.name}`} className="grid size-8 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-surface-2">
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-[2rem_1fr_1fr_2.75rem] items-center gap-2 px-1 pb-1 text-[12px] font-medium text-ink-3">
        <span>Set</span>
        <span>kg</span>
        <span>Repetări</span>
        <span />
      </div>
      <ul className="flex flex-col gap-1.5">
        {sets.map((s) => {
          const isPr = s.done && best > 0 && s.weight_kg && s.reps && e1rm(Number(s.weight_kg), Number(s.reps)) > best;
          return (
            <li key={s.id} className={`grid grid-cols-[2rem_1fr_1fr_2.75rem] items-center gap-2 rounded-2xl px-1 py-1 transition ${s.done ? "bg-fitness-soft" : ""}`}>
              <button onClick={() => gym.deleteSet(s.id)} className="tabular text-center text-[14px] font-semibold text-ink-3" title="Șterge setul" aria-label={`Șterge setul ${s.set_index}`}>
                {isPr ? "🏆" : s.set_index}
              </button>
              <NumInput value={s.weight_kg} step={2.5} onChange={(v) => gym.updateSet(s.id, { weight_kg: v })} label={`Kilograme set ${s.set_index}`} />
              <NumInput value={s.reps} step={1} onChange={(v) => gym.updateSet(s.id, { reps: v })} label={`Repetări set ${s.set_index}`} />
              <button
                onClick={() => {
                  const done = !s.done;
                  gym.updateSet(s.id, { done, done_at: done ? new Date().toISOString() : null });
                  if (done) {
                    onSetDone();
                    navigator.vibrate?.(15);
                  }
                }}
                aria-pressed={s.done}
                aria-label={`Set ${s.set_index} gata`}
                className={`grid size-11 place-items-center rounded-xl transition active:scale-90 ${s.done ? "bg-fitness text-ink" : "bg-surface-2 text-ink-3"}`}
              >
                <Check size={20} strokeWidth={2.6} />
              </button>
            </li>
          );
        })}
      </ul>
      <button onClick={() => gym.addSet(workout.id, exercise.id)} className="mt-2 flex items-center gap-1.5 rounded-full px-2 py-1.5 text-[14px] font-medium text-[#c4501f]">
        <Plus size={16} />
        Set
      </button>
    </section>
  );
}

function NumInput({ value, onChange, label, step }: { value: number | null; onChange: (v: number | null) => void; label: string; step: number }) {
  const shown = value == null ? "" : String(value).replace(".", ",");
  const [text, setText] = useState(shown);
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    setText(shown);
  }
  return (
    <input
      inputMode="decimal"
      aria-label={label}
      value={text}
      placeholder="–"
      step={step}
      onChange={(e) => setText(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={() => {
        const n = text.trim() === "" ? null : Number(text.replace(",", "."));
        if (n !== value && (n == null || !Number.isNaN(n))) onChange(n);
      }}
      className="tabular h-11 w-full rounded-xl bg-surface-2 text-center text-[17px] font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-fitness"
    />
  );
}

function RestTimer({ until, total, onDone, onAdjust }: { until: number; total: number; onDone: () => void; onAdjust: (d: number) => void }) {
  const [now, setNow] = useState(() => Date.now());
  const fired = useRef(false);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  const left = Math.max(0, Math.ceil((until - now) / 1000));
  useEffect(() => {
    if (left === 0 && !fired.current) {
      fired.current = true;
      navigator.vibrate?.([200, 100, 200]);
      const t = setTimeout(onDone, 1500);
      return () => clearTimeout(t);
    }
  }, [left, onDone]);
  const pct = total ? 1 - left / total : 1;

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      className="fixed inset-x-3 bottom-24 z-40 mx-auto flex max-w-[520px] items-center gap-3 overflow-hidden rounded-[22px] bg-ink p-3 pl-4 text-white shadow-[var(--shadow-lift)] lg:bottom-6"
      role="timer"
      aria-live="polite"
    >
      <div className="absolute inset-y-0 left-0 bg-fitness/25 transition-[width] duration-300" style={{ width: `${pct * 100}%` }} aria-hidden />
      <Timer size={20} className="relative shrink-0 text-fitness" />
      <span className="tabular relative flex-1 text-[22px] font-semibold">
        {left === 0 ? "Gata, următorul set!" : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`}
      </span>
      <button onClick={() => onAdjust(-15)} className="relative rounded-xl bg-white/10 px-3 py-2 text-[14px] font-medium">
        −15
      </button>
      <button onClick={() => onAdjust(15)} className="relative rounded-xl bg-white/10 px-3 py-2 text-[14px] font-medium">
        +15
      </button>
      <button onClick={onDone} aria-label="Sari peste pauză" className="relative grid size-9 place-items-center rounded-xl bg-white/10">
        <X size={16} />
      </button>
    </motion.div>
  );
}

// ------------------------------------------------------------------ Istoric

function HistoryTab() {
  const { workouts, sets, exercises, deleteWorkout } = useGym();
  const [open, setOpen] = useState<string | null>(null);
  const done = workouts.filter((w) => w.ended_at).sort((a, b) => b.started_at.localeCompare(a.started_at));
  if (!done.length) return <Empty text="Primul antrenament terminat apare aici." />;

  return (
    <ul className="flex max-w-[820px] flex-col gap-3">
      {done.map((w) => {
        const st = workoutStats(w, sets);
        const isOpen = open === w.id;
        const ws = sets.filter((s) => s.workout_id === w.id && s.done);
        const byEx = [...new Set(ws.map((s) => s.exercise_id))];
        return (
          <li key={w.id} className="rounded-[22px] bg-surface shadow-[var(--shadow-card)]">
            <button onClick={() => setOpen(isOpen ? null : w.id)} aria-expanded={isOpen} className="flex w-full items-center gap-4 p-4 text-left sm:p-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-fitness-soft text-[#c4501f]">
                <Dumbbell size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-semibold">{w.name}</span>
                <span className="block text-[13px] text-ink-3">
                  {labelDay(toISO(new Date(w.started_at)), { weekday: "long", day: "numeric", month: "long" })} ·{" "}
                  {new Date(w.started_at).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </span>
              <span className="tabular hidden text-right text-[13px] text-ink-2 sm:block">
                {st.minutes} min · {st.sets} seturi
                <br />
                {kg(st.volume)} kg
              </span>
              <ChevronDown size={18} className={`shrink-0 text-ink-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="flex flex-col gap-3 border-t border-line px-5 py-4">
                    {byEx.map((exId) => (
                      <div key={exId}>
                        <p className="text-[14px] font-semibold">{exercises.find((e) => e.id === exId)?.name ?? "Exercițiu șters"}</p>
                        <p className="tabular text-[13px] text-ink-2">
                          {ws
                            .filter((s) => s.exercise_id === exId)
                            .sort((a, b) => a.set_index - b.set_index)
                            .map((s) => `${kg(Number(s.weight_kg) || 0)} kg × ${s.reps ?? "–"}`)
                            .join(" · ")}
                        </p>
                      </div>
                    ))}
                    <button
                      onClick={() => confirm("Ștergi antrenamentul din istoric?") && deleteWorkout(w.id)}
                      className="flex items-center gap-1.5 self-start text-[13px] font-medium text-danger"
                    >
                      <Trash2 size={14} />
                      Șterge antrenamentul
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}

// ------------------------------------------------------------------ Progres

function ProgressTab() {
  const { exercises, sets, workouts } = useGym();
  const used = useMemo(() => {
    const count = new Map<string, number>();
    for (const s of sets) if (s.done) count.set(s.exercise_id, (count.get(s.exercise_id) ?? 0) + 1);
    return exercises.filter((e) => count.has(e.id)).sort((a, b) => (count.get(b.id) ?? 0) - (count.get(a.id) ?? 0));
  }, [exercises, sets]);
  const [sel, setSel] = useState<string | null>(null);
  const exId = sel ?? used[0]?.id;

  const series = useMemo(() => {
    if (!exId) return [];
    const wMap = new Map(workouts.map((w) => [w.id, w]));
    const byWorkout = new Map<string, { date: string; best: number; top: number }>();
    for (const s of sets) {
      if (s.exercise_id !== exId || !s.done || !s.weight_kg || !s.reps) continue;
      const w = wMap.get(s.workout_id);
      if (!w) continue;
      const cur = byWorkout.get(w.id) ?? { date: w.started_at, best: 0, top: 0 };
      cur.best = Math.max(cur.best, e1rm(Number(s.weight_kg), Number(s.reps)));
      cur.top = Math.max(cur.top, Number(s.weight_kg));
      byWorkout.set(w.id, cur);
    }
    return [...byWorkout.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [exId, sets, workouts]);

  if (!used.length) return <Empty text="După primele antrenamente vezi aici cum crești la fiecare exercițiu." />;

  const pr = series.reduce((m, p) => Math.max(m, p.top), 0);
  const prE = series.reduce((m, p) => Math.max(m, p.best), 0);

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <ul className="flex flex-col gap-1 lg:col-span-4">
        {used.map((e) => (
          <li key={e.id}>
            <button
              onClick={() => setSel(e.id)}
              aria-pressed={e.id === exId}
              className={`w-full rounded-xl px-3 py-2.5 text-left text-[15px] transition ${e.id === exId ? "bg-surface font-semibold shadow-[var(--shadow-card)]" : "text-ink-2 hover:bg-white/60"}`}
            >
              {e.name}
            </button>
          </li>
        ))}
      </ul>
      <section className="flex flex-col gap-4 rounded-[26px] bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6 lg:col-span-8">
        <h2 className="text-[20px] font-semibold tracking-tight">{exercises.find((e) => e.id === exId)?.name}</h2>
        <div className="grid grid-cols-3 gap-3">
          <Stat value={`${kg(pr)} kg`} label="greutate maximă" />
          <Stat value={`${kg(prE)} kg`} label="1RM estimat" />
          <Stat value={String(series.length)} label="antrenamente" />
        </div>
        <div>
          <p className="mb-2 text-[13px] text-ink-3">1RM estimat pe antrenament (kg)</p>
          <LineChart
            ariaLabel="Evoluția 1RM estimat"
            unit=" kg"
            color="var(--fitness)"
            data={series.map((p) => ({ x: p.date, y: Math.round(p.best * 10) / 10, label: new Date(p.date).toLocaleDateString("ro-RO", { day: "numeric", month: "short" }) }))}
          />
        </div>
      </section>
    </div>
  );
}

// ------------------------------------------------------------------ Programe

function ProgramsTab() {
  const { templates, templateExercises, exercises, deleteTemplate } = useGym();
  const [edit, setEdit] = useState<Template | "new" | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {templates.map((t) => {
          const items = templateExercises.filter((x) => x.template_id === t.id).sort((a, b) => a.sort_order - b.sort_order);
          return (
            <div key={t.id} className="rounded-[22px] bg-surface p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-2.5">
                <span className="size-3 rounded-full" style={{ background: t.color ?? "var(--fitness)" }} />
                <h3 className="flex-1 text-[18px] font-semibold">{t.name}</h3>
                <button onClick={() => setEdit(t)} aria-label={`Editează ${t.name}`} className="grid size-8 place-items-center rounded-full text-ink-3 hover:bg-surface-2">
                  <Pencil size={15} />
                </button>
                <button onClick={() => confirm(`Ștergi programul ${t.name}?`) && deleteTemplate(t.id)} aria-label={`Șterge ${t.name}`} className="grid size-8 place-items-center rounded-full text-ink-3 hover:bg-danger-soft hover:text-danger">
                  <Trash2 size={15} />
                </button>
              </div>
              <ol className="mt-3 flex flex-col gap-1 text-[14px] text-ink-2">
                {items.map((it) => (
                  <li key={it.id} className="flex justify-between gap-3">
                    <span className="truncate">{exercises.find((e) => e.id === it.exercise_id)?.name}</span>
                    <span className="tabular shrink-0 text-ink-3">
                      {it.target_sets} × {it.target_reps ?? "–"}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
        <button onClick={() => setEdit("new")} className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-line text-ink-3 hover:border-fitness hover:text-[#c4501f]">
          <Plus size={22} />
          <span className="text-[15px] font-medium">Program nou</span>
        </button>
      </div>
      <AnimatePresence>{edit && <TemplateEditor template={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}</AnimatePresence>
    </div>
  );
}

const COLORS = ["#ff7a45", "#2e7cf6", "#22b07d", "#7b6cf6", "#f5b83d", "#e5484d"];

function TemplateEditor({ template, onClose }: { template: Template | null; onClose: () => void }) {
  const { templateExercises, exercises, saveTemplate } = useGym();
  const [name, setName] = useState(template?.name ?? "");
  const [color, setColor] = useState(template?.color ?? COLORS[0]);
  const [items, setItems] = useState(
    template
      ? templateExercises
          .filter((x) => x.template_id === template.id)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((x) => ({ exercise_id: x.exercise_id, target_sets: x.target_sets, target_reps: x.target_reps, rest_sec: x.rest_sec }))
      : [],
  );
  const [picker, setPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  function move(i: number, d: number) {
    setItems((xs) => {
      const j = i + d;
      if (j < 0 || j >= xs.length) return xs;
      const copy = [...xs];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  return (
    <Modal onClose={onClose}>
      <div className="flex max-h-[88dvh] flex-col">
        <div className="flex items-center gap-3 px-5 pt-5 sm:px-6">
          <input autoFocus={!template} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nume program (ex: Push)" className="min-w-0 flex-1 bg-transparent text-[24px] font-semibold tracking-tight outline-none placeholder:text-ink-3/70" />
          <button onClick={onClose} aria-label="Închide" className="grid size-8 place-items-center rounded-full text-ink-3 hover:bg-surface-2">
            <X size={18} />
          </button>
        </div>
        <div className="flex gap-2 px-5 pt-3 sm:px-6">
          {COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)} aria-label={`Culoare ${c}`} aria-pressed={color === c} className={`size-7 rounded-full transition ${color === c ? "ring-2 ring-ink ring-offset-2" : ""}`} style={{ background: c }} />
          ))}
        </div>
        <ul className="mt-4 flex flex-col gap-2 overflow-y-auto px-5 sm:px-6">
          {items.map((it, i) => (
            <li key={`${it.exercise_id}-${i}`} className="flex items-center gap-2 rounded-2xl bg-surface-2 p-2.5">
              <div className="flex flex-col">
                <button onClick={() => move(i, -1)} aria-label="Mută mai sus" className="text-ink-3 hover:text-ink">
                  <GripVertical size={14} className="rotate-90" />
                </button>
              </div>
              <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{exercises.find((e) => e.id === it.exercise_id)?.name}</span>
              <label className="flex items-center gap-1 text-[12px] text-ink-3">
                <input type="number" min={1} max={10} value={it.target_sets} onChange={(e) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, target_sets: Number(e.target.value) || 1 } : x)))} className="tabular h-8 w-10 rounded-lg bg-white text-center text-[14px] text-ink" aria-label="Seturi" />×
              </label>
              <input value={it.target_reps ?? ""} onChange={(e) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, target_reps: e.target.value || null } : x)))} placeholder="8-12" className="tabular h-8 w-14 rounded-lg bg-white text-center text-[14px]" aria-label="Repetări" />
              <label className="flex items-center gap-1 text-[12px] text-ink-3">
                <Clock size={12} />
                <input type="number" step={15} min={0} value={it.rest_sec} onChange={(e) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, rest_sec: Number(e.target.value) || 0 } : x)))} className="tabular h-8 w-14 rounded-lg bg-white text-center text-[14px] text-ink" aria-label="Pauză în secunde" />s
              </label>
              <button onClick={() => setItems((xs) => xs.filter((_, j) => j !== i))} aria-label="Scoate exercițiul" className="grid size-7 place-items-center text-ink-3 hover:text-danger">
                <X size={15} />
              </button>
            </li>
          ))}
          <li>
            <button onClick={() => setPicker(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line py-3 text-[14px] font-medium text-ink-3 hover:border-fitness hover:text-[#c4501f]">
              <Plus size={16} />
              Adaugă exercițiu
            </button>
          </li>
        </ul>
        <div className="mt-4 flex justify-end border-t border-line px-5 py-4 sm:px-6">
          <button
            disabled={!name.trim() || saving}
            onClick={async () => {
              setSaving(true);
              await saveTemplate({ id: template?.id, name: name.trim(), color }, items);
              onClose();
            }}
            className="rounded-xl bg-ink px-5 py-2.5 text-[15px] font-medium text-white disabled:opacity-40"
          >
            Salvează programul
          </button>
        </div>
      </div>
      <AnimatePresence>
        {picker && (
          <ExercisePicker
            exclude={items.map((x) => x.exercise_id)}
            onClose={() => setPicker(false)}
            onPick={(ex) => {
              setItems((xs) => [...xs, { exercise_id: ex.id, target_sets: 3, target_reps: "8-12", rest_sec: 90 }]);
              setPicker(false);
            }}
          />
        )}
      </AnimatePresence>
    </Modal>
  );
}

// ------------------------------------------------------------------ comune

function ExercisePicker({ exclude, onPick, onClose }: { exclude: string[]; onPick: (e: Exercise) => void; onClose: () => void }) {
  const { exercises, addExercise } = useGym();
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState<string | null>(null);
  const list = exercises.filter((e) => !exclude.includes(e.id) && (!muscle || e.muscle_group === muscle) && e.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <Modal onClose={onClose}>
      <div className="flex max-h-[80dvh] flex-col">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <Search size={18} className="text-ink-3" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Caută sau creează exercițiu" className="flex-1 bg-transparent text-[16px] outline-none" />
          <button onClick={onClose} aria-label="Închide" className="grid size-8 place-items-center rounded-full text-ink-3">
            <X size={18} />
          </button>
        </div>
        <div className="flex gap-1.5 overflow-x-auto px-4 py-3">
          {MUSCLES.map((m) => (
            <button key={m} onClick={() => setMuscle(muscle === m ? null : m)} aria-pressed={muscle === m} className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium ${muscle === m ? "bg-fitness text-ink" : "bg-surface-2 text-ink-2"}`}>
              {m}
            </button>
          ))}
        </div>
        <ul className="flex-1 overflow-y-auto px-2 pb-2">
          {q.trim() && !exercises.some((e) => e.name.toLowerCase() === q.trim().toLowerCase()) && (
            <li>
              <button
                onClick={async () => {
                  const ex = await addExercise({ name: q.trim(), muscle_group: muscle });
                  if (ex) onPick(ex);
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-[15px] font-medium text-[#c4501f] hover:bg-fitness-soft"
              >
                <Plus size={16} />
                Creează „{q.trim()}”
              </button>
            </li>
          )}
          {list.map((e) => (
            <li key={e.id}>
              <button onClick={() => onPick(e)} className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left hover:bg-surface-2">
                <span className="text-[15px]">{e.name}</span>
                <span className="text-[12px] text-ink-3">{e.muscle_group}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <motion.div className="absolute inset-0 bg-ink/25 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        role="dialog"
        aria-modal="true"
        className="relative w-full overflow-hidden rounded-t-[28px] bg-surface shadow-[var(--shadow-lift)] sm:max-w-[560px] sm:rounded-[28px]"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 36 }}
      >
        {children}
      </motion.div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl px-4 py-10 text-center text-[15px] text-ink-3">{text}</p>;
}
