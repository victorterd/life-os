"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

export type Point = { x: string; y: number | null; label?: string };

const H = 180;
const PAD = { top: 16, right: 12, bottom: 24, left: 36 };

function niceTicks(min: number, max: number, count = 4) {
  if (min === max) {
    max = min + 1;
    min = Math.max(0, min - 1);
  }
  const span = max - min;
  const step0 = span / count;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0) ?? step0;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toFixed(6));
  return { lo, hi, ticks };
}

function useWidth(dep: unknown = null) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [dep]);
  return { ref, w };
}

const fmt = (v: number) => v.toLocaleString("ro-RO", { maximumFractionDigits: 1 });

/** O singură serie: linie de 2px + zonă la 10%, crosshair și tooltip la hover. */
export function LineChart({
  data,
  color = "var(--navy)",
  unit = "",
  yMin,
  yMax,
  height = H,
  ariaLabel,
}: {
  data: Point[];
  color?: string;
  unit?: string;
  yMin?: number;
  yMax?: number;
  height?: number;
  ariaLabel: string;
}) {
  const vals = data.map((d) => d.y).filter((v): v is number => v != null);
  const { ref, w } = useWidth(vals.length > 0);
  const gid = useId();
  const [hover, setHover] = useState<number | null>(null);
  const { lo, hi, ticks } = niceTicks(yMin ?? Math.min(...vals, Infinity), yMax ?? Math.max(...vals, -Infinity));
  const iw = Math.max(10, w - PAD.left - PAD.right);
  const ih = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (data.length <= 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = (v: number) => PAD.top + ih - ((v - lo) / (hi - lo || 1)) * ih;

  const segments = useMemo(() => {
    const segs: { i: number; v: number }[][] = [];
    let cur: { i: number; v: number }[] = [];
    data.forEach((d, i) => {
      if (d.y == null) {
        if (cur.length) segs.push(cur);
        cur = [];
      } else cur.push({ i, v: d.y });
    });
    if (cur.length) segs.push(cur);
    return segs;
  }, [data]);

  if (!vals.length)
    return (
      <div ref={ref} className="grid place-items-center text-[14px] text-ink-3" style={{ height }}>
        Nu sunt date încă.
      </div>
    );

  const lastIdx = data.map((d) => d.y).findLastIndex((v) => v != null);
  const h = hover != null && data[hover]?.y != null ? hover : null;

  return (
    <div ref={ref} className="relative w-full">
      <svg width={w} height={height} role="img" aria-label={ariaLabel} className="block overflow-visible">
        <defs>
          <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity={0.12} />
            <stop offset="1" stopColor={color} stopOpacity={0.01} />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={PAD.left + iw} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" className="tabular fill-ink-3 text-[11px]">
              {fmt(t)}
            </text>
          </g>
        ))}
        {[0, Math.floor((data.length - 1) / 2), data.length - 1].filter((v, i, a) => a.indexOf(v) === i).map((i) => (
          <text key={i} x={x(i)} y={height - 6} textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"} className="fill-ink-3 text-[11px]">
            {data[i]?.label ?? data[i]?.x}
          </text>
        ))}
        {segments.map((seg, k) => (
          <g key={k}>
            {seg.length > 1 && (
              <path
                d={`M${seg.map((p) => `${x(p.i)},${y(p.v)}`).join("L")}L${x(seg.at(-1)!.i)},${PAD.top + ih}L${x(seg[0].i)},${PAD.top + ih}Z`}
                fill={`url(#${gid})`}
              />
            )}
            <path d={`M${seg.map((p) => `${x(p.i)},${y(p.v)}`).join("L")}`} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {seg.length === 1 && <circle cx={x(seg[0].i)} cy={y(seg[0].v)} r={4} fill={color} stroke="var(--surface)" strokeWidth={2} />}
          </g>
        ))}
        {lastIdx >= 0 && (
          <>
            <circle cx={x(lastIdx)} cy={y(data[lastIdx].y!)} r={4.5} fill={color} stroke="var(--surface)" strokeWidth={2} />
            <text x={x(lastIdx) - 8} y={y(data[lastIdx].y!) - 10} textAnchor="end" className="tabular fill-ink text-[12px] font-semibold">
              {fmt(data[lastIdx].y!)}
              {unit}
            </text>
          </>
        )}
        {h != null && (
          <g pointerEvents="none">
            <line x1={x(h)} x2={x(h)} y1={PAD.top} y2={PAD.top + ih} stroke="var(--ink-3)" strokeWidth={1} />
            <circle cx={x(h)} cy={y(data[h].y!)} r={5} fill={color} stroke="var(--surface)" strokeWidth={2} />
          </g>
        )}
        <rect
          x={PAD.left}
          y={0}
          width={iw}
          height={height}
          fill="transparent"
          onPointerMove={(e) => {
            const r = (e.currentTarget as SVGRectElement).getBoundingClientRect();
            const i = Math.round(((e.clientX - r.left) / r.width) * (data.length - 1));
            setHover(Math.max(0, Math.min(data.length - 1, i)));
          }}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
      {h != null && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl bg-ink px-2.5 py-1.5 text-[12px] whitespace-nowrap text-white shadow-[var(--shadow-lift)]"
          style={{ left: Math.min(Math.max(x(h), 60), w - 60), top: y(data[h].y!) - 10 }}
        >
          <span className="text-white/60">{data[h].label ?? data[h].x}</span>{" "}
          <span className="tabular font-semibold">
            {fmt(data[h].y!)}
            {unit}
          </span>
        </div>
      )}
    </div>
  );
}

/** Coloane pentru o singură serie (ex: XP pe zi). */
export function ColumnChart({ data, color = "var(--navy)", unit = "", height = H, ariaLabel }: { data: Point[]; color?: string; unit?: string; height?: number; ariaLabel: string }) {
  const { ref, w } = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.y ?? 0));
  const { hi, ticks } = niceTicks(0, max, 3);
  const iw = Math.max(10, w - PAD.left - PAD.right);
  const ih = height - PAD.top - PAD.bottom;
  const band = iw / Math.max(1, data.length);
  const bw = Math.min(24, Math.max(3, band - 2));
  const y = (v: number) => PAD.top + ih - (v / (hi || 1)) * ih;

  return (
    <div ref={ref} className="relative w-full">
      <svg width={w} height={height} role="img" aria-label={ariaLabel} className="block overflow-visible">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={PAD.left + iw} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" className="tabular fill-ink-3 text-[11px]">
              {fmt(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const v = d.y ?? 0;
          const cx = PAD.left + band * i + band / 2;
          const top = y(v);
          const hgt = PAD.top + ih - top;
          const r = Math.min(4, hgt, bw / 2);
          return (
            <g key={d.x}>
              {v > 0 && (
                <path
                  d={`M${cx - bw / 2},${PAD.top + ih}V${top + r}Q${cx - bw / 2},${top} ${cx - bw / 2 + r},${top}H${cx + bw / 2 - r}Q${cx + bw / 2},${top} ${cx + bw / 2},${top + r}V${PAD.top + ih}Z`}
                  fill={color}
                  opacity={hover == null || hover === i ? 1 : 0.45}
                />
              )}
              <rect x={cx - band / 2} y={PAD.top} width={band} height={ih} fill="transparent" onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} />
            </g>
          );
        })}
        {[0, data.length - 1].map((i) => (
          <text key={i} x={PAD.left + band * i + band / 2} y={height - 6} textAnchor={i === 0 ? "start" : "end"} className="fill-ink-3 text-[11px]">
            {data[i]?.label ?? data[i]?.x}
          </text>
        ))}
      </svg>
      {hover != null && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl bg-ink px-2.5 py-1.5 text-[12px] whitespace-nowrap text-white shadow-[var(--shadow-lift)]"
          style={{ left: Math.min(Math.max(PAD.left + band * hover + band / 2, 60), w - 60), top: y(data[hover].y ?? 0) - 8 }}
        >
          <span className="text-white/60">{data[hover].label ?? data[hover].x}</span>{" "}
          <span className="tabular font-semibold">
            {fmt(data[hover].y ?? 0)}
            {unit}
          </span>
        </div>
      )}
    </div>
  );
}
