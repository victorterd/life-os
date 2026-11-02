"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useJournal, MOODS } from "@/lib/data/journal";
import { todayISO } from "@/lib/dates";

export function MoodCard() {
  const { ready, moods, saveMood } = useJournal();
  const today = todayISO();
  const m = moods.find((x) => x.date === today);

  return (
    <section className="flex flex-col rounded-[28px] bg-personal-soft p-5 sm:p-6">
      <h2 className="text-[17px] font-semibold tracking-tight">Cum te simți azi?</h2>
      <p className="mt-0.5 text-[13px] text-ink-2">
        {m ? (
          <>
            Salvat: {MOODS[m.mood - 1].label.toLowerCase()}.{" "}
            <Link href="/jurnal" className="font-medium text-[#946200] underline underline-offset-2">
              Adaugă detalii
            </Link>
          </>
        ) : (
          "Un check-in rapid, pentru jurnal."
        )}
      </p>
      <div className="mt-4 flex justify-between gap-1">
        {MOODS.map((x) => (
          <motion.button
            key={x.v}
            disabled={!ready}
            onClick={() => saveMood(today, { mood: x.v })}
            aria-label={x.label}
            aria-pressed={m?.mood === x.v}
            whileTap={{ scale: 0.85 }}
            animate={{ scale: m?.mood === x.v ? 1.15 : 1, opacity: !m || m.mood === x.v ? 1 : 0.4 }}
            className={`grid size-12 place-items-center rounded-2xl text-[26px] ${m?.mood === x.v ? "bg-white shadow-[var(--shadow-card)]" : ""}`}
          >
            {x.emoji}
          </motion.button>
        ))}
      </div>
    </section>
  );
}
