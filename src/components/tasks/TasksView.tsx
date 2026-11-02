"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, ChevronLeft, ChevronRight, Inbox, Plus, SlidersHorizontal } from "lucide-react";
import { AREAS } from "@/lib/areas";
import {
  addDays,
  addMonths,
  fromISO,
  labelDay,
  labelMonth,
  labelWeek,
  monthEnd,
  monthStart,
  todayISO,
  weekDays,
  weekStart,
} from "@/lib/dates";
import { useStore } from "@/lib/data/store";
import type { Horizon, Task } from "@/lib/data/types";
import { TaskItem } from "./TaskItem";
import { useTaskSheet } from "./TaskSheet";
import { RitualFlow } from "@/components/rituals/Rituals";
import type { RitualKind } from "@/lib/data/store";

type Tab = "day" | "week" | "month" | "inbox";

const TABS: { key: Tab; label: string }[] = [
  { key: "day", label: "Zi" },
  { key: "week", label: "Săptămână" },
  { key: "month", label: "Lună" },
  { key: "inbox", label: "Inbox" },
];

const PRIO_RANK = { high: 0, medium: 1, low: 2 } as const;

export function sortTasks(a: Task, b: Task) {
  if (a.done !== b.done) return a.done ? 1 : -1;
  if ((a.start_time ?? "99") !== (b.start_time ?? "99")) return (a.start_time ?? "99").localeCompare(b.start_time ?? "99");
  if (a.priority !== b.priority) return PRIO_RANK[a.priority] - PRIO_RANK[b.priority];
  return a.created_at.localeCompare(b.created_at);
}

export function TasksView() {
  const [tab, setTab] = useState<Tab>("day");
  const [ritual, setRitual] = useState<{ kind: RitualKind; date: string } | null>(null);
  const { tasks, rituals } = useStore();
  const today = todayISO();
  const nextWeek = weekStart(addDays(today, 7));
  const ritualDone = (kind: RitualKind, date: string) => rituals.some((r) => r.kind === kind && r.date === date);
  const inboxCount = tasks.filter((t) => !t.period && !t.done).length;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[40px] font-semibold leading-none tracking-[-0.03em] sm:text-[52px]">Taskuri</h1>
        <div role="tablist" className="flex rounded-2xl bg-surface p-1 shadow-[var(--shadow-card)]">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className="relative rounded-xl px-3.5 py-2 text-[14px] font-medium transition-colors sm:px-4"
              style={{ color: tab === t.key ? "white" : "var(--ink-2)" }}
            >
              {tab === t.key && (
                <motion.span layoutId="task-tab" className="absolute inset-0 rounded-xl bg-navy" transition={{ type: "spring", stiffness: 500, damping: 38 }} />
              )}
              <span className="relative flex items-center gap-1.5">
                {t.label}
                {t.key === "inbox" && inboxCount > 0 && (
                  <span className={`tabular rounded-full px-1.5 text-[11px] ${tab === t.key ? "bg-white/20" : "bg-navy-soft text-navy"}`}>{inboxCount}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      </header>

      <div className="-mt-2 flex flex-wrap gap-2">
        {(
          [
            ["plan_day", today, "☀️ Planifică ziua"],
            ["review_day", today, "🌙 Review-ul zilei"],
            ["plan_week", isoWeekdayNow(today) >= 6 ? nextWeek : weekStart(today), "🗓️ Planifică săptămâna"],
          ] as const
        ).map(([kind, date, label]) => (
          <button
            key={kind}
            onClick={() => setRitual({ kind, date })}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${ritualDone(kind, date) ? "bg-health-soft text-[#13805a]" : "bg-surface text-ink-2 shadow-[var(--shadow-card)] hover:text-navy"}`}
          >
            {label}
            {ritualDone(kind, date) && " ✓"}
          </button>
        ))}
      </div>
      <AnimatePresence>{ritual && <RitualFlow kind={ritual.kind} date={ritual.date} onClose={() => setRitual(null)} />}</AnimatePresence>

      {tab === "day" && <DayView />}
      {tab === "week" && <WeekView />}
      {tab === "month" && <MonthView />}
      {tab === "inbox" && <InboxView />}
    </div>
  );
}

function isoWeekdayNow(d: string) {
  return ((fromISO(d).getDay() + 6) % 7) + 1;
}

// ---------------------------------------------------------------- Zi

function DayView() {
  const { tasks, updateTask } = useStore();
  const today = todayISO();
  const [day, setDay] = useState(today);

  const list = tasks.filter((t) => t.horizon === "day" && t.period === day).sort(sortTasks);
  const overdue = day === today ? tasks.filter((t) => t.horizon === "day" && !t.done && t.period && t.period < today).sort(sortTasks) : [];
  const weekPending = tasks.filter((t) => t.horizon === "week" && !t.done && t.period === weekStart(day));
  const open = list.filter((t) => !t.done);
  const done = list.filter((t) => t.done);

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="flex flex-col gap-4 lg:col-span-8">
        <Pager
          label={day === today ? `Azi, ${labelDay(day, { day: "numeric", month: "long" })}` : labelDay(day)}
          onPrev={() => setDay(addDays(day, -1))}
          onNext={() => setDay(addDays(day, 1))}
          onReset={day !== today ? () => setDay(today) : undefined}
          resetLabel="Azi"
        />

        {overdue.length > 0 && (
          <section className="flex flex-col gap-2 rounded-[24px] bg-danger-soft/60 p-3 sm:p-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[14px] font-semibold text-danger">Rămase din zilele trecute · {overdue.length}</h3>
              <button
                onClick={() => overdue.forEach((t) => updateTask(t.id, { period: today }))}
                className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[13px] font-medium text-danger shadow-[var(--shadow-card)]"
              >
                Mută-le pe azi
                <ArrowRight size={14} />
              </button>
            </div>
            {overdue.map((t) => (
              <TaskItem key={t.id} task={t} showDate />
            ))}
          </section>
        )}

        <QuickAdd defaults={{ horizon: "day", period: day }} placeholder={day === today ? "Adaugă un task pentru azi" : "Adaugă un task pentru ziua asta"} />

        <motion.div layout className="flex flex-col gap-2">
          {open.map((t) => (
            <motion.div key={t.id} layout transition={{ type: "spring", stiffness: 500, damping: 40 }}>
              <TaskItem task={t} />
            </motion.div>
          ))}
          {open.length === 0 && done.length === 0 && <Empty text="Nimic planificat. Adaugă primul task sau trage unul din săptămână." />}
        </motion.div>

        {done.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="px-1 text-[13px] font-medium text-ink-3">Gata · {done.length}</h3>
            {done.map((t) => (
              <motion.div key={t.id} layout transition={{ type: "spring", stiffness: 500, damping: 40 }}>
                <TaskItem task={t} />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <aside className="flex flex-col gap-3 lg:col-span-4">
        <div className="rounded-[24px] bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5">
          <h3 className="text-[15px] font-semibold">Din săptămâna asta</h3>
          <p className="mt-0.5 text-[13px] text-ink-3">Mută un task în ziua de {day === today ? "azi" : "față"}.</p>
          <ul className="mt-3 flex flex-col gap-1">
            {weekPending.map((t) => (
              <li key={t.id} className="flex items-center gap-2 rounded-xl py-1.5">
                <span className="size-2 shrink-0 rounded-full" style={{ background: AREAS[t.area].color }} />
                <span className="min-w-0 flex-1 truncate text-[14px]">{t.title}</span>
                <button
                  onClick={() => updateTask(t.id, { horizon: "day", period: day })}
                  className="shrink-0 rounded-full bg-navy-soft px-2.5 py-1 text-[12px] font-medium text-navy"
                >
                  Mută aici
                </button>
              </li>
            ))}
            {weekPending.length === 0 && <li className="text-[13px] text-ink-3">Nimic în așteptare.</li>}
          </ul>
        </div>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------- Săptămână

function WeekView() {
  const { tasks, updateTask } = useStore();
  const today = todayISO();
  const [start, setStart] = useState(weekStart(today));
  const days = weekDays(start);
  const end = days[6];

  const weekTasks = tasks.filter((t) => t.horizon === "week" && t.period === start).sort(sortTasks);
  const dayTasks = tasks.filter((t) => t.horizon === "day" && t.period && t.period >= start && t.period <= end);
  const all = [...weekTasks, ...dayTasks];
  const doneCount = all.filter((t) => t.done).length;

  return (
    <div className="flex flex-col gap-5">
      <Pager
        label={start === weekStart(today) ? `Săptămâna asta · ${labelWeek(start)}` : labelWeek(start)}
        onPrev={() => setStart(addDays(start, -7))}
        onNext={() => setStart(addDays(start, 7))}
        onReset={start !== weekStart(today) ? () => setStart(weekStart(today)) : undefined}
        resetLabel="Săptămâna asta"
        right={<Progress done={doneCount} total={all.length} />}
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="flex flex-col gap-3 lg:col-span-4">
          <h3 className="px-1 text-[15px] font-semibold">De făcut săptămâna asta</h3>
          <QuickAdd defaults={{ horizon: "week", period: start }} placeholder="Adaugă pentru săptămână" />
          {weekTasks.map((t) => (
            <div key={t.id} className="flex flex-col gap-1.5">
              <TaskItem task={t} />
              {!t.done && (
                <div className="flex items-center gap-1 px-2">
                  <span className="mr-1 text-[12px] text-ink-3">Planifică:</span>
                  {days.map((d) => (
                    <button
                      key={d}
                      onClick={() => updateTask(t.id, { horizon: "day", period: d })}
                      className="grid size-7 place-items-center rounded-full text-[11px] font-medium text-ink-2 transition hover:bg-navy hover:text-white"
                      aria-label={`Mută în ${labelDay(d)}`}
                    >
                      {labelDay(d, { weekday: "narrow" })}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {weekTasks.length === 0 && <Empty text="Scrie aici ce vrei să rezolvi săptămâna asta, apoi împarte pe zile." />}
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:col-span-8 xl:grid-cols-3">
          {days.map((d) => {
            const list = dayTasks.filter((t) => t.period === d).sort(sortTasks);
            const isToday = d === today;
            return (
              <div key={d} className={`flex min-h-36 flex-col gap-2 rounded-[22px] p-3 ${isToday ? "bg-navy-soft" : "bg-surface/60"}`}>
                <div className="flex items-baseline justify-between px-1">
                  <span className={`text-[14px] font-semibold ${isToday ? "text-navy" : ""}`}>{labelDay(d, { weekday: "long" })}</span>
                  <span className="tabular text-[13px] text-ink-3">{fromISO(d).getDate()}</span>
                </div>
                {list.map((t) => (
                  <TaskItem key={t.id} task={t} compact />
                ))}
                <QuickAdd defaults={{ horizon: "day", period: d }} placeholder="Adaugă" compact />
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Lună

function MonthView() {
  const { tasks } = useStore();
  const sheet = useTaskSheet();
  const today = todayISO();
  const [month, setMonth] = useState(monthStart(today));
  const mEnd = monthEnd(month);

  const goals = tasks.filter((t) => t.horizon === "month" && t.period === month).sort(sortTasks);
  const inMonth = tasks.filter((t) => t.horizon !== "month" && t.period && t.period >= weekStart(month) && t.period <= mEnd);

  return (
    <div className="flex flex-col gap-5">
      <Pager
        label={labelMonth(month)}
        onPrev={() => setMonth(addMonths(month, -1))}
        onNext={() => setMonth(addMonths(month, 1))}
        onReset={month !== monthStart(today) ? () => setMonth(monthStart(today)) : undefined}
        resetLabel="Luna asta"
        right={<Progress done={goals.filter((g) => g.done).length} total={goals.length} label="obiective" />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {goals.map((g, i) => {
          const children = tasks.filter((t) => t.parent_id === g.id);
          const done = children.filter((t) => t.done).length;
          const pct = children.length ? done / children.length : g.done ? 1 : 0;
          const area = AREAS[g.area];
          return (
            <motion.div
              key={g.id}
              initial={{ rotate: 0 }}
              animate={{ rotate: i % 3 === 1 ? 0.8 : i % 3 === 2 ? -0.6 : 0 }}
              className="flex flex-col gap-4 rounded-[26px] bg-surface p-5 shadow-[var(--shadow-card)]"
            >
              <TaskItem task={g} compact />
              <div>
                <div className="mb-1.5 flex items-baseline justify-between text-[13px]">
                  <span className="text-ink-3">{children.length ? `${done} din ${children.length} pași` : "Niciun pas încă"}</span>
                  <span className="tabular font-semibold" style={{ color: area.ink }}>
                    {Math.round(pct * 100)}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full" style={{ background: area.soft }}>
                  <motion.div className="h-full rounded-full" style={{ background: area.color }} animate={{ width: `${pct * 100}%` }} />
                </div>
              </div>
              <ul className="flex flex-col gap-1">
                {children.slice(0, 4).map((c) => (
                  <li key={c.id} className={`truncate text-[13px] ${c.done ? "text-ink-3 line-through" : "text-ink-2"}`}>
                    {c.title}
                  </li>
                ))}
                {children.length > 4 && <li className="text-[13px] text-ink-3">+{children.length - 4}</li>}
              </ul>
              <button
                onClick={() => sheet.open({ horizon: "week", period: weekStart(month < today ? today : month), parent_id: g.id, area: g.area })}
                className="mt-auto flex items-center gap-1.5 self-start rounded-full px-3 py-1.5 text-[13px] font-medium"
                style={{ background: area.soft, color: area.ink }}
              >
                <Plus size={14} />
                Adaugă un pas
              </button>
            </motion.div>
          );
        })}

        <button
          onClick={() => sheet.open({ horizon: "month", period: month })}
          className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-[26px] border-2 border-dashed border-line text-ink-3 transition hover:border-navy/40 hover:text-navy"
        >
          <Plus size={22} />
          <span className="text-[15px] font-medium">Obiectiv nou pentru {labelMonth(month).split(" ")[0].toLowerCase()}</span>
        </button>
      </div>

      <p className="px-1 text-[13px] text-ink-3">
        În {labelMonth(month).split(" ")[0].toLowerCase()} ai {inMonth.length} taskuri planificate, {inMonth.filter((t) => t.done).length} gata.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- Inbox

function InboxView() {
  const { tasks } = useStore();
  const list = tasks.filter((t) => !t.period).sort(sortTasks);
  return (
    <div className="flex max-w-[760px] flex-col gap-3">
      <p className="flex items-center gap-2 px-1 text-[14px] text-ink-3">
        <Inbox size={16} />
        Notează rapid aici orice îți trece prin cap. Îl programezi mai târziu.
      </p>
      <QuickAdd defaults={{ horizon: "day", period: null }} placeholder="Ce ai în minte?" />
      {list.map((t) => (
        <TaskItem key={t.id} task={t} />
      ))}
      {list.length === 0 && <Empty text="Inbox gol. Minte limpede." />}
    </div>
  );
}

// ---------------------------------------------------------------- piese comune

export function QuickAdd({
  defaults,
  placeholder,
  compact,
}: {
  defaults: { horizon: Horizon; period: string | null };
  placeholder: string;
  compact?: boolean;
}) {
  const { addTask } = useStore();
  const sheet = useTaskSheet();
  const [value, setValue] = useState("");

  async function submit() {
    const title = value.trim();
    if (!title) return;
    setValue("");
    await addTask({ title, ...defaults });
  }

  return (
    <div
      className={`flex items-center gap-2 rounded-2xl border border-dashed border-line transition focus-within:border-navy/50 focus-within:bg-surface ${
        compact ? "px-2.5 py-1.5" : "px-4 py-2.5"
      }`}
    >
      <Plus size={compact ? 15 : 18} className="shrink-0 text-ink-3" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink-3 ${compact ? "text-[13px]" : "text-[15px]"}`}
      />
      {!compact && (
        <button
          onClick={() => sheet.open({ ...defaults, title: value })}
          aria-label="Adaugă cu detalii"
          title="Cu detalii"
          className="grid size-8 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-navy"
        >
          <SlidersHorizontal size={16} />
        </button>
      )}
    </div>
  );
}

function Pager({
  label,
  onPrev,
  onNext,
  onReset,
  resetLabel,
  right,
}: {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onReset?: () => void;
  resetLabel: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-1">
        <button onClick={onPrev} aria-label="Înapoi" className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-surface">
          <ChevronLeft size={20} />
        </button>
        <button onClick={onNext} aria-label="Înainte" className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-surface">
          <ChevronRight size={20} />
        </button>
        <h2 className="ml-1 text-[20px] font-semibold tracking-tight">{label}</h2>
        {onReset && (
          <button onClick={onReset} className="ml-2 rounded-full bg-navy-soft px-3 py-1 text-[13px] font-medium text-navy">
            {resetLabel}
          </button>
        )}
      </div>
      {right}
    </div>
  );
}

function Progress({ done, total, label = "gata" }: { done: number; total: number; label?: string }) {
  const pct = total ? done / total : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="tabular text-[14px] text-ink-2">
        <span className="font-semibold text-ink">{done}</span>/{total} {label}
      </span>
      <div className="h-2 w-28 overflow-hidden rounded-full bg-navy-soft">
        <motion.div className="h-full rounded-full bg-navy" animate={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl px-4 py-6 text-center text-[14px] text-ink-3">{text}</p>;
}

export function useTodayTasks() {
  const { tasks } = useStore();
  const today = todayISO();
  return useMemo(() => tasks.filter((t) => t.horizon === "day" && t.period === today).sort(sortTasks), [tasks, today]);
}
