export type AreaKey = "health" | "fitness" | "mind" | "work" | "personal";

export const AREAS: Record<AreaKey, { label: string; color: string; soft: string; ink: string }> = {
  health: { label: "Sănătate", color: "var(--health)", soft: "var(--health-soft)", ink: "#13805a" },
  fitness: { label: "Fitness", color: "var(--fitness)", soft: "var(--fitness-soft)", ink: "#c4501f" },
  mind: { label: "Minte", color: "var(--mind)", soft: "var(--mind-soft)", ink: "#5a4bd6" },
  work: { label: "Muncă", color: "var(--work)", soft: "var(--work-soft)", ink: "#1c5fcc" },
  personal: { label: "Personal", color: "var(--personal)", soft: "var(--personal-soft)", ink: "#946200" },
};

// XP necesar pentru a trece de la nivelul n la n+1.
export function xpForLevel(level: number): number {
  return 100 + (level - 1) * 50;
}

export function levelFromXp(totalXp: number): { level: number; into: number; needed: number } {
  let level = 1;
  let rest = totalXp;
  while (rest >= xpForLevel(level)) {
    rest -= xpForLevel(level);
    level++;
  }
  return { level, into: rest, needed: xpForLevel(level) };
}
