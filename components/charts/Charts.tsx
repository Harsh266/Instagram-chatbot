"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export interface SeriesDef {
  key: string;
  label: string;
  color: string;
}

/** Grouped column chart for daily activity. Hover/focus a day to see exact values. */
export function ColumnChart({
  data,
  series,
  height = 200,
  labelFor,
}: {
  data: Record<string, number>[];
  series: SeriesDef[];
  height?: number;
  labelFor: (d: Record<string, number>, i: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.flatMap((d) => series.map((s) => d[s.key] ?? 0)));
  const nice = Math.ceil(max / 4) * 4 || 4;
  const ticks = [0, nice / 4, nice / 2, (3 * nice) / 4, nice];
  const every = Math.ceil(data.length / 10);
  const total = (k: string) => data.reduce((s, d) => s + (d[k] ?? 0), 0);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="size-2.5 rounded-sm" style={{ background: s.color }} aria-hidden />
            {s.label} <span className="font-semibold tabular-nums text-slate-800">{total(s.key)}</span>
          </span>
        ))}
      </div>
      <div className="relative flex gap-2" style={{ height }}>
        <div className="flex flex-col justify-between pb-5 text-right text-[10px] tabular-nums text-slate-400" aria-hidden>
          {[...ticks].reverse().map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <div className="relative flex-1">
          <div className="absolute inset-x-0 top-0 bottom-5 flex flex-col justify-between" aria-hidden>
            {ticks.map((t) => (
              <div key={t} className="border-t border-dashed border-slate-100" />
            ))}
          </div>
          <div className="absolute inset-x-0 top-0 bottom-5 flex items-end gap-[2px]" role="img" aria-label="Daily activity chart">
            {data.map((d, i) => (
              <div
                key={i}
                tabIndex={0}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                className={cn("relative flex h-full flex-1 items-end justify-center gap-[2px] rounded-t outline-none", hover === i && "bg-slate-50")}
                aria-label={`${labelFor(d, i)}: ${series.map((s) => `${s.label} ${d[s.key] ?? 0}`).join(", ")}`}
              >
                {series.map((s) => (
                  <div
                    key={s.key}
                    className="w-full max-w-[14px] rounded-t-sm transition-[height] duration-300"
                    style={{ height: `${((d[s.key] ?? 0) / nice) * 100}%`, background: s.color, minHeight: d[s.key] ? 2 : 0 }}
                  />
                ))}
                {hover === i && (
                  <div className="pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-lg bg-navy-900 px-2.5 py-1.5 text-[11px] text-white shadow-lg">
                    <p className="font-semibold">{labelFor(d, i)}</p>
                    {series.map((s) => (
                      <p key={s.key} className="flex items-center gap-1.5">
                        <span className="size-2 rounded-sm" style={{ background: s.color }} />
                        {s.label}: {d[s.key] ?? 0}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex gap-[2px]" aria-hidden>
            {data.map((d, i) => (
              <span key={i} className="flex-1 truncate text-center text-[10px] text-slate-400">
                {i % every === 0 ? labelFor(d, i) : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Donut({
  items,
  size = 148,
  centerLabel,
}: {
  items: { label: string; value: number; color: string }[];
  size?: number;
  centerLabel: string;
}) {
  const total = items.reduce((s, i) => s + i.value, 0);
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${centerLabel}: ${items.map((i) => `${i.label} ${i.value}`).join(", ")}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={16} />
        {total > 0 &&
          items.map((it) => {
            const len = (it.value / total) * c;
            const el = (
              <circle
                key={it.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={it.color}
                strokeWidth={16}
                strokeDasharray={`${Math.max(len - 2, 0)} ${c}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                className="transition-all duration-500"
              >
                <title>{`${it.label}: ${it.value}`}</title>
              </circle>
            );
            offset += len;
            return el;
          })}
        <text x="50%" y="47%" textAnchor="middle" className="fill-navy-900 text-2xl font-semibold">
          {total}
        </text>
        <text x="50%" y="62%" textAnchor="middle" className="fill-slate-500 text-[10px]">
          {centerLabel}
        </text>
      </svg>
      <ul className="min-w-[140px] flex-1 space-y-1.5">
        {items.map((it) => (
          <li key={it.label} className="flex items-center gap-2 text-xs">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: it.color }} aria-hidden />
            <span className="flex-1 text-slate-600">{it.label}</span>
            <span className="font-semibold tabular-nums text-slate-800">{it.value}</span>
            <span className="w-9 text-right tabular-nums text-slate-400">{total ? Math.round((it.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BarList({ items, color = "#b7b71b" }: { items: { label: string; value: number; color?: string }[]; color?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-2.5">
      {items.map((it) => (
        <li key={it.label}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-slate-600">{it.label}</span>
            <span className="font-semibold tabular-nums text-slate-800">{it.value}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full transition-[width] duration-500" style={{ width: `${(it.value / max) * 100}%`, background: it.color ?? color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export const CATEGORY_COLORS = {
  hot: "#dc2626",
  warm: "#f59e0b",
  cold: "#3b82f6",
  unqualified: "#94a3b8",
  review: "#8b5cf6",
} as const;
