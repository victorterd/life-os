"use client";

import { useState } from "react";
import { motion } from "motion/react";

const MOODS = [
  { emoji: "😣", label: "Foarte rău" },
  { emoji: "😕", label: "Rău" },
  { emoji: "😐", label: "Ok" },
  { emoji: "🙂", label: "Bine" },
  { emoji: "😄", label: "Foarte bine" },
];

export function MoodCard() {
  const [mood, setMood] = useState<number | null>(null);
  return (
    <section className="rounded-[28px] bg-personal-soft p-5 sm:p-6">
      <h2 className="text-[17px] font-semibold tracking-tight">Cum te simți acum?</h2>
      <p className="mt-0.5 text-[13px] text-ink-2">{mood === null ? "Un check-in rapid, pentru jurnal." : `Salvat: ${MOODS[mood].label.toLowerCase()}.`}</p>
      <div className="mt-4 flex justify-between gap-1">
        {MOODS.map((m, i) => (
          <motion.button
            key={m.label}
            onClick={() => setMood(i)}
            aria-label={m.label}
            aria-pressed={mood === i}
            whileTap={{ scale: 0.85 }}
            animate={{ scale: mood === i ? 1.15 : 1, opacity: mood === null || mood === i ? 1 : 0.4 }}
            className={`grid size-12 place-items-center rounded-2xl text-[26px] ${mood === i ? "bg-white shadow-[var(--shadow-card)]" : ""}`}
          >
            {m.emoji}
          </motion.button>
        ))}
      </div>
    </section>
  );
}
