"use client";

import { StoreProvider } from "@/lib/data/store";
import { TaskSheetProvider } from "@/components/tasks/TaskSheet";
import { AppShell } from "@/components/shell/AppShell";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <TaskSheetProvider>
        <AppShell>{children}</AppShell>
      </TaskSheetProvider>
    </StoreProvider>
  );
}
