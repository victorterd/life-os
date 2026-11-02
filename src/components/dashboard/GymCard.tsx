import { Dumbbell, Play, Trophy } from "lucide-react";
import { MOCK_NEXT_WORKOUT } from "@/lib/mock";

export function GymCard() {
  const w = MOCK_NEXT_WORKOUT;
  return (
    <section className="relative overflow-hidden rounded-[28px] bg-fitness p-5 text-ink shadow-[var(--shadow-card)] sm:p-6">
      <Dumbbell className="absolute -bottom-4 -right-3 rotate-[-18deg] opacity-20" size={120} strokeWidth={1.6} aria-hidden />
      <p className="text-[13px] text-ink/70">Azi la sală, 18:30</p>
      <h2 className="mt-0.5 text-[34px] font-semibold leading-none tracking-tight">{w.name}</h2>
      <p className="mt-3 max-w-[30ch] text-[14px] leading-snug text-ink/80">{w.exercises.join(", ")}</p>
      <div className="mt-4 flex items-center gap-1.5 text-[13px] text-ink/80">
        <Trophy size={14} />
        Record: {w.last.pr}
      </div>
      <button className="relative mt-5 flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[14px] font-semibold text-white transition active:scale-[0.97]">
        <Play size={15} fill="currentColor" />
        Începe antrenamentul
      </button>
    </section>
  );
}
