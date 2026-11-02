"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { TaskItem } from "@/components/tasks/TaskItem";
import { QuickAdd } from "@/components/tasks/TasksView";
import type { Task } from "@/lib/data/types";
import { todayISO } from "@/lib/dates";

export function TodayTasks({ tasks }: { tasks: Task[] }) {
  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);
  const [next, ...rest] = open;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-[20px] font-semibold tracking-tight">Taskurile de azi</h2>
        <Link href="/taskuri" className="tabular text-[14px] text-ink-3 hover:text-navy">
          {done.length} din {tasks.length} gata
        </Link>
      </div>

      {next && (
        <motion.div key={next.id} layout initial={{ rotate: 0, y: 6 }} animate={{ rotate: -1.6, y: 0 }} className="origin-left">
          <TaskItem task={next} featured />
        </motion.div>
      )}

      <div className="flex flex-col gap-2">
        {rest.map((t) => (
          <motion.div key={t.id} layout transition={{ type: "spring", stiffness: 500, damping: 40 }}>
            <TaskItem task={t} />
          </motion.div>
        ))}
      </div>

      <QuickAdd defaults={{ horizon: "day", period: todayISO() }} placeholder="Adaugă un task pentru azi" />

      {tasks.length === 0 && (
        <p className="px-1 text-[14px] text-ink-3">
          Ziua e liberă. Adaugă ce vrei să faci azi sau{" "}
          <Link href="/taskuri" className="font-medium text-navy">
            planifică săptămâna
          </Link>
          .
        </p>
      )}

      {done.length > 0 && (
        <div className="mt-2 flex flex-col gap-1.5">
          <h3 className="px-1 text-[13px] font-medium text-ink-3">Gata</h3>
          {done.map((t) => (
            <motion.div key={t.id} layout transition={{ type: "spring", stiffness: 500, damping: 40 }}>
              <TaskItem task={t} />
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}
