"use client";

import { StoreProvider } from "@/lib/data/store";
import { TaskSheetProvider } from "@/components/tasks/TaskSheet";
import { HabitSheetProvider } from "@/components/habits/HabitSheet";
import { AppShell } from "@/components/shell/AppShell";
import { GymProvider } from "@/lib/data/gym";
import { JournalProvider } from "@/lib/data/journal";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <GymProvider>
      <JournalProvider>
      <TaskSheetProvider>
        <HabitSheetProvider>
          <AppShell>{children}</AppShell>
        </HabitSheetProvider>
      </TaskSheetProvider>
      </JournalProvider>
      </GymProvider>
    </StoreProvider>
  );
}
