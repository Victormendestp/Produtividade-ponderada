import { band, bandColor, diffDays, pct, brShort } from "@/lib/calc";

export function Prod({ v }: { v: number | null }) {
  return (
    <div className="prod">
      <span className={`pill ${band(v)}`}>{pct(v)}</span>
      <span className="bar"><i style={{ width: `${Math.min(100, (v ?? 0) * 100)}%`, background: bandColor(v) }} /></span>
    </div>
  );
}

/** Há quanto tempo foi o último 1:1: até 7 dias ok, até 14 atenção, mais que isso crítico. */
export function Fresh({ data, hoje }: { data?: string | null; hoje: string }) {
  if (!data) return <span className="pill s-none">Sem 1:1</span>;
  const d = diffDays(hoje, data);
  const cls = d <= 7 ? "s-good" : d <= 14 ? "s-warn" : "s-crit";
  return <span className={`pill ${cls}`}>{d === 0 ? "1:1 hoje" : `1:1 há ${d} dia${d === 1 ? "" : "s"}`} · {brShort(data)}</span>;
}

export function Prio({ p }: { p: string | null }) {
  return p ? <span className={`prio prio-${p}`}>{p}</span> : <span className="prio" style={{ color: "var(--faint)" }}>—</span>;
}
