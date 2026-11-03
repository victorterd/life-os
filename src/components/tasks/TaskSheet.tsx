"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, Clock, Flag, FolderClosed, Plus, Repeat, Target, Trash2, X } from "lucide-react";
import { AREAS, type AreaKey } from "@/lib/areas";
import { addDays, fromMinutes, labelMonth, labelWeek, monthStart, relativeDay, toMinutes, todayISO, weekStart } from "@/lib/dates";
import { useStore } from "@/lib/data/store";
import type { Horizon, Priority, Recurrence, Task } from "@/lib/data/types";

type Draft = Partial<Task>;
type SheetCtx = { open: (draft?: Draft) => void };

const Ctx = createContext<SheetCtx>({ open: () => {} });
export const useTaskSheet = () => useContext(Ctx);

export function TaskSheetProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  return (
    <Ctx.Provider value={{ open: (d = {}) => setDraft(d) }}>
      {children}
      <AnimatePresence>{draft && <TaskSheet key={draft.id ?? "new"} initial={draft} onClose={() => setDraft(null)} />}</AnimatePresence>
    </Ctx.Provider>
  );
}

const PRIORITIES: { key: Priority; label: string; color: string }[] = [
  { key: "low", label: "Scăzută", color: "var(--ink-3)" },
  { key: "medium", label: "Medie", color: "var(--work)" },
  { key: "high", label: "Mare", color: "var(--danger)" },
];

const RECURRENCE: { key: string; label: string; value: Recurrence | null }[] = [
  { key: "none", label: "Nu se repetă", value: null },
  { key: "daily", label: "Zilnic", value: { freq: "daily" } },
  { key: "weekdays", label: "Luni – vineri", value: { freq: "weekdays" } },
  { key: "weekly", label: "Săptămânal", value: { freq: "weekly" } },
  { key: "monthly", label: "Lunar", value: { freq: "monthly" } },
];

type When = { horizon: Horizon; period: string | null };

function TaskSheet({ initial, onClose }: { initial: Draft; onClose: () => void }) {
  const { tasks, subtasks, projects, addTask, updateTask, deleteTask, addSubtask, toggleSubtask, deleteSubtask, addProject } = useStore();
  const today = todayISO();
  const editing = Boolean(initial.id);

  const [title, setTitle] = useState(initial.title ?? "");
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [area, setArea] = useState<AreaKey>(initial.area ?? "personal");
  const [priority, setPriority] = useState<Priority>(initial.priority ?? "medium");
  const [when, setWhen] = useState<When>({
    horizon: initial.horizon ?? "day",
    period: initial.period === undefined ? today : initial.period,
  });
  const [time, setTime] = useState(initial.start_time?.slice(0, 5) ?? "");
  const [end, setEnd] = useState(initial.start_time ? fromMinutes(toMinutes(initial.start_time.slice(0, 5)) + (initial.duration_min ?? 60)) : "");
  const duration = time && end ? toMinutes(end) - toMinutes(time) : null;
  const badRange = duration !== null && duration <= 0;

  function changeStart(v: string) {
    // păstrează lungimea intervalului când muți începutul
    const len = duration && duration > 0 ? duration : 60;
    setTime(v);
    setEnd(v ? fromMinutes(toMinutes(v) + len) : "");
  }
  const [projectId, setProjectId] = useState<string | null>(initial.project_id ?? null);
  const [parentId, setParentId] = useState<string | null>(initial.parent_id ?? null);
  const [recurrence, setRecurrence] = useState<Recurrence | null>(initial.recurrence ?? null);
  const [newSubs, setNewSubs] = useState<string[]>([]);
  const [subInput, setSubInput] = useState("");
  const [newProject, setNewProject] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) titleRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, onClose]);

  const existingSubs = initial.id ? subtasks.filter((s) => s.task_id === initial.id) : [];

  // Obiectivele lunare din luna taskului (pentru cascadă)
  const goals = useMemo(() => {
    const m = monthStart(when.period ?? today);
    return tasks.filter((t) => t.horizon === "month" && t.period === m && t.id !== initial.id);
  }, [tasks, when.period, today, initial.id]);

  const whenOptions: { label: string; value: When }[] = [
    { label: "Azi", value: { horizon: "day", period: today } },
    { label: "Mâine", value: { horizon: "day", period: addDays(today, 1) } },
    { label: "Săptămâna asta", value: { horizon: "week", period: weekStart(today) } },
    { label: "Săptămâna viitoare", value: { horizon: "week", period: weekStart(addDays(today, 7)) } },
    { label: "Obiectiv lunar", value: { horizon: "month", period: monthStart(today) } },
    { label: "Inbox", value: { horizon: "day", period: null } },
  ];

  function whenLabel(w: When) {
    if (!w.period) return "Inbox";
    if (w.horizon === "month") return `Obiectiv · ${labelMonth(w.period)}`;
    if (w.horizon === "week") return `Săptămâna ${labelWeek(w.period)}`;
    return relativeDay(w.period, today);
  }

  async function save() {
    if (!title.trim() || saving || badRange) return;
    setSaving(true);
    let pid = projectId;
    if (newProject?.trim()) {
      const p = await addProject(newProject.trim(), area);
      pid = p?.id ?? null;
    }
    const payload = {
      title: title.trim(),
      notes: notes.trim() || null,
      area,
      priority,
      horizon: when.horizon,
      period: when.period,
      start_time: when.horizon === "day" && time ? time : null,
      duration_min: when.horizon === "day" && time && duration && duration > 0 ? duration : null,
      project_id: pid,
      parent_id: when.horizon === "month" ? null : parentId,
      recurrence: when.period ? recurrence : null,
    };
    if (editing) {
      await updateTask(initial.id!, payload);
      for (const s of newSubs) await addSubtask(initial.id!, s);
    } else {
      await addTask(payload, newSubs);
    }
    setSaving(false);
    onClose();
  }

  function pushSub() {
    const v = subInput.trim();
    if (!v) return;
    setNewSubs((s) => [...s, v]);
    setSubInput("");
  }

  const areaInfo = AREAS[area];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <motion.div
        className="absolute inset-0 bg-ink/25 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={editing ? "Editează taskul" : "Task nou"}
        className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-surface shadow-[var(--shadow-lift)] sm:max-w-[560px] sm:rounded-[28px]"
        initial={{ y: 40, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 30, opacity: 0, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 420, damping: 36 }}
      >
        <div className="h-1.5 w-full shrink-0" style={{ background: areaInfo.color }} />
        <div className="flex items-center justify-between px-5 pt-4 sm:px-6">
          <span className="text-[13px] font-medium text-ink-3">{editing ? "Editează taskul" : "Task nou"}</span>
          <button onClick={onClose} aria-label="Închide" className="grid size-8 place-items-center rounded-full text-ink-3 hover:bg-surface-2">
            <X size={18} />
          </button>
        </div>

        <div className="[&>*]:shrink-0 flex flex-col gap-5 overflow-y-auto px-5 pb-5 pt-2 sm:px-6">
          <textarea
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                save();
              }
            }}
            rows={1}
            placeholder="Ce ai de făcut?"
            className="field-sizing-content resize-none bg-transparent text-[24px] font-semibold leading-tight tracking-tight outline-none placeholder:text-ink-3/70"
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={1}
            placeholder="Note (opțional)"
            className="field-sizing-content -mt-3 min-h-6 resize-none bg-transparent text-[15px] text-ink-2 outline-none placeholder:text-ink-3/70"
          />

          {/* Arie */}
          <Field label="Arie">
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(AREAS) as AreaKey[]).map((k) => (
                <Chip key={k} active={area === k} color={AREAS[k].color} soft={AREAS[k].soft} ink={AREAS[k].ink} onClick={() => setArea(k)}>
                  {AREAS[k].label}
                </Chip>
              ))}
            </div>
          </Field>

          {/* Când */}
          <Field label="Când" icon={<CalendarDays size={14} />}>
            <div className="flex flex-wrap gap-1.5">
              {whenOptions.map((o) => (
                <Chip key={o.label} active={whenLabel(when) === whenLabel(o.value)} onClick={() => setWhen(o.value)}>
                  {o.label}
                </Chip>
              ))}
              <label className="relative">
                <Chip active={when.horizon === "day" && !!when.period && !whenOptions.some((o) => whenLabel(o.value) === whenLabel(when))}>
                  {when.horizon === "day" && when.period && !whenOptions.slice(0, 2).some((o) => o.value.period === when.period) ? relativeDay(when.period, today) : "Altă zi…"}
                </Chip>
                <input
                  type="date"
                  aria-label="Alege o zi"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  value={when.horizon === "day" && when.period ? when.period : ""}
                  onChange={(e) => e.target.value && setWhen({ horizon: "day", period: e.target.value })}
                />
              </label>
            </div>
          </Field>

          <div className="flex flex-col gap-5">
            <Field label="Prioritate" icon={<Flag size={14} />}>
              <div className="flex gap-1.5">
                {PRIORITIES.map((p) => (
                  <Chip key={p.key} active={priority === p.key} onClick={() => setPriority(p.key)} color={p.color}>
                    {p.label}
                  </Chip>
                ))}
              </div>
            </Field>

            {when.horizon === "day" && when.period && (
              <Field label="Interval orar (opțional)" icon={<Clock size={14} />}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => changeStart(e.target.value)}
                    aria-label="De la"
                    className="tabular h-9 rounded-full border border-line bg-surface px-3 text-[14px] outline-none focus:border-navy"
                  />
                  <span className="text-ink-3">–</span>
                  <input
                    type="time"
                    value={end}
                    disabled={!time}
                    onChange={(e) => setEnd(e.target.value)}
                    aria-label="Până la"
                    aria-invalid={badRange}
                    className={`tabular h-9 rounded-full border bg-surface px-3 text-[14px] outline-none focus:border-navy disabled:opacity-40 ${badRange ? "border-danger text-danger" : "border-line"}`}
                  />
                  {time &&
                    [30, 60, 120].map((m) => (
                      <Chip key={m} active={duration === m} onClick={() => setEnd(fromMinutes(toMinutes(time) + m))}>
                        +{m < 60 ? `${m}m` : `${m / 60}h`}
                      </Chip>
                    ))}
                  {time && (
                    <button
                      type="button"
                      onClick={() => {
                        setTime("");
                        setEnd("");
                      }}
                      className="ml-1 text-[13px] text-ink-3 hover:text-danger"
                    >
                      Fără oră
                    </button>
                  )}
                </div>
                {badRange && <p className="text-[13px] text-danger">Ora de final trebuie să fie după ora de început.</p>}
              </Field>
            )}
          </div>

          {when.horizon !== "month" && goals.length > 0 && (
            <Field label="Face parte din obiectivul" icon={<Target size={14} />}>
              <div className="flex flex-wrap gap-1.5">
                <Chip active={!parentId} onClick={() => setParentId(null)}>
                  Niciunul
                </Chip>
                {goals.map((g) => (
                  <Chip key={g.id} active={parentId === g.id} onClick={() => setParentId(g.id)} color={AREAS[g.area].color} soft={AREAS[g.area].soft} ink={AREAS[g.area].ink}>
                    {g.title}
                  </Chip>
                ))}
              </div>
            </Field>
          )}

          <Field label="Proiect" icon={<FolderClosed size={14} />}>
            <div className="flex flex-wrap gap-1.5">
              <Chip active={!projectId && newProject === null} onClick={() => { setProjectId(null); setNewProject(null); }}>
                Fără
              </Chip>
              {projects.map((p) => (
                <Chip key={p.id} active={projectId === p.id} onClick={() => { setProjectId(p.id); setNewProject(null); }}>
                  {p.name}
                </Chip>
              ))}
              {newProject === null ? (
                <Chip onClick={() => { setNewProject(""); setProjectId(null); }}>
                  <Plus size={13} /> Proiect nou
                </Chip>
              ) : (
                <input
                  autoFocus
                  value={newProject}
                  onChange={(e) => setNewProject(e.target.value)}
                  placeholder="Nume proiect"
                  className="h-9 rounded-full border border-navy bg-surface px-3 text-[14px] outline-none"
                />
              )}
            </div>
          </Field>

          {when.period && (
            <Field label="Repetă" icon={<Repeat size={14} />}>
              <div className="flex flex-wrap gap-1.5">
                {RECURRENCE.map((r) => (
                  <Chip key={r.key} active={(recurrence?.freq ?? null) === (r.value?.freq ?? null)} onClick={() => setRecurrence(r.value)}>
                    {r.label}
                  </Chip>
                ))}
              </div>
            </Field>
          )}

          <Field label="Subtaskuri">
            <ul className="flex flex-col gap-1">
              {existingSubs.map((s) => (
                <li key={s.id} className="group flex items-center gap-2.5 rounded-xl px-1 py-1">
                  <input type="checkbox" checked={s.done} onChange={() => toggleSubtask(s.id)} className="size-[18px] accent-[var(--navy)]" />
                  <span className={`flex-1 text-[15px] ${s.done ? "text-ink-3 line-through" : ""}`}>{s.title}</span>
                  <button onClick={() => deleteSubtask(s.id)} aria-label="Șterge subtaskul" className="text-ink-3 opacity-0 group-hover:opacity-100">
                    <X size={15} />
                  </button>
                </li>
              ))}
              {newSubs.map((s, i) => (
                <li key={i} className="flex items-center gap-2.5 px-1 py-1">
                  <span className="size-[18px] rounded-[5px] border-2 border-line" />
                  <span className="flex-1 text-[15px]">{s}</span>
                  <button onClick={() => setNewSubs((xs) => xs.filter((_, j) => j !== i))} aria-label="Șterge subtaskul" className="text-ink-3">
                    <X size={15} />
                  </button>
                </li>
              ))}
              <li className="flex items-center gap-2.5 px-1 py-1">
                <Plus size={18} className="text-ink-3" />
                <input
                  value={subInput}
                  onChange={(e) => setSubInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      pushSub();
                    }
                  }}
                  onBlur={pushSub}
                  placeholder="Adaugă un pas"
                  className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-3/70"
                />
              </li>
            </ul>
          </Field>
        </div>

        <div className="flex items-center gap-2 border-t border-line px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
          {editing && (
            <button
              onClick={async () => {
                await deleteTask(initial.id!);
                onClose();
              }}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-[14px] font-medium text-danger hover:bg-danger-soft"
            >
              <Trash2 size={16} />
              Șterge
            </button>
          )}
          <span className="ml-auto truncate pr-2 text-[13px] text-ink-3">{whenLabel(when)}</span>
          <button
            onClick={save}
            disabled={!title.trim() || saving || badRange}
            className="rounded-xl bg-navy px-5 py-2.5 text-[15px] font-medium text-white transition active:scale-[0.98] disabled:opacity-40"
          >
            {editing ? "Salvează" : "Adaugă taskul"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="flex items-center gap-1.5 text-[13px] font-medium text-ink-3">
        {icon}
        {label}
      </span>
      {children}
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
  color = "var(--navy)",
  soft = "var(--navy-soft)",
  ink,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  color?: string;
  soft?: string;
  ink?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="inline-flex h-9 items-center gap-1 rounded-full border px-3.5 text-[14px] font-medium transition active:scale-[0.97]"
      style={
        active
          ? { background: soft, borderColor: color, color: ink ?? color }
          : { background: "var(--surface)", borderColor: "var(--line)", color: "var(--ink-2)" }
      }
    >
      {children}
    </button>
  );
}
