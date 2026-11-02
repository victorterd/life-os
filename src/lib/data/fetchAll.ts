import type { PostgrestError } from "@supabase/supabase-js";

type Page<T> = PromiseLike<{ data: T[] | null; error: PostgrestError | null }>;

/** Supabase întoarce maxim 1000 de rânduri pe cerere; citim pagină cu pagină. */
export async function fetchAll<T>(page: (from: number, to: number) => Page<T>, size = 1000): Promise<{ data: T[]; error: PostgrestError | null }> {
  const out: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await page(from, from + size - 1);
    if (error) return { data: out, error };
    out.push(...(data ?? []));
    if (!data || data.length < size) return { data: out, error: null };
  }
}
