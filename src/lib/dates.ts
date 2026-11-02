// Toate datele sunt „locale” (YYYY-MM-DD), fără fus orar, ca să nu sară ziua la miezul nopții.

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function fromISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(): string {
  return toISO(new Date());
}

export function addDays(s: string, n: number): string {
  const d = fromISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function addMonths(s: string, n: number): string {
  const d = fromISO(s);
  return toISO(new Date(d.getFullYear(), d.getMonth() + n, 1));
}

/** 1 = luni … 7 = duminică */
export function isoWeekday(s: string): number {
  return ((fromISO(s).getDay() + 6) % 7) + 1;
}

export function weekStart(s: string): string {
  return addDays(s, 1 - isoWeekday(s));
}

export function monthStart(s: string): string {
  const d = fromISO(s);
  return toISO(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function monthEnd(s: string): string {
  const d = fromISO(s);
  return toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

export function weekDays(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function labelDay(s: string, opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }): string {
  return cap(fromISO(s).toLocaleDateString("ro-RO", opts));
}

export function labelMonth(s: string): string {
  return cap(fromISO(s).toLocaleDateString("ro-RO", { month: "long", year: "numeric" }));
}

export function labelWeek(start: string): string {
  const end = addDays(start, 6);
  const a = fromISO(start);
  const b = fromISO(end);
  const sameMonth = a.getMonth() === b.getMonth();
  const left = a.toLocaleDateString("ro-RO", sameMonth ? { day: "numeric" } : { day: "numeric", month: "short" });
  const right = b.toLocaleDateString("ro-RO", { day: "numeric", month: "long" });
  return `${left} – ${right}`;
}

export function relativeDay(s: string, today = todayISO()): string {
  if (s === today) return "Azi";
  if (s === addDays(today, 1)) return "Mâine";
  if (s === addDays(today, -1)) return "Ieri";
  return labelDay(s, { weekday: "short", day: "numeric", month: "short" });
}

export function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
