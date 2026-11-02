"use client";

import { useEffect, useState } from "react";

// Ora curentă doar pe client (evită diferențe la randarea pe server).
export function useNow(intervalMs = 30_000): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const first = setTimeout(() => setNow(new Date()), 0);
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [intervalMs]);
  return now;
}
