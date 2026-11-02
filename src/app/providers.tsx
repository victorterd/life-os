"use client";

import { StoreProvider } from "@/lib/data/store";
import { TaskSheetProvider } from "@/components/tasks/TaskSheet";
import { HabitSheetProvider } from "@/components/habits/HabitSheet";
import { AppShell } from "@/components/shell/AppShell";
import { GymProvider } from "@/lib/data/gym";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <GymProvider>
      <TaskSheetProvider>
        <HabitSheetProvider>
          <AppShell>{children}</AppShell>
        </HabitSheetProvider>
      </TaskSheetProvider>
      </GymProvider>
    </StoreProvider>
  );
}
