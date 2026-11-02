import { AREAS, levelFromXp, type AreaKey } from "@/lib/areas";

export function AreaStats({ xp }: { xp: Record<AreaKey, number> }) {
  return (
    <section className="rounded-[28px] bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
      <h2 className="mb-4 text-[17px] font-semibold tracking-tight">Ariile tale</h2>
      <ul className="flex flex-col gap-3.5">
        {(Object.keys(AREAS) as AreaKey[]).map((key) => {
          const area = AREAS[key];
          const lvl = levelFromXp(xp[key]);
          return (
            <li key={key}>
              <div className="mb-1.5 flex items-baseline justify-between text-[14px]">
                <span className="font-medium">{area.label}</span>
                <span className="tabular text-ink-3">
                  Nivel <span className="font-semibold" style={{ color: area.ink }}>{lvl.level}</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full" style={{ background: area.soft }}>
                <div className="h-full rounded-full" style={{ width: `${(lvl.into / lvl.needed) * 100}%`, background: area.color }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
