"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { useStore } from "@/lib/data/store";
import { fmtNum, quantityOn, type Habit } from "@/lib/data/habits";

const MAX_ML = 1000;
const STEP_ML = 50;
const PRESETS = [250, 330, 500, 750];

/** Obicei de apă = cantitate măsurată în L sau ml (sau numit „apă”). */
export function isWater(h: Habit) {
  return h.kind === "quantity" && (/^(l|ml|litri?)$/i.test(h.unit?.trim() ?? "") || /ap[aă]|water/i.test(h.name));
}

const isMl = (h: Habit) => /^ml$/i.test(h.unit?.trim() ?? "");

export function WaterSheet({ habit, date, onClose }: { habit: Habit; date: string; onClose: () => void }) {
  const { habitLogs, logHabit } = useStore();
  const [ml, setMl] = useState(250);
  const [saving, setSaving] = useState(false);
  const glass = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const toUnit = (v: number) => (isMl(habit) ? v : v / 1000);
  // rotunjim la ml întregi (0,4 + 0,25 L dă 0,6499999… în virgulă mobilă)
  const drunkMl = Math.round(quantityOn(habitLogs, habit.id, date) * (isMl(habit) ? 1 : 1000));
  const targetMl = Math.round((Number(habit.target_value) || 0) * (isMl(habit) ? 1 : 1000));
  const after = drunkMl + ml;
  const pct = ml / MAX_ML;

  function fromPointer(clientY: number) {
    const r = glass.current?.getBoundingClientRect();
    if (!r) return;
    const p = 1 - (clientY - r.top) / r.height;
    const v = Math.round((Math.min(1, Math.max(0, p)) * MAX_ML) / STEP_ML) * STEP_ML;
    setMl(Math.max(STEP_ML, v));
  }

  async function add() {
    setSaving(true);
    await logHabit(habit, { date, value: toUnit(ml) });
    navigator.vibrate?.(15);
    setSaving(false);
    onClose();
  }

  const fmtMl = (v: number) => (v >= 1000 ? `${fmtNum(v / 1000)} L` : `${Math.round(v)} ml`);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <motion.div className="absolute inset-0 bg-ink/25 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Adaugă ${habit.name}`}
        className="relative flex w-full flex-col items-center overflow-hidden rounded-t-[28px] bg-surface px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 shadow-[var(--shadow-lift)] sm:max-w-[420px] sm:rounded-[28px]"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 36 }}
      >
        <div className="flex w-full items-center justify-between">
          <span className="text-[13px] font-medium text-ink-3">
            Azi: {fmtMl(drunkMl)}
            {targetMl > 0 && ` din ${fmtMl(targetMl)}`}
          </span>
          <button onClick={onClose} aria-label="Închide" className="grid size-8 place-items-center rounded-full text-ink-3 hover:bg-surface-2">
            <X size={18} />
          </button>
        </div>

        <p className="tabular mt-3 text-[56px] font-semibold leading-none tracking-[-0.04em]">
          {ml}
          <span className="ml-1 text-[22px] font-medium text-ink-3">ml</span>
        </p>

        {/* Paharul: trage în sus sau în jos */}
        <div
          ref={glass}
          role="slider"
          tabIndex={0}
          aria-label="Cantitate de apă"
          aria-valuemin={STEP_ML}
          aria-valuemax={MAX_ML}
          aria-valuenow={ml}
          aria-valuetext={`${ml} mililitri`}
          onPointerDown={(e) => {
            dragging.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            fromPointer(e.clientY);
          }}
          onPointerMove={(e) => dragging.current && fromPointer(e.clientY)}
          onPointerUp={() => {
            dragging.current = false;
            navigator.vibrate?.(8);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" || e.key === "ArrowRight") setMl((v) => Math.min(MAX_ML, v + STEP_ML));
            if (e.key === "ArrowDown" || e.key === "ArrowLeft") setMl((v) => Math.max(STEP_ML, v - STEP_ML));
          }}
          className="relative mt-5 h-[260px] w-[150px] cursor-ns-resize touch-none select-none outline-none"
          style={{ clipPath: "polygon(0 0, 100% 0, 88% 100%, 12% 100%)" }}
        >
          <div className="absolute inset-0 rounded-b-[18px] bg-work-soft" />
          <motion.div
            className="absolute inset-x-0 bottom-0"
            style={{ background: "linear-gradient(180deg, #5b9bf8 0%, var(--work) 100%)" }}
            animate={{ height: `${pct * 100}%` }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
          >
            {/* val */}
            <svg className="absolute -top-[9px] left-0 w-[200%] animate-[wave_2.4s_linear_infinite]" height="10" viewBox="0 0 300 10" preserveAspectRatio="none" aria-hidden>
              <path d="M0 5 Q 18.75 0 37.5 5 T 75 5 T 112.5 5 T 150 5 T 187.5 5 T 225 5 T 262.5 5 T 300 5 V10 H0Z" fill="#5b9bf8" />
            </svg>
          </motion.div>
          {/* gradații */}
          {[250, 500, 750].map((m) => (
            <div key={m} className="pointer-events-none absolute right-3 flex items-center gap-1" style={{ bottom: `${(m / MAX_ML) * 100}%` }}>
              <span className={`tabular text-[11px] font-medium ${ml >= m ? "text-white/80" : "text-ink-3"}`}>{m}</span>
              <span className={`h-px w-3 ${ml >= m ? "bg-white/70" : "bg-ink-3/50"}`} />
            </div>
          ))}
        </div>
        <p className="mt-3 text-[13px] text-ink-3">Trage în pahar ca să alegi cantitatea</p>

        <div className="mt-4 flex gap-2">
          {PRESETS.map((p) => (
            <button key={p} onClick={() => setMl(p)} aria-pressed={ml === p} className={`rounded-full px-3.5 py-2 text-[14px] font-semibold transition ${ml === p ? "bg-work text-white" : "bg-work-soft text-[#1c5fcc]"}`}>
              {p}
            </button>
          ))}
        </div>

        {targetMl > 0 && (
          <div className="mt-5 w-full">
            <div className="h-2 overflow-hidden rounded-full bg-work-soft">
              <div className="flex h-full">
                <div className="h-full bg-work" style={{ width: `${Math.min(1, drunkMl / targetMl) * 100}%` }} />
                <div className="h-full bg-work/40 transition-[width]" style={{ width: `${Math.max(0, Math.min(1, after / targetMl) - Math.min(1, drunkMl / targetMl)) * 100}%` }} />
              </div>
            </div>
            <p className="tabular mt-1.5 text-center text-[13px] text-ink-2">
              {after >= targetMl ? "Atingi ținta de azi! 🎉" : `După asta: ${fmtMl(after)} · mai ai ${fmtMl(targetMl - after)}`}
            </p>
          </div>
        )}

        <button onClick={add} disabled={saving} className="mt-5 w-full rounded-2xl bg-work py-3.5 text-[16px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-60">
          Adaugă {ml} ml
        </button>
      </motion.div>
    </div>
  );
}
