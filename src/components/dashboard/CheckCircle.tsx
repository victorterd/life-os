"use client";

import { motion } from "motion/react";

export function CheckCircle({ checked, color, onToggle, label }: { checked: boolean; color: string; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      className="grid size-7 shrink-0 place-items-center rounded-full border-2 transition-colors active:scale-90"
      style={{ borderColor: checked ? color : "var(--line)", background: checked ? color : "transparent" }}
    >
      <motion.svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
        <motion.path
          d="M3 7.5 5.8 10 11 4"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        />
      </motion.svg>
    </button>
  );
}
