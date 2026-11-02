"use client";

import { AnimatePresence, motion } from "motion/react";

// „+30 XP” care urcă și dispare deasupra elementului bifat.
export function XpBurst({ show, xp, color }: { show: boolean; xp: number; color: string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.span
          className="pointer-events-none absolute -top-1 right-2 z-10 rounded-full px-2 py-0.5 text-[12px] font-semibold text-white"
          style={{ background: color }}
          initial={{ opacity: 0, y: 6, scale: 0.8 }}
          animate={{ opacity: 1, y: -18, scale: 1 }}
          exit={{ opacity: 0, y: -30 }}
          transition={{ type: "spring", stiffness: 400, damping: 22 }}
        >
          +{xp} XP
        </motion.span>
      )}
    </AnimatePresence>
  );
}
