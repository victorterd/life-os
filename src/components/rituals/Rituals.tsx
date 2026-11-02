"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, Moon, Star, Sun, CalendarRange, X } from "lucide-react";
import { AREAS } from "@/lib/areas";
import { addDays, labelDay, labelWeek, monthStart, todayISO, toISO, weekDays, weekStart } from "@/lib/dates";
import { useStore, RITUAL_XP, type RitualKind } from "@/lib/data/store";
import { useGym } from "@/lib/data/gym";
import { useJournal, MOODS } from "@/lib/data/journal";
import { dayProgress, isDueOn } from "@/lib/data/habits";
import type { Task } from "@/lib/data/types";
import { sortTasks, QuickAdd } from "@/components/tasks/TasksView";

type Suggestion = { kind: RitualKind; date: string; title: string; text: string; Icon: typeof Sun; tone: string };

/** Ce ritual are sens acum (cel mult unul). */
export function useRitualSuggestion(now: Date): Suggestion | null {
  const { rituals } = useStore();
  const today = todayISO();
  const h = now.getHours();
  const dow = (now.getDay() + 6) % 7; // 0 = luni
  const has = (kind: RitualKind, date: string) => rituals.some((r) => r.kind === kind && r.date === date);

  const weekToPlan = dow === 6 && h >= 15 ? weekStart(addDays(today, 1)) : dow === 0 ? weekStart(today) : null;
  if (weekToPlan && !has("plan_week", weekToPlan))
    return { kind: "plan_week", date: weekToPlan, title: "Planifică săptămâna", text: `${labelWeek(weekToPlan)}: obiectivele lunii, apoi împarți pe zile.`, Icon: CalendarRange, tone: "var(--work)" };
  if (h >= 18 && !has("review_day", today))
    return { kind: "review_day", date: today, title: "Review-ul zilei", text: "Ce ai făcut, ce muți pe mâine și cum te simți.", Icon: Moon, tone: "var(--mind)" };
  if (h >= 5 && h < 14 && !has("plan_day", today))
    return { kind: "plan_day", date: today, title: "Planifică-ți ziua", text: "Alege ce faci azi și lucrul cel mai important.", Icon: Sun, tone: "var(--personal)" };
  return null;
}

export function RitualBanner({ now }: { now: Date }) {
  const s = useRitualSuggestion(now);
  const [open, setOpen] = useState(false);
  if (!s) return null;
  return (
    <>
      <motion.button
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-4 rounded-[24px] bg-surface p-4 text-left shadow-[var(--shadow-card)] transition active:scale-[0.99] sm:p-5"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl text-white" style={{ background: s.tone }}>
          <s.Icon size={22} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-semibold tracking-tight">{s.title}</span>
          <span className="block text-[14px] text-ink-2">{s.text}</span>
        </span>
        <span className="hidden shrink-0 rounded-full bg-navy-soft px-3 py-1.5 text-[13px] font-semibold text-navy sm:block">+{RITUAL_XP[s.kind]} XP</span>
        <ArrowRight size={20} className="shrink-0 text-ink-3" />
      </motion.button>
      <AnimatePresence>{open && <RitualFlow kind={s.kind} date={s.date} onClose={() => setOpen(false)} />}</AnimatePresence>
    </>
  );
}

// ------------------------------------------------------------------ flux comun

export function RitualFlow({ kind, date, onClose }: { kind: RitualKind; date: string; onClose: () => void }) {
  const { completeRitual } = useStore();
  const [step, setStep] = useState(0);
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(false);

  const steps =
    kind === "plan_day"
      ? [<PlanPick key="a" date={date} />, <PlanFocus key="b" date={date} />]
      : kind === "review_day"
        ? [<ReviewWins key="a" date={date} />, <ReviewLeftovers key="b" date={date} />, <ReviewMood key="c" date={date} notes={notes} setNotes={setNotes} />]
        : [<WeekLookback key="a" weekStart={date} />, <WeekGoals key="b" weekStart={date} />, <WeekSpread key="c" weekStart={date} />];

  const titles =
    kind === "plan_day" ? ["Ce faci azi?", "Cel mai important lucru"] : kind === "review_day" ? ["Ce ai realizat", "Ce rămâne", "Cum a fost ziua?"] : ["Săptămâna trecută", "Obiectivele lunii", "Împarte pe zile"];

  async function finish() {
    await completeRitual(kind, date, notes.trim() || null);
    setDone(true);
    navigator.vibrate?.(20);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <motion.div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        role="dialog"
        aria-modal="true"
        className="relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-canvas shadow-[var(--shadow-lift)] sm:max-w-[640px] sm:rounded-[28px]"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 36 }}
      >
        {done ? (
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <motion.div initial={{ scale: 0.5, rotate: -15 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 300, damping: 14 }} className="grid size-20 place-items-center rounded-[26px] bg-navy text-white">
              <Check size={40} strokeWidth={2.6} />
            </motion.div>
            <h2 className="text-[28px] font-semibold tracking-tight">{kind === "review_day" ? "Zi închisă. Odihnă plăcută!" : kind === "plan_week" ? "Săptămâna e pregătită." : "Ziua e planificată."}</h2>
            <p className="text-[16px] font-semibold text-navy">+{RITUAL_XP[kind]} XP</p>
            <button onClick={onClose} className="w-full rounded-2xl bg-ink py-3.5 text-[16px] font-semibold text-white">
              Gata
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 px-5 pt-5 sm:px-7">
              <div className="flex flex-1 gap-1.5">
                {steps.map((_, i) => (
                  <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-navy" : "bg-line"}`} />
                ))}
              </div>
              <button onClick={onClose} aria-label="Închide" className="grid size-8 place-items-center rounded-full text-ink-3 hover:bg-surface">
                <X size={18} />
              </button>
            </div>
            <h2 className="px-5 pt-4 text-[30px] font-semibold leading-tight tracking-tight sm:px-7">{titles[step]}</h2>
            <div className="flex-1 overflow-y-auto px-5 pb-5 pt-4 sm:px-7">
              <AnimatePresence mode="wait">
                <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }}>
                  {steps[step]}
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="flex items-center gap-2 border-t border-line bg-surface px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-7">
              {step > 0 && (
                <button onClick={() => setStep(step - 1)} className="rounded-xl px-4 py-2.5 text-[15px] font-medium text-ink-2">
                  Înapoi
                </button>
              )}
              <button
                onClick={() => (step < steps.length - 1 ? setStep(step + 1) : finish())}
                className="ml-auto flex items-center gap-2 rounded-xl bg-navy px-5 py-2.5 text-[15px] font-medium text-white active:scale-[0.98]"
              >
                {step < steps.length - 1 ? "Continuă" : "Termină"}
                <ArrowRight size={17} />
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

function Row({ task, right }: { task: Task; right: React.ReactNode }) {
  const area = AREAS[task.area];
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-surface px-3.5 py-3 shadow-[var(--shadow-card)]">
      <span className="size-2.5 shrink-0 rounded-full" style={{ background: area.color }} />
      <span className={`min-w-0 flex-1 text-[15px] ${task.done ? "text-ink-3 line-through" : ""}`}>{task.title}</span>
      {right}
    </li>
  );
}

// ------------------------------------------------------------------ Planifică ziua

function PlanPick({ date }: { date: string }) {
  const { tasks, updateTask } = useStore();
  const todays = tasks.filter((t) => t.horizon === "day" && t.period === date).sort(sortTasks);
  const candidates = [
    ...tasks.filter((t) => t.horizon === "day" && !t.done && t.period && t.period < date),
    ...tasks.filter((t) => t.horizon === "week" && !t.done && t.period === weekStart(date)),
    ...tasks.filter((t) => !t.period && !t.done),
  ];
  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2">
        <h3 className="text-[14px] font-semibold text-ink-2">Pe azi · {todays.length}</h3>
        <ul className="flex flex-col gap-1.5">
          {todays.map((t) => (
            <Row key={t.id} task={t} right={!t.done && <button onClick={() => updateTask(t.id, { period: null })} className="text-[13px] text-ink-3">Scoate</button>} />
          ))}
        </ul>
        <QuickAdd defaults={{ horizon: "day", period: date }} placeholder="Adaugă ceva pentru azi" />
      </section>
      {candidates.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-[14px] font-semibold text-ink-2">Le iei și pe astea azi?</h3>
          <ul className="flex flex-col gap-1.5">
            {candidates.map((t) => (
              <Row
                key={t.id}
                task={t}
                right={
                  <button onClick={() => updateTask(t.id, { horizon: "day", period: date })} className="shrink-0 rounded-full bg-navy-soft px-3 py-1.5 text-[13px] font-semibold text-navy">
                    Azi
                  </button>
                }
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function PlanFocus({ date }: { date: string }) {
  const { tasks, updateTask } = useStore();
  const open = tasks.filter((t) => t.horizon === "day" && t.period === date && !t.done).sort(sortTasks);
  if (!open.length) return <p className="text-[15px] text-ink-3">Nu ai taskuri deschise azi. Poți merge înapoi să adaugi.</p>;
  return (
    <div className="flex flex-col gap-2">
      <p className="mb-1 text-[15px] text-ink-2">Dacă faci doar un lucru azi, care ar fi? Îl marcăm cu prioritate mare.</p>
      {open.map((t) => (
        <button
          key={t.id}
          onClick={() => updateTask(t.id, { priority: t.priority === "high" ? "medium" : "high" })}
          aria-pressed={t.priority === "high"}
          className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition ${t.priority === "high" ? "bg-navy text-white shadow-[var(--shadow-lift)]" : "bg-surface shadow-[var(--shadow-card)]"}`}
        >
          <Star size={18} fill={t.priority === "high" ? "currentColor" : "none"} />
          <span className="flex-1 text-[15px] font-medium">{t.title}</span>
        </button>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ Review

function ReviewWins({ date }: { date: string }) {
  const { tasks, habits, habitLogs, xpEvents } = useStore();
  const done = tasks.filter((t) => t.done && t.done_at && toISO(new Date(t.done_at)) === date);
  const due = habits.filter((h) => h.kind !== "weekly" && isDueOn(h, date));
  const okH = due.filter((h) => dayProgress(h, habitLogs, date).complete).length;
  const xp = xpEvents.filter((e) => toISO(new Date(e.created_at)) === date).reduce((s, e) => s + e.amount, 0);
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-3">
        {[
          [String(done.length), "taskuri gata"],
          [due.length ? `${okH}/${due.length}` : "–", "obiceiuri"],
          [String(xp), "XP azi"],
        ].map(([v, l]) => (
          <div key={l} className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-card)]">
            <div className="tabular text-[30px] font-semibold leading-none tracking-tight">{v}</div>
            <div className="mt-1 text-[13px] text-ink-3">{l}</div>
          </div>
        ))}
      </div>
      <ul className="flex flex-col gap-1.5">
        {done.map((t) => (
          <Row key={t.id} task={t} right={<Check size={16} className="text-health" />} />
        ))}
        {!done.length && <p className="text-[15px] text-ink-3">Nicio bifă azi, și e în regulă. Mâine e o pagină nouă.</p>}
      </ul>
    </div>
  );
}

function ReviewLeftovers({ date }: { date: string }) {
  const { tasks, updateTask, toggleTask } = useStore();
  const open = tasks.filter((t) => t.horizon === "day" && t.period === date && !t.done).sort(sortTasks);
  if (!open.length) return <p className="text-[15px] text-ink-2">Nimic rămas. Ai terminat tot ce era pe azi! 🎉</p>;
  const btn = "rounded-full bg-surface-2 px-2.5 py-1.5 text-[12px] font-semibold text-ink-2 hover:bg-navy-soft hover:text-navy";
  return (
    <ul className="flex flex-col gap-1.5">
      {open.map((t) => (
        <Row
          key={t.id}
          task={t}
          right={
            <span className="flex shrink-0 gap-1">
              <button className={btn} onClick={() => toggleTask(t.id)}>
                Gata
              </button>
              <button className={btn} onClick={() => updateTask(t.id, { period: addDays(date, 1) })}>
                Mâine
              </button>
              <button className={btn} onClick={() => updateTask(t.id, { horizon: "week", period: weekStart(addDays(date, 1)), start_time: null })}>
                Săpt.
              </button>
              <button className={btn} onClick={() => updateTask(t.id, { period: null, start_time: null })}>
                Inbox
              </button>
            </span>
          }
        />
      ))}
    </ul>
  );
}

function ReviewMood({ date, notes, setNotes }: { date: string; notes: string; setNotes: (s: string) => void }) {
  const { moods, saveMood } = useJournal();
  const m = moods.find((x) => x.date === date);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-between gap-1">
        {MOODS.map((x) => (
          <button
            key={x.v}
            onClick={() => saveMood(date, { mood: x.v })}
            aria-pressed={m?.mood === x.v}
            aria-label={x.label}
            className={`flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 transition ${m?.mood === x.v ? "bg-surface shadow-[var(--shadow-card)]" : m ? "opacity-40" : ""}`}
          >
            <span className="text-[36px]">{x.emoji}</span>
            <span className="text-[11px] text-ink-3">{x.label}</span>
          </button>
        ))}
      </div>
      <label className="flex flex-col gap-2">
        <span className="text-[14px] font-semibold text-ink-2">Ce a mers bine azi?</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Un lucru mic e de ajuns." className="resize-none rounded-2xl bg-surface px-4 py-3 font-serif text-[18px] leading-snug shadow-[var(--shadow-card)] outline-none" />
      </label>
    </div>
  );
}

// ------------------------------------------------------------------ Planifică săptămâna

function WeekLookback({ weekStart: ws }: { weekStart: string }) {
  const { tasks, habits, habitLogs } = useStore();
  const { workouts } = useGym();
  const { moods } = useJournal();
  const prev = addDays(ws, -7);
  const days = weekDays(prev);
  const end = days[6];
  const doneTasks = tasks.filter((t) => t.done && t.done_at && toISO(new Date(t.done_at)) >= prev && toISO(new Date(t.done_at)) <= end).length;
  let due = 0;
  let ok = 0;
  for (const d of days)
    for (const h of habits)
      if (h.kind !== "weekly" && isDueOn(h, d)) {
        due++;
        if (dayProgress(h, habitLogs, d).complete) ok++;
      }
  const gym = workouts.filter((w) => w.ended_at && toISO(new Date(w.started_at)) >= prev && toISO(new Date(w.started_at)) <= end).length;
  const ms = moods.filter((m) => m.date >= prev && m.date <= end);
  const avgMood = ms.length ? ms.reduce((s, m) => s + m.mood, 0) / ms.length : null;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[15px] text-ink-2">{labelWeek(prev)}</p>
      <div className="grid grid-cols-2 gap-3">
        {[
          [String(doneTasks), "taskuri terminate"],
          [due ? `${Math.round((ok / due) * 100)}%` : "–", "obiceiuri respectate"],
          [String(gym), "antrenamente"],
          [avgMood ? MOODS[Math.round(avgMood) - 1].emoji : "–", "starea medie"],
        ].map(([v, l]) => (
          <div key={l} className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-card)]">
            <div className="tabular text-[32px] font-semibold leading-none tracking-tight">{v}</div>
            <div className="mt-1 text-[13px] text-ink-3">{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeekGoals({ weekStart: ws }: { weekStart: string }) {
  const { tasks } = useStore();
  const goals = tasks.filter((t) => t.horizon === "month" && t.period === monthStart(ws) && !t.done);
  const weekTasks = tasks.filter((t) => t.horizon === "week" && t.period === ws);
  return (
    <div className="flex flex-col gap-5">
      {goals.length ? (
        <ul className="flex flex-col gap-2">
          {goals.map((g) => {
            const kids = tasks.filter((t) => t.parent_id === g.id);
            const pct = kids.length ? kids.filter((k) => k.done).length / kids.length : 0;
            const area = AREAS[g.area];
            return (
              <li key={g.id} className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-card)]">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[15px] font-semibold">{g.title}</span>
                  <span className="tabular text-[13px] text-ink-3">{Math.round(pct * 100)}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: area.soft }}>
                  <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: area.color }} />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-[15px] text-ink-3">Nu ai obiective pentru luna asta. Le poți adăuga din Taskuri → Lună.</p>
      )}
      <section className="flex flex-col gap-2">
        <h3 className="text-[14px] font-semibold text-ink-2">Ce vrei să rezolvi săptămâna asta? · {weekTasks.length}</h3>
        <ul className="flex flex-col gap-1.5">
          {weekTasks.map((t) => (
            <Row key={t.id} task={t} right={null} />
          ))}
        </ul>
        <QuickAdd defaults={{ horizon: "week", period: ws }} placeholder="Adaugă pentru săptămână (cu ⚙ alegi obiectivul)" />
      </section>
    </div>
  );
}

function WeekSpread({ weekStart: ws }: { weekStart: string }) {
  const { tasks, updateTask } = useStore();
  const days = weekDays(ws);
  const pending = tasks.filter((t) => t.horizon === "week" && t.period === ws && !t.done);
  const counts = days.map((d) => tasks.filter((t) => t.horizon === "day" && t.period === d).length);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((d, i) => (
          <div key={d} className="rounded-xl bg-surface py-2 shadow-[var(--shadow-card)]">
            <div className="text-[11px] text-ink-3">{labelDay(d, { weekday: "short" }).slice(0, 2)}</div>
            <div className="tabular text-[16px] font-semibold">{counts[i]}</div>
          </div>
        ))}
      </div>
      {pending.length ? (
        <ul className="flex flex-col gap-2">
          {pending.map((t) => (
            <li key={t.id} className="rounded-2xl bg-surface p-3.5 shadow-[var(--shadow-card)]">
              <p className="text-[15px] font-medium">{t.title}</p>
              <div className="mt-2 flex gap-1">
                {days.map((d) => (
                  <button key={d} onClick={() => updateTask(t.id, { horizon: "day", period: d })} className="grid h-8 flex-1 place-items-center rounded-lg bg-surface-2 text-[12px] font-semibold text-ink-2 hover:bg-navy hover:text-white">
                    {labelDay(d, { weekday: "narrow" })}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[15px] text-ink-2">Totul e împărțit pe zile. Săptămâna arată bine.</p>
      )}
    </div>
  );
}
