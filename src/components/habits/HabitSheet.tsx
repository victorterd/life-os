"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bell, BellOff, Minus, Plus, Trash2, X } from "lucide-react";
import { AREAS, type AreaKey } from "@/lib/areas";
import { useStore, type NewHabit } from "@/lib/data/store";
import { ALL_DAYS, DAY_SHORT, hhmm, type Habit, type HabitKind } from "@/lib/data/habits";

type Draft = Partial<Habit>;
const Ctx = createContext<{ open: (d?: Draft) => void }>({ open: () => {} });
export const useHabitSheet = () => useContext(Ctx);

export function HabitSheetProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  return (
    <Ctx.Provider value={{ open: (d = {}) => setDraft(d) }}>
      {children}
      <AnimatePresence>{draft && <HabitSheet key={draft.id ?? "new"} initial={draft} onClose={() => setDraft(null)} />}</AnimatePresence>
    </Ctx.Provider>
  );
}

const TEMPLATES: (NewHabit & { label: string })[] = [
  { label: "💊 Pastilă / supliment", name: "", emoji: "💊", area: "health", kind: "scheduled", times: ["08:00"], detail: "1 capsulă", xp: 10 },
  { label: "🏋️ Sală", name: "Sală", emoji: "🏋️", area: "fitness", kind: "weekly", weekly_target: 4, xp: 40 },
  { label: "💧 Apă", name: "Apă", emoji: "💧", area: "health", kind: "quantity", target_value: 3, unit: "L", step_value: 0.25, xp: 15 },
  { label: "❤️ Sex", name: "Sex", emoji: "❤️", area: "personal", kind: "weekly", weekly_target: 3, notify: false, xp: 20 },
  { label: "🧘 Meditație", name: "Meditație", emoji: "🧘", area: "mind", kind: "scheduled", times: ["22:00"], detail: "10 min", xp: 15 },
  { label: "📖 Citit", name: "Citit", emoji: "📖", area: "mind", kind: "quantity", target_value: 20, unit: "pagini", step_value: 5, xp: 15 },
  { label: "🚶 Pași", name: "Pași", emoji: "🚶", area: "fitness", kind: "quantity", target_value: 8000, unit: "pași", step_value: 1000, xp: 15 },
];

const EMOJIS = ["💊", "💉", "🩹", "🐟", "🌙", "☀️", "💧", "🏋️", "🏃", "🚶", "🧘", "📖", "❤️", "🦷", "🥗", "😴", "📵", "✍️", "🎯", "🧠"];

const KINDS: { key: HabitKind; label: string; hint: string }[] = [
  { key: "scheduled", label: "La ore fixe", hint: "Pastile, suplimente, rutine" },
  { key: "weekly", label: "De X ori / săpt.", hint: "Sală, alergat, sex" },
  { key: "quantity", label: "Cantitate pe zi", hint: "Apă, pași, pagini" },
];

function HabitSheet({ initial, onClose }: { initial: Draft; onClose: () => void }) {
  const { addHabit, updateHabit, deleteHabit } = useStore();
  const editing = Boolean(initial.id);

  const [name, setName] = useState(initial.name ?? "");
  const [emoji, setEmoji] = useState(initial.emoji ?? "💊");
  const [area, setArea] = useState<AreaKey>(initial.area ?? "health");
  const [kind, setKind] = useState<HabitKind>(initial.kind ?? "scheduled");
  const [times, setTimes] = useState<string[]>((initial.times ?? ["08:00"]).map(hhmm));
  const [days, setDays] = useState<number[]>(initial.days_of_week ?? ALL_DAYS);
  const [detail, setDetail] = useState(initial.detail ?? "");
  const [weekly, setWeekly] = useState(initial.weekly_target ?? 3);
  const [target, setTarget] = useState(String(initial.target_value ?? "2.5"));
  const [unit, setUnit] = useState(initial.unit ?? "L");
  const [step, setStep] = useState(String(initial.step_value ?? "0.25"));
  const [notify, setNotify] = useState(initial.notify ?? true);
  const [xp, setXp] = useState(initial.xp ?? 10);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function applyTemplate(t: (typeof TEMPLATES)[number]) {
    setName(t.name);
    setEmoji(t.emoji ?? "💊");
    setArea(t.area ?? "health");
    setKind(t.kind ?? "scheduled");
    if (t.times) setTimes(t.times);
    setDetail(t.detail ?? "");
    if (t.weekly_target) setWeekly(t.weekly_target);
    if (t.target_value) setTarget(String(t.target_value));
    if (t.unit) setUnit(t.unit);
    if (t.step_value) setStep(String(t.step_value));
    setNotify(t.notify ?? true);
    setXp(t.xp ?? 10);
  }

  const num = (s: string) => Number(s.replace(",", "."));
  const valid =
    name.trim() &&
    (kind !== "scheduled" || days.length > 0) &&
    (kind !== "quantity" || (num(target) > 0 && num(step) > 0));

  async function save() {
    if (!valid || saving) return;
    setSaving(true);
    const payload: NewHabit = {
      name: name.trim(),
      emoji,
      area,
      kind,
      times: kind === "scheduled" ? [...new Set(times.filter(Boolean))].sort() : [],
      days_of_week: kind === "scheduled" ? [...days].sort() : ALL_DAYS,
      detail: detail.trim() || null,
      weekly_target: kind === "weekly" ? weekly : null,
      target_value: kind === "quantity" ? num(target) : null,
      unit: kind === "quantity" ? unit.trim() || null : null,
      step_value: kind === "quantity" ? num(step) : null,
      notify: kind === "scheduled" && notify && times.length > 0,
      xp,
    };
    if (editing) await updateHabit(initial.id!, payload);
    else await addHabit(payload);
    setSaving(false);
    onClose();
  }

  const a = AREAS[area];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <motion.div className="absolute inset-0 bg-ink/25 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={editing ? "Editează obiceiul" : "Obicei nou"}
        className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-surface shadow-[var(--shadow-lift)] sm:max-w-[560px] sm:rounded-[28px]"
        initial={{ y: 40, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 30, opacity: 0, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 420, damping: 36 }}
      >
        <div className="h-1.5 w-full shrink-0" style={{ background: a.color }} />
        <div className="flex items-center justify-between px-5 pt-4 sm:px-6">
          <span className="text-[13px] font-medium text-ink-3">{editing ? "Editează obiceiul" : "Obicei nou"}</span>
          <button onClick={onClose} aria-label="Închide" className="grid size-8 place-items-center rounded-full text-ink-3 hover:bg-surface-2">
            <X size={18} />
          </button>
        </div>

        <div className="[&>*]:shrink-0 flex flex-col gap-5 overflow-y-auto px-5 pb-5 pt-2 sm:px-6">
          {!editing && (
            <div className="-mx-5 flex shrink-0 gap-1.5 overflow-x-auto px-5 pb-1 sm:-mx-6 sm:px-6">
              {TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  onClick={() => applyTemplate(t)}
                  className="shrink-0 rounded-full bg-surface-2 px-3 py-1.5 text-[13px] font-medium text-ink-2 transition hover:bg-navy-soft hover:text-navy"
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl text-[30px]" style={{ background: a.soft }}>
              {emoji || "•"}
            </span>
            <input
              autoFocus={!editing}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={kind === "scheduled" ? "Ex: Vitamina D3" : "Numele obiceiului"}
              aria-label="Nume"
              className="min-w-0 flex-1 bg-transparent text-[24px] font-semibold tracking-tight outline-none placeholder:text-ink-3/70"
            />
          </div>

          <div className="-mt-2 flex flex-wrap gap-1">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                aria-label={`Emoji ${e}`}
                aria-pressed={emoji === e}
                className={`grid size-9 place-items-center rounded-xl text-[19px] transition ${emoji === e ? "bg-navy-soft ring-2 ring-navy" : "hover:bg-surface-2"}`}
              >
                {e}
              </button>
            ))}
          </div>

          <Field label="Arie">
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(AREAS) as AreaKey[]).map((k) => (
                <Chip key={k} active={area === k} color={AREAS[k].color} soft={AREAS[k].soft} ink={AREAS[k].ink} onClick={() => setArea(k)}>
                  {AREAS[k].label}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label="Tip">
            <div className="grid grid-cols-3 gap-1.5">
              {KINDS.map((k) => (
                <button
                  key={k.key}
                  onClick={() => setKind(k.key)}
                  aria-pressed={kind === k.key}
                  className={`rounded-2xl border px-3 py-2.5 text-left transition ${kind === k.key ? "border-navy bg-navy-soft" : "border-line hover:bg-surface-2"}`}
                >
                  <span className={`block text-[14px] font-semibold ${kind === k.key ? "text-navy" : ""}`}>{k.label}</span>
                  <span className="block text-[12px] leading-snug text-ink-3">{k.hint}</span>
                </button>
              ))}
            </div>
          </Field>

          {kind === "scheduled" && (
            <>
              <Field label="Ore">
                <div className="flex flex-wrap items-center gap-1.5">
                  {times.map((t, i) => (
                    <span key={i} className="flex items-center gap-1 rounded-full border border-line bg-surface py-0.5 pl-2 pr-1">
                      <input
                        type="time"
                        value={t}
                        onChange={(e) => setTimes((ts) => ts.map((x, j) => (j === i ? e.target.value : x)))}
                        aria-label={`Ora ${i + 1}`}
                        className="tabular h-8 bg-transparent text-[15px] font-medium outline-none"
                      />
                      <button onClick={() => setTimes((ts) => ts.filter((_, j) => j !== i))} aria-label="Șterge ora" className="grid size-6 place-items-center rounded-full text-ink-3 hover:bg-surface-2">
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                  <Chip onClick={() => setTimes((ts) => [...ts, ts.length ? "20:00" : "08:00"])}>
                    <Plus size={14} /> Oră
                  </Chip>
                </div>
                {times.length === 0 && <p className="text-[13px] text-ink-3">Fără oră: îl bifezi oricând în zi, fără notificare.</p>}
              </Field>

              <Field label="Zile">
                <div className="flex flex-wrap items-center gap-1.5">
                  {ALL_DAYS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDays((ds) => (ds.includes(d) ? ds.filter((x) => x !== d) : [...ds, d]))}
                      aria-pressed={days.includes(d)}
                      className={`grid size-10 place-items-center rounded-full text-[13px] font-semibold transition ${days.includes(d) ? "bg-navy text-white" : "bg-surface-2 text-ink-3"}`}
                    >
                      {DAY_SHORT[d - 1]}
                    </button>
                  ))}
                  <button onClick={() => setDays(ALL_DAYS)} className="ml-1 text-[13px] font-medium text-navy">
                    Zilnic
                  </button>
                  <button onClick={() => setDays([1, 2, 3, 4, 5])} className="ml-1 text-[13px] font-medium text-navy">
                    L–V
                  </button>
                </div>
              </Field>

              <Field label="Doză / detalii (opțional)">
                <input
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  placeholder="Ex: 1 capsulă, după masă"
                  className="h-11 rounded-2xl border border-line bg-surface px-4 text-[15px] outline-none focus:border-navy"
                />
              </Field>

              {times.length > 0 && (
                <button
                  onClick={() => setNotify((n) => !n)}
                  aria-pressed={notify}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${notify ? "border-navy bg-navy-soft" : "border-line"}`}
                >
                  {notify ? <Bell size={20} className="text-navy" /> : <BellOff size={20} className="text-ink-3" />}
                  <span className="flex-1">
                    <span className="block text-[15px] font-medium">{notify ? "Notificare la fiecare oră" : "Fără notificări"}</span>
                    <span className="block text-[13px] text-ink-3">Dacă nu bifezi, îți reamintește după 30 de minute.</span>
                  </span>
                </button>
              )}
            </>
          )}

          {kind === "weekly" && (
            <Field label="Câte ori pe săptămână">
              <Stepper value={weekly} min={1} max={7} onChange={setWeekly} suffix={weekly === 1 ? "dată" : "ori"} />
            </Field>
          )}

          {kind === "quantity" && (
            <div className="grid grid-cols-3 gap-3">
              <Field label="Țintă pe zi">
                <input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} className="tabular h-11 rounded-2xl border border-line bg-surface px-4 text-[15px] outline-none focus:border-navy" />
              </Field>
              <Field label="Unitate">
                <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="L, pași…" className="h-11 rounded-2xl border border-line bg-surface px-4 text-[15px] outline-none focus:border-navy" />
              </Field>
              <Field label="Butonul + adaugă">
                <input inputMode="decimal" value={step} onChange={(e) => setStep(e.target.value)} className="tabular h-11 rounded-2xl border border-line bg-surface px-4 text-[15px] outline-none focus:border-navy" />
              </Field>
            </div>
          )}

          <Field label="XP la fiecare bifă">
            <Stepper value={xp} min={5} max={100} step={5} onChange={setXp} suffix="XP" />
          </Field>
        </div>

        <div className="flex items-center gap-2 border-t border-line px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
          {editing &&
            (confirmDelete ? (
              <button
                onClick={async () => {
                  await deleteHabit(initial.id!);
                  onClose();
                }}
                className="rounded-xl bg-danger px-3 py-2.5 text-[14px] font-medium text-white"
              >
                Da, șterge
              </button>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-[14px] font-medium text-danger hover:bg-danger-soft">
                <Trash2 size={16} />
                Șterge
              </button>
            ))}
          <button
            onClick={save}
            disabled={!valid || saving}
            className="ml-auto rounded-xl bg-navy px-5 py-2.5 text-[15px] font-medium text-white transition active:scale-[0.98] disabled:opacity-40"
          >
            {editing ? "Salvează" : "Adaugă obiceiul"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function Stepper({ value, onChange, min, max, step = 1, suffix }: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number; suffix: string }) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={() => onChange(Math.max(min, value - step))} aria-label="Mai puțin" className="grid size-10 place-items-center rounded-full bg-surface-2 text-ink-2 active:scale-95">
        <Minus size={18} />
      </button>
      <span className="tabular min-w-20 text-center text-[22px] font-semibold">
        {value} <span className="text-[14px] font-medium text-ink-3">{suffix}</span>
      </span>
      <button onClick={() => onChange(Math.min(max, value + step))} aria-label="Mai mult" className="grid size-10 place-items-center rounded-full bg-surface-2 text-ink-2 active:scale-95">
        <Plus size={18} />
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-medium text-ink-3">{label}</span>
      {children}
    </div>
  );
}

function Chip({ children, active, onClick, color = "var(--navy)", soft = "var(--navy-soft)", ink }: { children: React.ReactNode; active?: boolean; onClick?: () => void; color?: string; soft?: string; ink?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="inline-flex h-9 items-center gap-1 rounded-full border px-3.5 text-[14px] font-medium transition active:scale-[0.97]"
      style={active ? { background: soft, borderColor: color, color: ink ?? color } : { background: "var(--surface)", borderColor: "var(--line)", color: "var(--ink-2)" }}
    >
      {children}
    </button>
  );
}
