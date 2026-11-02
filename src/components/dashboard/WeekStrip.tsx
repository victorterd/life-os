import { Check, Flame } from "lucide-react";

const DAYS = ["L", "Ma", "Mi", "J", "V", "S", "D"];

export function WeekStrip({ week, todayIndex, streak }: { week: boolean[]; todayIndex: number; streak: number }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[15px] font-semibold">Săptămâna ta</h2>
        <span className="flex items-center gap-1 text-[13px] font-medium text-fitness">
          <Flame size={15} strokeWidth={2.4} />
          {streak > 0 ? `${streak} ${streak === 1 ? "zi" : "zile"} la rând` : "Fă din azi prima zi"}
        </span>
      </div>
      <ol className="grid grid-cols-7 gap-1.5">
        {DAYS.map((d, i) => {
          const done = week[i];
          const isToday = i === todayIndex;
          const future = i > todayIndex;
          return (
            <li key={d} className="flex flex-col items-center gap-1.5">
              <span className={`text-[12px] ${isToday ? "font-semibold text-ink" : "text-ink-3"}`}>{d}</span>
              <span
                className={`grid size-9 place-items-center rounded-full transition ${
                  done
                    ? "bg-fitness text-white"
                    : isToday
                      ? "border-2 border-dashed border-fitness/60"
                      : future
                        ? "border border-line"
                        : "bg-surface-2"
                }`}
                aria-label={done ? `${d}: completă` : `${d}: necompletă`}
              >
                {done && <Check size={16} strokeWidth={3} />}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
