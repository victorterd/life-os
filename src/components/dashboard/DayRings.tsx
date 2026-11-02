"use client";

import { motion } from "motion/react";

export type Ring = { label: string; value: number; target: number; color: string; unit?: string };

const SIZE = 168;
const STROKE = 15;
const GAP = 4;

export function DayRings({ rings }: { rings: Ring[] }) {
  return (
    <div className="flex items-center gap-6">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="shrink-0 -rotate-90" role="img" aria-label="Progresul zilei">
        {rings.map((ring, i) => {
          const r = SIZE / 2 - STROKE / 2 - i * (STROKE + GAP);
          const c = 2 * Math.PI * r;
          const pct = ring.target ? Math.min(ring.value / ring.target, 1) : 0;
          return (
            <g key={ring.label}>
              <circle cx={SIZE / 2} cy={SIZE / 2} r={r} fill="none" stroke={ring.color} strokeOpacity={0.14} strokeWidth={STROKE} />
              <motion.circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={r}
                fill="none"
                stroke={ring.color}
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={c}
                initial={{ strokeDashoffset: c }}
                animate={{ strokeDashoffset: c * (1 - pct) }}
                transition={{ type: "spring", stiffness: 60, damping: 18, delay: 0.15 + i * 0.12 }}
              />
            </g>
          );
        })}
      </svg>

      <ul className="flex flex-col gap-3">
        {rings.map((ring) => (
          <li key={ring.label}>
            <div className="flex items-center gap-2 text-[13px] text-ink-2">
              <span className="size-2 rounded-full" style={{ background: ring.color }} />
              {ring.label}
            </div>
            <div className="tabular text-[22px] font-semibold leading-tight tracking-tight">
              {ring.value}
              <span className="text-ink-3">/{ring.target}</span>
              {ring.unit && <span className="ml-1 text-[14px] font-medium text-ink-3">{ring.unit}</span>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
