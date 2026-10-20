import type { Demanda, Prioridade } from "./types";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/* ---------- datas (ISO yyyy-mm-dd, cálculo em UTC para não sofrer com fuso) ---------- */
export const toD = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
export const toISO = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (iso: string, n: number) => { const d = toD(iso); d.setUTCDate(d.getUTCDate() + n); return toISO(d); };
export const todayISO = () => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`; };
export const diffDays = (a: string, b: string) => Math.round((toD(a).getTime() - toD(b).getTime()) / 864e5);
export const br = (iso?: string | null) => iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "";
export const brShort = (iso?: string | null) => iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "";
export const monday = (iso: string) => addDays(iso, -((toD(iso).getUTCDay() + 6) % 7));
/** A semana pertence ao mês da sexta-feira dela (dia da apuração). */
export const semanaDoMes = (seg: string) => { const fri = toD(addDays(seg, 4)); return `Semana ${Math.ceil(fri.getUTCDate() / 7)} – ${MESES[fri.getUTCMonth()]}/${fri.getUTCFullYear()}`; };
export const weeksEnding = (seg: string, n: number) => { const w: string[] = []; for (let i = n - 1; i >= 0; i--) w.push(addDays(seg, -7 * i)); return w; };

/* ---------- regra de pontuação ---------- */
export type Status = "Em andamento" | "Atrasada" | "Concluída no prazo" | "Concluída fora do prazo" | "Sem prioridade";
export interface Calc { seg: string; semana: string; prazo: string; status: Status; poss: number; conq: number; cls: string; row: string }

export function calc(d: Pick<Demanda, "data" | "prioridade" | "conclusao">, prios: Prioridade[], hoje = todayISO()): Calc {
  const p = prios.find(x => x.nome === d.prioridade);
  const seg = d.data ? monday(d.data) : "";
  const r: Calc = { seg, semana: seg ? semanaDoMes(seg) : "", prazo: "", status: "Sem prioridade", poss: 0, conq: 0, cls: "s-none", row: "" };
  if (!p || !d.data) return r;
  r.prazo = addDays(d.data, Number(p.sla) || 0);
  r.poss = Number(p.pts) || 0;
  if (d.conclusao) {
    if (d.conclusao <= r.prazo) { r.status = "Concluída no prazo"; r.conq = r.poss; r.cls = "s-good"; r.row = "st-ok"; }
    else { r.status = "Concluída fora do prazo"; r.cls = "s-warn"; r.row = "st-out"; }
  } else if (hoje > r.prazo) { r.status = "Atrasada"; r.cls = "s-late"; r.row = "st-late"; }
  else { r.status = "Em andamento"; r.cls = "s-open"; }
  return r;
}

export type DemandaC = Demanda & { _c: Calc };

export interface Agg { n: number; Alta: number; Media: number; Baixa: number; sem: number; ok: number; late: number; open: number; poss: number; conq: number; prod: number | null }
export function agg(list: DemandaC[]): Agg {
  const a: Agg = { n: list.length, Alta: 0, Media: 0, Baixa: 0, sem: 0, ok: 0, late: 0, open: 0, poss: 0, conq: 0, prod: null };
  for (const d of list) {
    if (d._c.poss || d._c.status !== "Sem prioridade") {
      if (d.prioridade === "Alta") a.Alta++; else if (d.prioridade === "Média") a.Media++; else if (d.prioridade === "Baixa") a.Baixa++;
    } else a.sem++;
    if (d._c.status === "Concluída no prazo") a.ok++;
    if (d._c.status === "Atrasada") a.late++;
    if (!d.conclusao) a.open++;
    a.poss += d._c.poss; a.conq += d._c.conq;
  }
  a.prod = a.poss ? a.conq / a.poss : null;
  return a;
}

export const inWeek = (list: DemandaC[], seg: string) => { const e = addDays(seg, 6); return list.filter(d => d.data >= seg && d.data <= e); };
export const band = (v: number | null) => v == null ? "s-none" : v >= .8 ? "s-good" : v >= .5 ? "s-warn" : "s-crit";
export const bandColor = (v: number | null) => v == null ? "var(--faint)" : v >= .8 ? "var(--good)" : v >= .5 ? "var(--warn)" : "var(--crit)";
export const pct = (v: number | null) => v == null ? "—" : (v * 100).toFixed(1).replace(".", ",") + "%";

export interface WeekPoint extends Agg { w: string }
export function series(list: DemandaC[], endSeg: string, n: number): WeekPoint[] {
  return weeksEnding(endSeg, n).map(w => ({ w, ...agg(inWeek(list, w)) }));
}
