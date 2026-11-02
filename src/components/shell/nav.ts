import {
  CalendarDays,
  CheckCircle2,
  Dumbbell,
  NotebookPen,
  Repeat,
  Sun,
  Trophy,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; color: string };

export const NAV: NavItem[] = [
  { href: "/", label: "Azi", icon: Sun, color: "var(--navy)" },
  { href: "/taskuri", label: "Taskuri", icon: CheckCircle2, color: "var(--work)" },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, color: "var(--mind)" },
  { href: "/obiceiuri", label: "Obiceiuri", icon: Repeat, color: "var(--health)" },
  { href: "/gym", label: "Gym", icon: Dumbbell, color: "var(--fitness)" },
  { href: "/jurnal", label: "Jurnal", icon: NotebookPen, color: "var(--personal)" },
  { href: "/progres", label: "Progres", icon: Trophy, color: "var(--navy)" },
];
