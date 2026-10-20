"use client";
import { useState } from "react";
import { pct } from "@/lib/calc";

export interface Pt { label: string; value: number | null; detail?: string }

const W = 720, H = 230, L = 44, R = 16, T = 14, B = 30;

/** Linha da produtividade semanal (0–100%), com referências em 50% e 80%. Semanas sem demanda priorizada ficam como lacuna. */
export function Chart({ points, ariaLabel }: { points: Pt[]; ariaLabel: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const n = points.length;
  const x = (i: number) => L + (n <= 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (n - 1));
  const y = (v: number) => T + (1 - Math.min(1, Math.max(0, v))) * (H - T - B);
  const segs: string[] = [];
  let cur = "";
  points.forEach((p, i) => {
    if (p.value == null) { if (cur) segs.push(cur); cur = ""; return; }
    cur += `${cur ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`;
  });
  if (cur) segs.push(cur);
  const step = n > 1 ? (W - L - R) / (n - 1) : W - L - R;
  const hp = hover != null ? points[hover] : null;

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} onMouseLeave={() => setHover(null)}>
        {[0, .5, .8, 1].map(v => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeDasharray={v === .5 || v === .8 ? "4 4" : undefined} />
            <text x={L - 8} y={y(v) + 4} textAnchor="end">{v * 100}%</text>
          </g>
        ))}
        {points.map((p, i) => (n <= 12 || i % 2 === 0) && <text key={i} x={x(i)} y={H - 8} textAnchor="middle">{p.label}</text>)}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="var(--faint)" />}
        {segs.map((d, i) => <path key={i} d={d} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />)}
        {points.map((p, i) => p.value != null && (
          <circle key={i} cx={x(i)} cy={y(p.value)} r={hover === i ? 5 : 4} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
        ))}
        {points.map((_, i) => (
          <rect key={i} x={x(i) - step / 2} y={T} width={step} height={H - T - B} fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}
      </svg>
      {hp && hover != null && (
        <div className="tip" style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(hp.value ?? 0) / H) * 100}%` }}>
          <b>{hp.label}</b> · {hp.value == null ? "sem demandas priorizadas" : pct(hp.value)}{hp.detail ? ` · ${hp.detail}` : ""}
        </div>
      )}
      <div className="legend">
        <span>Produtividade = pontos conquistados ÷ pontos possíveis</span>
        <span>Tracejado: 50% e 80%</span>
      </div>
    </div>
  );
}

export function Spark({ values }: { values: (number | null)[] }) {
  const w = 240, h = 48, p = 4;
  const n = values.length;
  const x = (i: number) => p + (n <= 1 ? 0 : (i * (w - 2 * p)) / (n - 1));
  const y = (v: number) => p + (1 - v) * (h - 2 * p);
  const segs: string[] = [];
  let cur = "";
  values.forEach((v, i) => {
    if (v == null) { if (cur) segs.push(cur); cur = ""; return; }
    cur += `${cur ? "L" : "M"}${x(i).toFixed(1)},${y(Math.min(1, v)).toFixed(1)}`;
  });
  if (cur) segs.push(cur);
  const last = [...values].reverse().find(v => v != null);
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} aria-label={`Últimas ${n} semanas`}>
      <line x1={p} x2={w - p} y1={y(.8)} y2={y(.8)} stroke="var(--line)" strokeDasharray="3 3" />
      <line x1={p} x2={w - p} y1={y(.5)} y2={y(.5)} stroke="var(--line)" strokeDasharray="3 3" />
      {segs.map((d, i) => <path key={i} d={d} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />)}
      {values.map((v, i) => v != null && <circle key={i} cx={x(i)} cy={y(Math.min(1, v))} r={2.5} fill="var(--accent)" />)}
      {last == null && <text x={w / 2} y={h / 2 + 4} textAnchor="middle">sem dados ainda</text>}
    </svg>
  );
}
