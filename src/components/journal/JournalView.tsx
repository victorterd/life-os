"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, BatteryFull, BatteryLow, BatteryMedium, Minus, Moon, PenLine, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import { useJournal, MOODS, TAGS, type Entry, type Mood } from "@/lib/data/journal";
import { useStore } from "@/lib/data/store";
import { useGym } from "@/lib/data/gym";
import { dayProgress, isDueOn } from "@/lib/data/habits";
import { addDays, labelDay, relativeDay, toISO, todayISO } from "@/lib/dates";
import { useNow } from "@/lib/hooks/useNow";
import { LineChart } from "@/components/charts/Charts";

type Tab = "today" | "entries" | "stats";

export function JournalView() {
  const now = useNow();
  const j = useJournal();
  const [tab, setTab] = useState<Tab>("today");
  const [open, setOpen] = useState<Entry | null>(null);
  if (!now || !j.ready) return <div className="py-20 text-center text-ink-3">Se încarcă…</div>;
  const today = todayISO();

  async function create(kind: Entry["kind"]) {
    const e = await j.createEntry(kind);
    if (e) setOpen(e);
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[40px] font-semibold leading-none tracking-[-0.03em] sm:text-[52px]">Jurnal</h1>
        <div role="tablist" className="flex rounded-2xl bg-surface p-1 shadow-[var(--shadow-card)]">
          {(
            [
              ["today", "Azi"],
              ["entries", "Însemnări"],
              ["stats", "Statistici"],
            ] as const
          ).map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className="relative rounded-xl px-3.5 py-2 text-[14px] font-medium sm:px-4" style={{ color: tab === k ? "var(--ink)" : "var(--ink-2)" }}>
              {tab === k && <motion.span layoutId="journal-tab" className="absolute inset-0 rounded-xl bg-personal" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
              <span className="relative">{label}</span>
            </button>
          ))}
        </div>
      </header>

      {tab === "today" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <CheckIn date={today} />
          </div>
          <div className="flex flex-col gap-4 lg:col-span-5">
            <button onClick={() => create("reframe")} className="group relative overflow-hidden rounded-[26px] text-left shadow-[var(--shadow-card)] transition active:scale-[0.99]">
              <div className="bg-ink px-5 pb-4 pt-5 text-white">
                <p className="text-[13px] font-semibold text-white/55">Negativ</p>
                <p className="mt-1 text-[17px] leading-snug">Ce te apasă, ce frici ai. Scrie tot, fără filtru.</p>
              </div>
              <div className="relative bg-health-soft px-5 pb-5 pt-4">
                <span className="absolute -top-4 left-5 grid size-8 place-items-center rounded-full bg-health text-white shadow-[var(--shadow-card)]">
                  <ArrowDown size={16} />
                </span>
                <p className="text-[13px] font-semibold text-[#13805a]">Pozitiv</p>
                <p className="mt-1 text-[17px] leading-snug text-ink">Fiecare lucru, privit din alt unghi.</p>
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-[14px] font-semibold text-white">
                  <Plus size={15} />
                  Începe un exercițiu
                </span>
              </div>
            </button>
            <button onClick={() => create("free")} className="flex items-center gap-3 rounded-[22px] bg-surface p-5 text-left shadow-[var(--shadow-card)] transition active:scale-[0.99]">
              <span className="grid size-11 place-items-center rounded-2xl bg-personal-soft text-[#946200]">
                <PenLine size={20} />
              </span>
              <span>
                <span className="block text-[16px] font-semibold">Scrie liber</span>
                <span className="block text-[13px] text-ink-3">Gânduri, ziua de azi, idei</span>
              </span>
            </button>
            <EntryList entries={j.entries.filter((e) => e.date === today)} onOpen={setOpen} empty="Nicio însemnare azi." />
          </div>
        </div>
      )}

      {tab === "entries" && <AllEntries onOpen={setOpen} />}
      {tab === "stats" && <Stats today={today} />}

      <AnimatePresence>
        {open && (open.kind === "reframe" ? <ReframeEditor key={open.id} entryId={open.id} onClose={() => setOpen(null)} /> : <FreeEditor key={open.id} entryId={open.id} onClose={() => setOpen(null)} />)}
      </AnimatePresence>
    </div>
  );
}

// ------------------------------------------------------------------ Check-in

const ENERGY = [
  { v: 1, label: "Foarte puțină", Icon: BatteryLow },
  { v: 2, label: "Puțină", Icon: BatteryLow },
  { v: 3, label: "Medie", Icon: BatteryMedium },
  { v: 4, label: "Bună", Icon: BatteryFull },
  { v: 5, label: "Foarte bună", Icon: BatteryFull },
];

export function CheckIn({ date }: { date: string }) {
  const { moods, saveMood } = useJournal();
  const m = moods.find((x) => x.date === date);
  const [note, setNote] = useState(m?.note ?? "");

  const save = (patch: Partial<Mood>) => saveMood(date, { mood: m?.mood ?? 3, ...patch });

  return (
    <section className="flex flex-col gap-6 rounded-[28px] bg-surface p-5 shadow-[var(--shadow-card)] sm:p-7">
      <div>
        <h2 className="text-[22px] font-semibold tracking-tight">Cum te simți azi?</h2>
        <div className="mt-4 flex justify-between gap-1">
          {MOODS.map((x) => (
            <motion.button
              key={x.v}
              onClick={() => save({ mood: x.v })}
              aria-label={x.label}
              aria-pressed={m?.mood === x.v}
              whileTap={{ scale: 0.85 }}
              animate={{ scale: m?.mood === x.v ? 1.12 : 1, opacity: !m || m.mood === x.v ? 1 : 0.38 }}
              className={`flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 ${m?.mood === x.v ? "bg-personal-soft" : ""}`}
            >
              <span className="text-[34px] sm:text-[40px]">{x.emoji}</span>
              <span className="text-[11px] font-medium text-ink-3">{x.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 text-[13px] font-medium text-ink-3">Energie</h3>
          <div className="flex gap-1.5">
            {ENERGY.map(({ v, label, Icon }) => (
              <button
                key={v}
                onClick={() => save({ energy: v })}
                aria-label={`Energie ${label}`}
                aria-pressed={m?.energy === v}
                className={`grid h-11 flex-1 place-items-center rounded-xl transition ${m?.energy != null && v <= m.energy ? "bg-health text-white" : "bg-surface-2 text-ink-3"}`}
              >
                <Icon size={18} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-ink-3">
            <Moon size={13} /> Somn azi-noapte
          </h3>
          <div className="flex items-center gap-3">
            <button onClick={() => save({ sleep_hours: Math.max(0, (Number(m?.sleep_hours) || 7) - 0.5) })} aria-label="Mai puțin somn" className="grid size-11 place-items-center rounded-full bg-surface-2">
              <Minus size={18} />
            </button>
            <span className="tabular min-w-20 text-center text-[24px] font-semibold">
              {m?.sleep_hours != null ? Number(m.sleep_hours).toLocaleString("ro-RO") : "–"}
              <span className="ml-1 text-[14px] font-medium text-ink-3">ore</span>
            </span>
            <button onClick={() => save({ sleep_hours: Math.min(14, (Number(m?.sleep_hours) || 6.5) + 0.5) })} aria-label="Mai mult somn" className="grid size-11 place-items-center rounded-full bg-surface-2">
              <Plus size={18} />
            </button>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-[13px] font-medium text-ink-3">Ce descrie ziua?</h3>
        <div className="flex flex-wrap gap-1.5">
          {TAGS.map((t) => {
            const on = m?.tags?.includes(t);
            return (
              <button
                key={t}
                onClick={() => save({ tags: on ? m!.tags.filter((x) => x !== t) : [...(m?.tags ?? []), t] })}
                aria-pressed={on}
                className={`rounded-full border px-3 py-1.5 text-[14px] font-medium transition ${on ? "border-mind bg-mind-soft text-[#5a4bd6]" : "border-line text-ink-2"}`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => note !== (m?.note ?? "") && save({ note: note.trim() || null })}
        placeholder="Un gând scurt despre azi (opțional)"
        rows={2}
        className="field-sizing-content min-h-16 resize-none rounded-2xl bg-surface-2 px-4 py-3 text-[15px] outline-none focus:bg-white focus:ring-2 focus:ring-personal"
      />
    </section>
  );
}

// ------------------------------------------------------------------ Liste

function preview(e: Entry, items: { entry_id: string; negative: string; positive: string | null }[]) {
  if (e.kind === "reframe") {
    const its = items.filter((x) => x.entry_id === e.id);
    const done = its.filter((x) => x.positive?.trim()).length;
    return { title: e.title || "Negativ → Pozitiv", text: its[0]?.negative || "Exercițiu gol", meta: `${done}/${its.length} reformulate` };
  }
  return { title: e.title || "Fără titlu", text: e.body?.slice(0, 160) || "Gol", meta: e.body ? `${e.body.trim().split(/\s+/).length} cuvinte` : "" };
}

function EntryList({ entries, onOpen, empty }: { entries: Entry[]; onOpen: (e: Entry) => void; empty: string }) {
  const { items } = useJournal();
  if (!entries.length) return <p className="px-1 text-[14px] text-ink-3">{empty}</p>;
  return (
    <ul className="flex flex-col gap-2">
      {entries.map((e) => {
        const p = preview(e, items);
        return (
          <li key={e.id}>
            <button onClick={() => onOpen(e)} className="flex w-full gap-3 rounded-[20px] bg-surface p-4 text-left shadow-[var(--shadow-card)]">
              <span className={`mt-0.5 h-10 w-1.5 shrink-0 rounded-full ${e.kind === "reframe" ? "bg-health" : "bg-personal"}`} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[15px] font-semibold">{p.title}</span>
                  <span className="shrink-0 text-[12px] text-ink-3">{p.meta}</span>
                </span>
                <span className="mt-0.5 line-clamp-2 block text-[14px] text-ink-2">{p.text}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function AllEntries({ onOpen }: { onOpen: (e: Entry) => void }) {
  const { entries, items } = useJournal();
  const [q, setQ] = useState("");
  const filtered = entries.filter((e) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (
      (e.title ?? "").toLowerCase().includes(s) ||
      (e.body ?? "").toLowerCase().includes(s) ||
      items.some((x) => x.entry_id === e.id && (x.negative.toLowerCase().includes(s) || (x.positive ?? "").toLowerCase().includes(s)))
    );
  });
  const byDate = new Map<string, Entry[]>();
  for (const e of filtered) byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]);

  return (
    <div className="flex max-w-[760px] flex-col gap-5">
      <label className="flex items-center gap-2 rounded-2xl bg-surface px-4 py-3 shadow-[var(--shadow-card)]">
        <Search size={18} className="text-ink-3" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Caută în jurnal" className="flex-1 bg-transparent text-[15px] outline-none" />
      </label>
      {[...byDate.entries()].map(([date, es]) => (
        <section key={date} className="flex flex-col gap-2">
          <h3 className="px-1 text-[14px] font-semibold text-ink-2">{relativeDay(date)}</h3>
          <EntryList entries={es} onOpen={onOpen} empty="" />
        </section>
      ))}
      {!filtered.length && <p className="py-10 text-center text-[15px] text-ink-3">{q ? "Nimic găsit." : "Jurnalul e gol. Prima însemnare începe din tab-ul Azi."}</p>}
    </div>
  );
}

// ------------------------------------------------------------------ Editoare

function Sheet({ children, onClose, tone = "surface" }: { children: React.ReactNode; onClose: () => void; tone?: "surface" | "canvas" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <motion.div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        role="dialog"
        aria-modal="true"
        className={`relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[28px] shadow-[var(--shadow-lift)] sm:max-w-[720px] sm:rounded-[28px] ${tone === "canvas" ? "bg-canvas" : "bg-surface"}`}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 36 }}
      >
        {children}
      </motion.div>
    </div>
  );
}

function EditorHeader({ entry, onClose, label }: { entry: Entry; onClose: () => void; label: string }) {
  const { deleteEntry } = useJournal();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="flex items-center gap-2 px-5 pt-4 sm:px-7">
      <span className="flex-1 text-[13px] font-medium text-ink-3">
        {label} · {labelDay(entry.date)}
      </span>
      {confirm ? (
        <button
          onClick={async () => {
            await deleteEntry(entry.id);
            onClose();
          }}
          className="rounded-lg bg-danger px-2.5 py-1 text-[13px] font-medium text-white"
        >
          Da, șterge
        </button>
      ) : (
        <button onClick={() => setConfirm(true)} aria-label="Șterge însemnarea" className="grid size-8 place-items-center rounded-full text-ink-3 hover:bg-danger-soft hover:text-danger">
          <Trash2 size={16} />
        </button>
      )}
      <button onClick={onClose} aria-label="Închide" className="grid size-8 place-items-center rounded-full text-ink-3 hover:bg-surface-2">
        <X size={18} />
      </button>
    </div>
  );
}

function FreeEditor({ entryId, onClose }: { entryId: string; onClose: () => void }) {
  const { entries, updateEntry } = useJournal();
  const entry = entries.find((e) => e.id === entryId);
  const [title, setTitle] = useState(entry?.title ?? "");
  const [body, setBody] = useState(entry?.body ?? "");
  if (!entry) return null;

  const close = async () => {
    if (title !== (entry.title ?? "") || body !== (entry.body ?? "")) await updateEntry(entry.id, { title: title.trim() || null, body });
    onClose();
  };

  return (
    <Sheet onClose={close}>
      <EditorHeader entry={entry} onClose={onClose} label="Jurnal liber" />
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 pb-6 pt-3 sm:px-7">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titlu (opțional)" className="bg-transparent text-[26px] font-semibold tracking-tight outline-none placeholder:text-ink-3/60" />
        <textarea
          autoFocus
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onBlur={() => body !== (entry.body ?? "") && updateEntry(entry.id, { body })}
          placeholder="Scrie ce ai pe suflet…"
          className="min-h-[50dvh] flex-1 resize-none bg-transparent font-serif text-[21px] leading-[1.55] outline-none placeholder:text-ink-3/60"
        />
      </div>
      <div className="border-t border-line px-5 py-3 text-right sm:px-7">
        <button onClick={close} className="rounded-xl bg-ink px-5 py-2.5 text-[15px] font-medium text-white">
          Gata
        </button>
      </div>
    </Sheet>
  );
}

function ReframeEditor({ entryId, onClose }: { entryId: string; onClose: () => void }) {
  const { entries, items, addItem, updateItem, deleteItem, updateEntry } = useJournal();
  const entry = entries.find((e) => e.id === entryId);
  const pairs = items.filter((x) => x.entry_id === entryId).sort((a, b) => a.sort_order - b.sort_order);
  const [draft, setDraft] = useState("");
  if (!entry) return null;

  async function add() {
    if (!draft.trim()) return;
    await addItem(entryId, draft.trim());
    setDraft("");
  }

  return (
    <Sheet onClose={onClose} tone="canvas">
      <EditorHeader entry={entry} onClose={onClose} label="Negativ → Pozitiv" />
      <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-6 pt-3 sm:px-7">
        <input
          defaultValue={entry.title ?? ""}
          onBlur={(e) => e.target.value !== (entry.title ?? "") && updateEntry(entry.id, { title: e.target.value.trim() || null })}
          placeholder="Despre ce e vorba? (opțional)"
          className="bg-transparent px-1 text-[22px] font-semibold tracking-tight outline-none placeholder:text-ink-3/60"
        />

        {pairs.map((p, i) => (
          <motion.div key={p.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-[22px] shadow-[var(--shadow-card)]">
            <div className="relative bg-ink px-4 pb-4 pt-3 text-white sm:px-5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-white/55">Negativ {i + 1}</span>
                <button onClick={() => deleteItem(p.id)} aria-label="Șterge perechea" className="text-white/40 hover:text-white">
                  <X size={15} />
                </button>
              </div>
              <textarea
                defaultValue={p.negative}
                onBlur={(e) => e.target.value !== p.negative && updateItem(p.id, { negative: e.target.value })}
                rows={1}
                className="field-sizing-content mt-1 w-full resize-none bg-transparent text-[16px] leading-snug outline-none"
              />
            </div>
            <div className="relative bg-health-soft px-4 pb-4 pt-5 sm:px-5">
              <span className="absolute -top-3.5 left-4 grid size-7 place-items-center rounded-full bg-health text-white sm:left-5">
                <Sparkles size={14} />
              </span>
              <span className="text-[12px] font-semibold text-[#13805a]">Pozitiv</span>
              <textarea
                defaultValue={p.positive ?? ""}
                onBlur={(e) => e.target.value !== (p.positive ?? "") && updateItem(p.id, { positive: e.target.value })}
                rows={1}
                placeholder="Cum ai vedea asta dintr-o perspectivă bună? Ce poți învăța, ce poți controla?"
                className="field-sizing-content mt-1 w-full resize-none bg-transparent text-[16px] leading-snug text-ink outline-none placeholder:text-[#13805a]/55"
              />
            </div>
          </motion.div>
        ))}

        <div className="rounded-[22px] bg-ink/90 p-4 text-white sm:p-5">
          <span className="text-[12px] font-semibold text-white/55">{pairs.length ? "Încă ceva negativ?" : "Ce te apasă acum?"}</span>
          <textarea
            autoFocus={!pairs.length}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                add();
              }
            }}
            rows={2}
            placeholder="O frică, o grijă, ceva ce te-a supărat…"
            className="field-sizing-content mt-1 w-full resize-none bg-transparent text-[16px] leading-snug outline-none placeholder:text-white/35"
          />
          <button onClick={add} disabled={!draft.trim()} className="mt-2 flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[14px] font-semibold text-ink disabled:opacity-40">
            <Plus size={15} />
            Adaugă
          </button>
        </div>
      </div>
      <div className="border-t border-line bg-surface px-5 py-3 text-right sm:px-7">
        <button onClick={onClose} className="rounded-xl bg-ink px-5 py-2.5 text-[15px] font-medium text-white">
          Gata
        </button>
      </div>
    </Sheet>
  );
}

// ------------------------------------------------------------------ Statistici

type Metric = "mood" | "energy" | "sleep_hours";
const METRICS: { key: Metric; label: string; unit: string; min: number; max: number }[] = [
  { key: "mood", label: "Stare", unit: "", min: 1, max: 5 },
  { key: "energy", label: "Energie", unit: "", min: 1, max: 5 },
  { key: "sleep_hours", label: "Somn", unit: " h", min: 0, max: 10 },
];

function avg(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

function Stats({ today }: { today: string }) {
  const { moods } = useJournal();
  const { habits, habitLogs } = useStore();
  const { workouts } = useGym();
  const [metric, setMetric] = useState<Metric>("mood");
  const [range, setRange] = useState(30);
  const m = METRICS.find((x) => x.key === metric)!;
  const byDate = useMemo(() => new Map(moods.map((x) => [x.date, x])), [moods]);

  const series = Array.from({ length: range }, (_, i) => {
    const d = addDays(today, i - range + 1);
    const v = byDate.get(d)?.[metric];
    return { x: d, y: v == null ? null : Number(v), label: labelDay(d, { day: "numeric", month: "short" }) };
  });

  const recent = moods.filter((x) => x.date > addDays(today, -range));
  const avgMood = avg(recent.map((x) => x.mood));
  const avgEnergy = avg(recent.filter((x) => x.energy != null).map((x) => Number(x.energy)));
  const avgSleep = avg(recent.filter((x) => x.sleep_hours != null).map((x) => Number(x.sleep_hours)));

  const tagCounts = new Map<string, number>();
  for (const x of recent) for (const t of x.tags ?? []) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  const tags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxTag = tags[0]?.[1] ?? 1;

  // Corelații: starea medie în zilele cu / fără un obicei sau antrenament
  const insights = useMemo(() => {
    const out: { text: string; diff: number }[] = [];
    const sample = moods.filter((x) => x.date > addDays(today, -120));
    const gymDays = new Set(workouts.filter((w) => w.ended_at).map((w) => toISO(new Date(w.started_at))));
    const compare = (name: string, has: (d: string) => boolean | null) => {
      const yes: number[] = [];
      const no: number[] = [];
      for (const s of sample) {
        const h = has(s.date);
        if (h === null) continue;
        (h ? yes : no).push(s.mood);
      }
      if (yes.length < 3 || no.length < 3) return;
      const diff = avg(yes)! - avg(no)!;
      if (Math.abs(diff) < 0.25) return;
      out.push({
        diff,
        text: `În zilele cu ${name}, starea ta e ${diff > 0 ? "mai bună" : "mai slabă"} cu ${Math.abs(diff).toLocaleString("ro-RO", { maximumFractionDigits: 1 })} puncte.`,
      });
    };
    if (gymDays.size) compare("sală", (d) => gymDays.has(d));
    for (const h of habits) {
      if (h.kind === "weekly") compare(h.name.toLowerCase(), (d) => habitLogs.some((l) => l.habit_id === h.id && l.date === d));
      else compare(h.name.toLowerCase(), (d) => (isDueOn(h, d) ? dayProgress(h, habitLogs, d).complete : null));
    }
    const slept = sample.filter((x) => x.sleep_hours != null);
    const good = slept.filter((x) => Number(x.sleep_hours) >= 7).map((x) => x.mood);
    const bad = slept.filter((x) => Number(x.sleep_hours) < 7).map((x) => x.mood);
    if (good.length >= 3 && bad.length >= 3) {
      const diff = avg(good)! - avg(bad)!;
      if (Math.abs(diff) >= 0.25)
        out.push({ diff, text: `Când dormi 7 ore sau mai mult, starea ta e ${diff > 0 ? "mai bună" : "mai slabă"} cu ${Math.abs(diff).toLocaleString("ro-RO", { maximumFractionDigits: 1 })} puncte.` });
    }
    return out.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)).slice(0, 5);
  }, [moods, habits, habitLogs, workouts, today]);

  const f = (v: number | null, d = 1) => (v == null ? "–" : v.toLocaleString("ro-RO", { maximumFractionDigits: d }));

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <section className="flex flex-col gap-5 rounded-[26px] bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6 lg:col-span-8">
        <div className="grid grid-cols-3 gap-3">
          <BigStat value={avgMood ? MOODS[Math.round(avgMood) - 1].emoji : "–"} label={`stare medie (${f(avgMood)})`} />
          <BigStat value={f(avgEnergy)} label="energie medie" />
          <BigStat value={avgSleep == null ? "–" : `${f(avgSleep)} h`} label="somn mediu" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1">
            {METRICS.map((x) => (
              <button key={x.key} onClick={() => setMetric(x.key)} aria-pressed={metric === x.key} className={`rounded-full px-3 py-1.5 text-[13px] font-medium ${metric === x.key ? "bg-ink text-white" : "bg-surface-2 text-ink-2"}`}>
                {x.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {[30, 90].map((r) => (
              <button key={r} onClick={() => setRange(r)} aria-pressed={range === r} className={`rounded-full px-3 py-1.5 text-[13px] font-medium ${range === r ? "bg-navy-soft text-navy" : "text-ink-3"}`}>
                {r} zile
              </button>
            ))}
          </div>
        </div>
        <LineChart ariaLabel={`${m.label} pe ultimele ${range} zile`} data={series} yMin={m.min} yMax={m.max} unit={m.unit} color="var(--mind)" />
      </section>

      <div className="flex flex-col gap-4 lg:col-span-4">
        <section className="rounded-[26px] bg-mind-soft p-5">
          <h2 className="flex items-center gap-2 text-[16px] font-semibold">
            <Sparkles size={16} className="text-mind" />
            Ce am observat
          </h2>
          {insights.length ? (
            <ul className="mt-3 flex flex-col gap-2.5">
              {insights.map((x) => (
                <li key={x.text} className="text-[14px] leading-snug text-ink-2">
                  {x.text}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[14px] leading-snug text-ink-2">Fă check-in câteva zile la rând și îți arăt ce îți influențează starea: sala, somnul, obiceiurile.</p>
          )}
        </section>
        <section className="rounded-[26px] bg-surface p-5 shadow-[var(--shadow-card)]">
          <h2 className="text-[16px] font-semibold">Cele mai dese stări</h2>
          {tags.length ? (
            <ul className="mt-3 flex flex-col gap-2">
              {tags.map(([t, n]) => (
                <li key={t} className="grid grid-cols-[6.5rem_1fr_1.5rem] items-center gap-2 text-[14px]">
                  <span className="truncate text-ink-2">{t}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-surface-2">
                    <span className="block h-full rounded-full bg-mind" style={{ width: `${(n / maxTag) * 100}%` }} />
                  </span>
                  <span className="tabular text-right text-ink-3">{n}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[14px] text-ink-3">Nicio etichetă încă.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function BigStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="tabular text-[30px] font-semibold leading-none tracking-tight sm:text-[36px]">{value}</div>
      <div className="mt-1 text-[13px] text-ink-3">{label}</div>
    </div>
  );
}
