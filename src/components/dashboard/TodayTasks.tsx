"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Clock, Flag, ListChecks, Plus } from "lucide-react";
import { AREAS } from "@/lib/areas";
import type { MockTask, Priority } from "@/lib/mock";
import { CheckCircle } from "./CheckCircle";
import { XpBurst } from "./XpBurst";

const PRIORITY: Record<Priority, { label: string; color: string; soft: string } | null> = {
  high: { label: "Prioritate mare", color: "var(--danger)", soft: "var(--danger-soft)" },
  medium: { label: "Medie", color: "var(--ink-2)", soft: "var(--surface-2)" },
  low: null,
};

export function TodayTasks({ tasks, onToggle }: { tasks: MockTask[]; onToggle: (id: string) => void }) {
  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);
  const [next, ...rest] = open;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-[20px] font-semibold tracking-tight">Taskurile de azi</h2>
        <span className="tabular text-[14px] text-ink-3">
          {done.length} din {tasks.length} gata
        </span>
      </div>

      {next && (
        <motion.div layout initial={{ rotate: -1.6 }} animate={{ rotate: -1.6 }} className="origin-left">
          <TaskCard task={next} onToggle={onToggle} featured />
        </motion.div>
      )}

      <div className="flex flex-col gap-2">
        {rest.map((t) => (
          <motion.div key={t.id} layout transition={{ type: "spring", stiffness: 500, damping: 40 }}>
            <TaskCard task={t} onToggle={onToggle} />
          </motion.div>
        ))}
      </div>

      <button className="flex items-center gap-2 rounded-2xl border border-dashed border-line px-4 py-3 text-[15px] text-ink-3 transition hover:border-navy/40 hover:text-navy">
        <Plus size={18} />
        Adaugă un task pentru azi
      </button>

      {done.length > 0 && (
        <div className="mt-2 flex flex-col gap-1.5">
          <h3 className="px-1 text-[13px] font-medium text-ink-3">Gata</h3>
          {done.map((t) => (
            <motion.div key={t.id} layout transition={{ type: "spring", stiffness: 500, damping: 40 }}>
              <TaskCard task={t} onToggle={onToggle} />
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}

function TaskCard({ task, onToggle, featured }: { task: MockTask; onToggle: (id: string) => void; featured?: boolean }) {
  const [burst, setBurst] = useState(false);
  const area = AREAS[task.area];
  const prio = PRIORITY[task.priority];

  function toggle() {
    if (!task.done) {
      setBurst(true);
      setTimeout(() => setBurst(false), 900);
    }
    onToggle(task.id);
  }

  return (
    <div
      className={`relative flex gap-3.5 rounded-[20px] bg-surface transition ${
        featured ? "px-5 py-5 shadow-[var(--shadow-lift)]" : "px-4 py-3.5 shadow-[var(--shadow-card)]"
      } ${task.done ? "opacity-55" : ""}`}
    >
      <XpBurst show={burst} xp={task.xp} color={area.color} />
      <div className={featured ? "pt-0.5" : ""}>
        <CheckCircle checked={task.done} color={area.color} onToggle={toggle} label={task.title} />
      </div>
      <div className="min-w-0 flex-1">
        {featured && <div className="mb-1 text-[12px] font-medium text-ink-3">Următorul</div>}
        <p className={`${featured ? "text-[19px] font-semibold tracking-tight" : "text-[15px] font-medium"} ${task.done ? "line-through decoration-ink-3" : ""}`}>
          {task.title}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge color={area.ink} soft={area.soft}>{area.label}</Badge>
          {prio && !task.done && (
            <Badge color={prio.color} soft={prio.soft}>
              <Flag size={11} strokeWidth={2.6} />
              {prio.label}
            </Badge>
          )}
          {task.project && <span className="text-[12px] text-ink-3">{task.project}</span>}
          {task.time && (
            <span className="flex items-center gap-1 text-[12px] text-ink-3">
              <Clock size={12} />
              {task.time}
            </span>
          )}
          {task.subtasks && (
            <span className="tabular flex items-center gap-1 text-[12px] text-ink-3">
              <ListChecks size={12} />
              {task.subtasks.done}/{task.subtasks.total}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function Badge({ children, color, soft }: { children: React.ReactNode; color: string; soft: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium" style={{ color, background: soft }}>
      {children}
    </span>
  );
}
