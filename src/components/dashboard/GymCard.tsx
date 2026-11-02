"use client";

import Link from "next/link";
import { Dumbbell, Play, Trophy } from "lucide-react";
import { useGym, workoutStats, e1rm } from "@/lib/data/gym";
import { relativeDay, toISO } from "@/lib/dates";
import { useNow } from "@/lib/hooks/useNow";
import { useRouter } from "next/navigation";

export function GymCard() {
  const { ready, exercises, templates, templateExercises, workouts, sets, active, startWorkout } = useGym();
  const now = useNow();
  const router = useRouter();
  const done = workouts.filter((w) => w.ended_at).sort((a, b) => b.started_at.localeCompare(a.started_at));
  const lastBy = new Map<string, string>();
  for (const w of done) if (w.template_id && !lastBy.has(w.template_id)) lastBy.set(w.template_id, w.started_at);
  const next = [...templates].sort((a, b) => (lastBy.get(a.id) ?? "").localeCompare(lastBy.get(b.id) ?? ""))[0];
  const items = next ? templateExercises.filter((x) => x.template_id === next.id).sort((a, b) => a.sort_order - b.sort_order) : [];
  const since = (now?.getTime() ?? 0) - 7 * 86_400_000;
  const thisWeek = done.filter((w) => new Date(w.started_at).getTime() >= since).length;

  // cel mai bun set din ultimul antrenament
  const last = done[0];
  const best = last
    ? sets
        .filter((s) => s.workout_id === last.id && s.done && s.weight_kg && s.reps)
        .sort((a, b) => e1rm(Number(b.weight_kg), Number(b.reps)) - e1rm(Number(a.weight_kg), Number(a.reps)))[0]
    : undefined;

  return (
    <section className="relative flex flex-col overflow-hidden rounded-[28px] bg-fitness p-5 text-ink shadow-[var(--shadow-card)] sm:p-6">
      <Dumbbell className="absolute -bottom-4 -right-3 rotate-[-18deg] opacity-20" size={120} strokeWidth={1.6} aria-hidden />
      {!ready ? null : active ? (
        <>
          <p className="text-[13px] text-ink/70">În desfășurare</p>
          <h2 className="mt-0.5 text-[34px] font-semibold leading-none tracking-tight">{active.name}</h2>
          <Link href="/gym" className="relative mt-auto flex items-center gap-2 self-start rounded-full bg-ink px-4 py-2.5 pt-2.5 text-[14px] font-semibold text-white">
            <Play size={15} fill="currentColor" />
            Continuă antrenamentul
          </Link>
        </>
      ) : !exercises.length || !next ? (
        <>
          <p className="text-[13px] text-ink/70">Gym</p>
          <h2 className="mt-0.5 max-w-[14ch] text-[26px] font-semibold leading-tight tracking-tight">Pregătește-ți programele de sală</h2>
          <Link href="/gym" className="relative mt-5 self-start rounded-full bg-ink px-4 py-2.5 text-[14px] font-semibold text-white">
            Deschide Gym
          </Link>
        </>
      ) : (
        <>
          <p className="text-[13px] text-ink/70">
            Urmează · {thisWeek} {thisWeek === 1 ? "antrenament" : "antrenamente"} în 7 zile
          </p>
          <h2 className="mt-0.5 text-[34px] font-semibold leading-none tracking-tight">{next.name}</h2>
          <p className="mt-3 max-w-[30ch] text-[14px] leading-snug text-ink/80">
            {items
              .slice(0, 4)
              .map((x) => exercises.find((e) => e.id === x.exercise_id)?.name)
              .filter(Boolean)
              .join(", ")}
            {items.length > 4 ? ` +${items.length - 4}` : ""}
          </p>
          {last && (
            <div className="mt-4 flex items-center gap-1.5 text-[13px] text-ink/80">
              <Trophy size={14} />
              {relativeDay(toISO(new Date(last.started_at)))}: {last.name}, {workoutStats(last, sets).sets} seturi
              {best ? ` · top ${Number(best.weight_kg)} kg × ${best.reps}` : ""}
            </div>
          )}
          <button
            onClick={async () => {
              await startWorkout(next);
              router.push("/gym");
            }}
            className="relative mt-5 flex items-center gap-2 self-start rounded-full bg-ink px-4 py-2.5 text-[14px] font-semibold text-white transition active:scale-[0.97]"
          >
            <Play size={15} fill="currentColor" />
            Începe {next.name}
          </button>
        </>
      )}
    </section>
  );
}
