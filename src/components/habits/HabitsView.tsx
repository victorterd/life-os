"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bell, BellRing, ChevronDown, ChevronLeft, ChevronRight, Flame, Pencil, Plus, Share, Trash2 } from "lucide-react";
import { AREAS } from "@/lib/areas";
import { addDays, labelDay, relativeDay, todayISO, weekStart } from "@/lib/dates";
import { useStore } from "@/lib/data/store";
import { dayProgress, describeHabit, fmtNum, isDueOn, localTime, streak, weekCount, type Habit } from "@/lib/data/habits";
import { disablePush, enablePush, getPushState, registerServiceWorker, type PushState } from "@/lib/push";
import { useNow } from "@/lib/hooks/useNow";
import { HabitToday } from "./HabitToday";
import { useHabitSheet } from "./HabitSheet";

export function HabitsView() {
  const now = useNow();
  const { habits } = useStore();
  const sheet = useHabitSheet();
  const [day, setDay] = useState<string | null>(null);
  if (!now) return null;
  const today = todayISO();
  const date = day ?? today;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[40px] font-semibold leading-none tracking-[-0.03em] sm:text-[52px]">Obiceiuri</h1>
        <button onClick={() => sheet.open()} className="flex items-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-[15px] font-medium text-white shadow-[var(--shadow-lift)] active:scale-[0.98]">
          <Plus size={18} />
          Obicei nou
        </button>
      </header>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-6">
          <div className="flex items-center gap-1">
            <button onClick={() => setDay(addDays(date, -1))} aria-label="Ziua anterioară" className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-surface">
              <ChevronLeft size={20} />
            </button>
            <button onClick={() => setDay(date < today ? addDays(date, 1) : date)} disabled={date >= today} aria-label="Ziua următoare" className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-surface disabled:opacity-30">
              <ChevronRight size={20} />
            </button>
            <h2 className="ml-1 text-[20px] font-semibold tracking-tight">{date === today ? `Azi, ${labelDay(date, { day: "numeric", month: "long" })}` : labelDay(date)}</h2>
            {date !== today && (
              <button onClick={() => setDay(null)} className="ml-2 rounded-full bg-navy-soft px-3 py-1 text-[13px] font-medium text-navy">
                Azi
              </button>
            )}
          </div>
          <HabitToday date={date} today={today} title={date === today ? "De bifat azi" : "De bifat în ziua asta"} />
          <NotificationsCard />
        </div>

        <section className="flex flex-col gap-3 lg:col-span-6">
          <h2 className="px-1 text-[20px] font-semibold tracking-tight">Toate obiceiurile</h2>
          {habits.length === 0 && (
            <button onClick={() => sheet.open()} className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-[26px] border-2 border-dashed border-line text-ink-3 hover:border-navy/40 hover:text-navy">
              <Plus size={22} />
              <span className="text-[15px] font-medium">Adaugă primul obicei sau tratament</span>
            </button>
          )}
          {habits.map((h) => (
            <HabitCard key={h.id} habit={h} today={today} />
          ))}
        </section>
      </div>
    </div>
  );
}

const WEEKS = 15;

function HabitCard({ habit, today }: { habit: Habit; today: string }) {
  const { habitLogs, unlogHabit } = useStore();
  const sheet = useHabitSheet();
  const [open, setOpen] = useState(false);
  const area = AREAS[habit.area];
  const s = streak(habit, habitLogs, today);

  const grid = useMemo(() => {
    const start = addDays(weekStart(today), -7 * (WEEKS - 1));
    return Array.from({ length: WEEKS }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => {
        const date = addDays(start, w * 7 + d);
        if (date > today) return { date, level: -1 };
        if (!isDueOn(habit, date) && habit.kind !== "weekly") return { date, level: -2 };
        const p = dayProgress(habit, habitLogs, date);
        return { date, level: p.complete ? 2 : p.done > 0 ? 1 : 0 };
      }),
    );
  }, [habit, habitLogs, today]);

  const last30 = useMemo(() => {
    let due = 0;
    let ok = 0;
    for (let i = 0; i < 30; i++) {
      const d = addDays(today, -i);
      if (habit.created_at.slice(0, 10) > d) break;
      if (habit.kind === "weekly" || !isDueOn(habit, d)) continue;
      due++;
      if (dayProgress(habit, habitLogs, d).complete) ok++;
    }
    return due ? Math.round((ok / due) * 100) : null;
  }, [habit, habitLogs, today]);

  const history = habitLogs.filter((l) => l.habit_id === habit.id).slice(-40).reverse();

  return (
    <div className="rounded-[24px] bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl text-[22px]" style={{ background: area.soft }}>
          {habit.emoji ?? "•"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-semibold">{habit.name}</p>
          <p className="text-[13px] text-ink-3">
            {describeHabit(habit)}
            {habit.detail && habit.kind === "scheduled" ? ` · ${habit.detail}` : ""}
            {habit.notify && <Bell size={12} className="ml-1.5 inline -translate-y-px" aria-label="cu notificare" />}
          </p>
        </div>
        <button onClick={() => sheet.open(habit)} aria-label={`Editează ${habit.name}`} className="grid size-8 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-surface-2">
          <Pencil size={15} />
        </button>
      </div>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div className="flex gap-[3px]" role="img" aria-label={`Istoric pe ultimele ${WEEKS} săptămâni`}>
          {grid.map((week, w) => (
            <div key={w} className="flex flex-col gap-[3px]">
              {week.map((c) => (
                <span
                  key={c.date}
                  title={c.level >= 0 ? `${labelDay(c.date, { day: "numeric", month: "short" })}` : undefined}
                  className="size-[11px] rounded-[3px] sm:size-3"
                  style={{
                    background: c.level === 2 ? area.color : c.level === 1 ? area.soft : c.level === 0 ? "var(--surface-2)" : "transparent",
                    outline: c.level === 1 ? `1px solid ${area.color}` : undefined,
                    outlineOffset: -1,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
        <dl className="flex shrink-0 flex-col items-end gap-1.5 text-right">
          <div>
            <dt className="sr-only">Streak</dt>
            <dd className="tabular flex items-center gap-1 text-[22px] font-semibold leading-none text-fitness">
              <Flame size={18} strokeWidth={2.4} />
              {s}
            </dd>
            <span className="text-[12px] text-ink-3">{habit.kind === "weekly" ? "săpt. la rând" : "zile la rând"}</span>
          </div>
          {habit.kind === "weekly" ? (
            <span className="tabular text-[12px] text-ink-3">
              {weekCount(habitLogs, habit.id, today)}/{habit.weekly_target} săpt. asta
            </span>
          ) : (
            last30 !== null && <span className="tabular text-[12px] text-ink-3">{last30}% în 30 de zile</span>
          )}
        </dl>
      </div>

      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="mt-3 flex items-center gap-1 text-[13px] font-medium text-ink-2">
        Istoric
        <ChevronDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <ul className="mt-2 flex max-h-72 flex-col overflow-y-auto">
              {history.length === 0 && <li className="py-2 text-[13px] text-ink-3">Nicio bifă încă.</li>}
              {history.map((l) => (
                <li key={l.id} className="group flex items-center gap-3 border-t border-line py-2 text-[14px] first:border-t-0">
                  <span className="w-28 shrink-0 text-ink-2">{relativeDay(l.date, today)}</span>
                  <span className="tabular flex-1 text-ink-3">
                    {localTime(l.logged_at)}
                    {l.slot && ` · programat ${l.slot.slice(0, 5)}`}
                    {l.value != null && ` · +${fmtNum(Number(l.value))} ${habit.unit ?? ""}`}
                  </span>
                  <button onClick={() => unlogHabit(l.id)} aria-label="Șterge bifa" className="text-ink-3 opacity-0 transition group-hover:opacity-100 focus:opacity-100">
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotificationsCard() {
  const [state, setState] = useState<PushState | "loading">("loading");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    registerServiceWorker()
      .then(() => getPushState())
      .then(setState)
      .catch(() => setState("unsupported"));
  }, []);

  async function toggle() {
    setBusy(true);
    setErr(null);
    try {
      setState(state === "on" ? await disablePush() : await enablePush());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Nu s-au putut activa notificările.");
    }
    setBusy(false);
  }

  if (state === "loading") return null;

  return (
    <div className="flex items-start gap-3 rounded-[24px] bg-navy-soft p-4 sm:p-5">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-navy text-white">{state === "on" ? <BellRing size={19} /> : <Bell size={19} />}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold">
          {state === "on" ? "Notificările sunt active pe acest dispozitiv" : "Notificări pentru tratamente"}
        </p>
        <p className="mt-0.5 text-[13px] leading-snug text-ink-2">
          {state === "needs-install" ? (
            <>
              Pe iPhone, notificările merg doar din aplicația instalată: în Safari apasă <Share size={12} className="inline -translate-y-px" /> Share → <b>Add to Home Screen</b>, apoi deschide LifeOS de pe ecranul principal.
            </>
          ) : state === "denied" ? (
            "Le-ai blocat din browser. Le poți reactiva din setările site-ului (iconița de lângă adresă)."
          ) : state === "unsupported" ? (
            "Browserul ăsta nu suportă notificări push."
          ) : state === "on" ? (
            "Primești un mesaj la ora fiecărui tratament și încă unul după 30 de minute dacă nu l-ai bifat."
          ) : (
            "Activează pe fiecare dispozitiv pe care vrei să primești mesaje: telefon și laptop."
          )}
        </p>
        {err && <p className="mt-1 text-[13px] text-danger">{err}</p>}
      </div>
      {(state === "on" || state === "off") && (
        <button onClick={toggle} disabled={busy} className={`shrink-0 rounded-xl px-3.5 py-2 text-[14px] font-medium transition disabled:opacity-50 ${state === "on" ? "text-navy hover:bg-white/60" : "bg-navy text-white"}`}>
          {state === "on" ? "Oprește" : "Activează"}
        </button>
      )}
    </div>
  );
}
