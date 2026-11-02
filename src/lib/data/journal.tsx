"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "../supabase";
import { addDays, todayISO } from "../dates";
import { useStore } from "./store";
import { fetchAll } from "./fetchAll";

export type Mood = {
  id: string;
  date: string;
  mood: number;
  energy: number | null;
  sleep_hours: number | null;
  tags: string[];
  note: string | null;
  created_at: string;
};

export type EntryKind = "free" | "reframe";
export type Entry = { id: string; kind: EntryKind; date: string; title: string | null; body: string | null; created_at: string; updated_at: string };
export type ReframeItem = { id: string; entry_id: string; negative: string; positive: string | null; sort_order: number };

export const MOODS = [
  { v: 1, emoji: "😣", label: "Foarte rău" },
  { v: 2, emoji: "😕", label: "Rău" },
  { v: 3, emoji: "😐", label: "Ok" },
  { v: 4, emoji: "🙂", label: "Bine" },
  { v: 5, emoji: "😄", label: "Foarte bine" },
];

export const TAGS = ["Calm", "Recunoscător", "Motivat", "Productiv", "Iubit", "Odihnit", "Stresat", "Anxios", "Obosit", "Trist", "Iritat", "Singur", "Bolnav"];

const MOOD_XP = 10;
const ENTRY_XP = { free: 15, reframe: 20 } as const;

type Journal = {
  ready: boolean;
  moods: Mood[];
  entries: Entry[];
  items: ReframeItem[];
  saveMood: (date: string, patch: Partial<Omit<Mood, "id" | "date" | "created_at">> & { mood: number }) => Promise<void>;
  createEntry: (kind: EntryKind, date?: string) => Promise<Entry | null>;
  updateEntry: (id: string, patch: Partial<Pick<Entry, "title" | "body" | "date">>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  addItem: (entryId: string, negative?: string) => Promise<ReframeItem | null>;
  updateItem: (id: string, patch: Partial<Pick<ReframeItem, "negative" | "positive">>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
};

const Ctx = createContext<Journal | null>(null);
export function useJournal() {
  const j = useContext(Ctx);
  if (!j) throw new Error("useJournal must be used inside <JournalProvider>");
  return j;
}

export function JournalProvider({ children }: { children: React.ReactNode }) {
  const { session, grantXp, revokeXp } = useStore();
  const userId = session?.user.id ?? null;
  const [ready, setReady] = useState(false);
  const [moods, setMoods] = useState<Mood[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [items, setItems] = useState<ReframeItem[]>([]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const since = addDays(todayISO(), -730);
      const [m, e, it] = await Promise.all([
        fetchAll<Mood>((a, b) => supabase.from("mood_checkins").select("*").gte("date", since).order("date").range(a, b)),
        fetchAll<Entry>((a, b) => supabase.from("journal_entries").select("*").order("date", { ascending: false }).order("created_at", { ascending: false }).range(a, b)),
        fetchAll<ReframeItem>((a, b) => supabase.from("reframe_items").select("*").order("sort_order").range(a, b)),
      ]);
      if (cancelled) return;
      setMoods(m.data);
      setEntries(e.data);
      setItems(it.data);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const saveMood = useCallback<Journal["saveMood"]>(
    async (date, patch) => {
      const existing = moods.find((m) => m.date === date);
      if (existing) {
        setMoods((ms) => ms.map((m) => (m.id === existing.id ? { ...m, ...patch } : m)));
        await supabase.from("mood_checkins").update(patch).eq("id", existing.id);
        return;
      }
      const { data } = await supabase.from("mood_checkins").insert({ date, ...patch }).select("*").single();
      if (!data) return;
      setMoods((ms) => [...ms, data as Mood]);
      await grantXp("mind", MOOD_XP, "mood", (data as Mood).id);
    },
    [moods, grantXp],
  );

  const createEntry = useCallback<Journal["createEntry"]>(
    async (kind, date = todayISO()) => {
      const { data } = await supabase.from("journal_entries").insert({ kind, date }).select("*").single();
      if (!data) return null;
      setEntries((es) => [data as Entry, ...es]);
      await grantXp("mind", ENTRY_XP[kind], "journal", (data as Entry).id);
      return data as Entry;
    },
    [grantXp],
  );

  const updateEntry = useCallback<Journal["updateEntry"]>(async (id, patch) => {
    const updated_at = new Date().toISOString();
    setEntries((es) => es.map((e) => (e.id === id ? { ...e, ...patch, updated_at } : e)));
    await supabase.from("journal_entries").update({ ...patch, updated_at }).eq("id", id);
  }, []);

  const deleteEntry = useCallback<Journal["deleteEntry"]>(
    async (id) => {
      setEntries((es) => es.filter((e) => e.id !== id));
      setItems((xs) => xs.filter((x) => x.entry_id !== id));
      await supabase.from("journal_entries").delete().eq("id", id);
      await revokeXp("journal", id);
    },
    [revokeXp],
  );

  const addItem = useCallback<Journal["addItem"]>(
    async (entryId, negative = "") => {
      const order = items.filter((x) => x.entry_id === entryId).length;
      const { data } = await supabase.from("reframe_items").insert({ entry_id: entryId, negative, sort_order: order }).select("*").single();
      if (!data) return null;
      setItems((xs) => [...xs, data as ReframeItem]);
      return data as ReframeItem;
    },
    [items],
  );

  const updateItem = useCallback<Journal["updateItem"]>(async (id, patch) => {
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    await supabase.from("reframe_items").update(patch).eq("id", id);
  }, []);

  const deleteItem = useCallback<Journal["deleteItem"]>(async (id) => {
    setItems((xs) => xs.filter((x) => x.id !== id));
    await supabase.from("reframe_items").delete().eq("id", id);
  }, []);

  return (
    <Ctx.Provider value={{ ready, moods, entries, items, saveMood, createEntry, updateEntry, deleteEntry, addItem, updateItem, deleteItem }}>{children}</Ctx.Provider>
  );
}
