"use client";

import { useState } from "react";
import { Clock, Flag, FolderClosed, ListChecks, Repeat, Target } from "lucide-react";
import { AREAS } from "@/lib/areas";
import { relativeDay, timeRange, todayISO } from "@/lib/dates";
import { useStore } from "@/lib/data/store";
import { TASK_XP, type Task } from "@/lib/data/types";
import { CheckCircle } from "@/components/dashboard/CheckCircle";
import { XpBurst } from "@/components/dashboard/XpBurst";
import { useTaskSheet } from "./TaskSheet";

export function TaskItem({
  task,
  featured,
  showDate,
  compact,
}: {
  task: Task;
  featured?: boolean;
  showDate?: boolean;
  compact?: boolean;
}) {
  const { toggleTask, subtasks, projects, tasks } = useStore();
  const sheet = useTaskSheet();
  const [burst, setBurst] = useState(false);
  const area = AREAS[task.area];
  const subs = subtasks.filter((s) => s.task_id === task.id);
  const project = projects.find((p) => p.id === task.project_id);
  const goal = task.parent_id ? tasks.find((t) => t.id === task.parent_id) : null;
  const xp = TASK_XP[task.horizon][task.priority];
  const overdue = !task.done && task.horizon === "day" && task.period && task.period < todayISO();

  function toggle() {
    if (!task.done) {
      setBurst(true);
      setTimeout(() => setBurst(false), 900);
    }
    toggleTask(task.id);
  }

  return (
    <div
      className={`relative flex gap-3 rounded-[20px] bg-surface transition ${
        featured ? "px-5 py-5 shadow-[var(--shadow-lift)]" : compact ? "px-3 py-2.5 shadow-[var(--shadow-card)]" : "px-4 py-3.5 shadow-[var(--shadow-card)]"
      } ${task.done ? "opacity-55" : ""}`}
    >
      <XpBurst show={burst} xp={xp} color={area.color} />
      <div className={featured ? "pt-0.5" : ""}>
        <CheckCircle checked={task.done} color={area.color} onToggle={toggle} label={task.title} />
      </div>
      <button onClick={() => sheet.open(task)} className="min-w-0 flex-1 text-left">
        {featured && <div className="mb-1 text-[12px] font-medium text-ink-3">Următorul</div>}
        <p
          className={`${featured ? "text-[19px] font-semibold tracking-tight" : compact ? "text-[14px] font-medium" : "text-[15px] font-medium"} ${
            task.done ? "line-through decoration-ink-3" : ""
          }`}
        >
          {task.title}
        </p>
        {!compact && (
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <Badge color={area.ink} soft={area.soft}>{area.label}</Badge>
            {task.priority === "high" && !task.done && (
              <Badge color="var(--danger)" soft="var(--danger-soft)">
                <Flag size={11} strokeWidth={2.6} />
                Prioritate mare
              </Badge>
            )}
            {goal && (
              <Meta>
                <Target size={12} />
                {goal.title}
              </Meta>
            )}
            {project && (
              <Meta>
                <FolderClosed size={12} />
                {project.name}
              </Meta>
            )}
            {showDate && task.period && task.horizon === "day" && (
              <Meta danger={!!overdue}>{relativeDay(task.period)}</Meta>
            )}
            {task.start_time && (
              <Meta>
                <Clock size={12} />
                {timeRange(task.start_time, task.duration_min)}
              </Meta>
            )}
            {subs.length > 0 && (
              <Meta>
                <ListChecks size={12} />
                <span className="tabular">
                  {subs.filter((s) => s.done).length}/{subs.length}
                </span>
              </Meta>
            )}
            {task.recurrence && (
              <Meta>
                <Repeat size={12} />
              </Meta>
            )}
          </div>
        )}
      </button>
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

function Meta({ children, danger }: { children: React.ReactNode; danger?: boolean }) {
  return <span className={`inline-flex items-center gap-1 text-[12px] ${danger ? "font-medium text-danger" : "text-ink-3"}`}>{children}</span>;
}
