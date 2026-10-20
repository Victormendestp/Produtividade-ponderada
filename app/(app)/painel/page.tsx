"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/components/DataProvider";
import { useDialogs } from "@/components/Dialogs";
import { Chart } from "@/components/Chart";
import { Fresh, Prio, Prod } from "@/components/ui";
import { addDays, agg, band, br, brShort, diffDays, inWeek, monday, pct, semanaDoMes, series, weeksEnding } from "@/lib/calc";

export default function Painel() {
  const { gestores, demandas, oneonones, hoje } = useData();
  const { openDemanda } = useDialogs();
  const router = useRouter();
  const [seg, setSeg] = useState(monday(hoje));
  const ativos = gestores.filter(g => g.ativo);

  const semana = useMemo(() => inWeek(demandas, seg), [demandas, seg]);
  const a = agg(semana);
  const anterior = agg(inWeek(demandas, addDays(seg, -7)));
  const atrasadas = demandas.filter(d => d._c.status === "Atrasada").sort((x, y) => x._c.prazo.localeCompare(y._c.prazo));
  const ooSemana = oneonones.filter(o => o.data >= seg && o.data <= addDays(seg, 6)).length;
  const semOO = ativos.filter(g => { const o = oneonones.find(x => x.gestor_id === g.id); return !o || diffDays(hoje, o.data) > 14; }).length;
  const geral = series(demandas, seg, 8);
  const heatWeeks = weeksEnding(seg, 8);
  const delta = a.prod != null && anterior.prod != null ? (a.prod - anterior.prod) * 100 : null;

  return (
    <>
      <div className="weekbar">
        <span className="lbl">{semanaDoMes(seg)}</span>
        <span className="range">{br(seg)} – {br(addDays(seg, 6))}</span>
        <span className="spacer" />
        <button className="btn" onClick={() => setSeg(addDays(seg, -7))} aria-label="Semana anterior">←</button>
        <input type="date" value={seg} onChange={e => e.target.value && setSeg(monday(e.target.value))} aria-label="Escolher semana" />
        <button className="btn" onClick={() => setSeg(addDays(seg, 7))} aria-label="Próxima semana">→</button>
        <button className="btn" onClick={() => setSeg(monday(hoje))}>Esta semana</button>
      </div>

      <div className="kpis">
        <div className="kpi hero"><span className="k">Produtividade da semana</span><span className="v">{pct(a.prod)}</span>
          <span className="d">{delta == null ? "sem base na semana anterior" : `${delta >= 0 ? "+" : ""}${delta.toFixed(1).replace(".", ",")} p.p. vs. semana anterior`}</span></div>
        <div className="kpi"><span className="k">Pontos</span><span className="v">{a.conq} / {a.poss}</span><span className="d">conquistados / possíveis</span></div>
        <div className="kpi"><span className="k">Demandas na semana</span><span className="v">{a.n}</span><span className="d">{a.Alta} alta · {a.Media} média · {a.Baixa} baixa{a.sem ? ` · ${a.sem} sem prioridade` : ""}</span></div>
        <div className="kpi"><span className="k">Atrasadas agora</span><span className="v" style={{ color: atrasadas.length ? "var(--crit)" : undefined }}>{atrasadas.length}</span><span className="d">em aberto e fora do SLA</span></div>
        <div className="kpi"><span className="k">1:1 na semana</span><span className="v">{ooSemana}</span><span className="d">{semOO} gestor{semOO === 1 ? "" : "es"} sem 1:1 há mais de 14 dias</span></div>
      </div>

      <section className="block">
        <h2>Por gestor</h2>
        <p className="hint">Demandas com data nesta semana. Clique na linha para abrir o gestor.</p>
        <div className="tbl-wrap"><table>
          <thead><tr><th>Gestor</th><th>Último 1:1</th><th className="n">Demandas</th><th className="n">Alta</th><th className="n">Média</th><th className="n">Baixa</th><th className="n">No prazo</th><th className="n">Atrasadas</th><th className="n">Pontos</th><th className="n">Produtividade</th></tr></thead>
          <tbody>
            {ativos.map(g => {
              const s = agg(semana.filter(d => d.gestor_id === g.id));
              const o = oneonones.find(x => x.gestor_id === g.id);
              return (
                <tr key={g.id} className="click" onClick={() => router.push(`/gestores/${g.id}`)}>
                  <td className="proj">{g.nome}</td><td><Fresh data={o?.data} hoje={hoje} /></td>
                  <td className="n">{s.n}</td><td className="n">{s.Alta}</td><td className="n">{s.Media}</td><td className="n">{s.Baixa}</td>
                  <td className="n">{s.ok}</td><td className="n">{s.late}</td><td className="n">{s.conq} / {s.poss}</td><td className="n"><Prod v={s.prod} /></td>
                </tr>
              );
            })}
            <tr className="total"><td>Total</td><td /><td className="n">{a.n}</td><td className="n">{a.Alta}</td><td className="n">{a.Media}</td><td className="n">{a.Baixa}</td><td className="n">{a.ok}</td><td className="n">{a.late}</td><td className="n">{a.conq} / {a.poss}</td><td className="n"><Prod v={a.prod} /></td></tr>
          </tbody>
        </table></div>
      </section>

      <div className="grid2">
        <section className="block">
          <h2>Evolução geral · 8 semanas</h2>
          <p className="hint">Todos os gestores somados.</p>
          <Chart ariaLabel="Produtividade geral nas últimas 8 semanas" points={geral.map(p => ({ label: brShort(p.w), value: p.prod, detail: `${p.conq}/${p.poss} pts · ${p.n} demandas` }))} />
        </section>
        <section className="block">
          <h2>Gestor × semana</h2>
          <p className="hint">Produtividade de cada gestor nas últimas 8 semanas.</p>
          <div className="tbl-wrap"><table className="heat">
            <thead><tr><th>Gestor</th>{heatWeeks.map(w => <th key={w} className="n">{brShort(w)}</th>)}</tr></thead>
            <tbody>{ativos.map(g => {
              const mine = demandas.filter(d => d.gestor_id === g.id);
              return <tr key={g.id}><td className="proj">{g.nome}</td>{heatWeeks.map(w => {
                const v = agg(inWeek(mine, w)).prod;
                return <td key={w} className="c"><span className={band(v)} title={`${g.nome} · ${semanaDoMes(w)}`}>{pct(v)}</span></td>;
              })}</tr>;
            })}</tbody>
          </table></div>
          <div className="legend"><span className="pill s-good">≥ 80%</span><span className="pill s-warn">50–79%</span><span className="pill s-crit">&lt; 50%</span><span className="pill s-none">sem demandas</span></div>
        </section>
      </div>

      <section className="block">
        <h2>Atrasadas <span className="pill s-late">{atrasadas.length}</span></h2>
        <p className="hint">Em aberto e com o prazo do SLA vencido, da mais antiga para a mais nova.</p>
        {atrasadas.length === 0 ? <div className="notice">Nenhuma demanda atrasada.</div> : (
          <div className="tbl-wrap"><table>
            <thead><tr><th>Gestor</th><th>Cliente</th><th>Problema</th><th>Prioridade</th><th>Prazo</th><th className="n">Dias de atraso</th></tr></thead>
            <tbody>{atrasadas.map(d => (
              <tr key={d.id} className={`click ${d._c.row}`} onClick={() => openDemanda({ d })}>
                <td className="proj">{gestores.find(g => g.id === d.gestor_id)?.nome ?? "—"}</td><td>{d.cliente_nome || "—"}</td><td className="txt">{d.problema}</td>
                <td><Prio p={d.prioridade} /></td><td className="date">{br(d._c.prazo)}</td><td className="n">{diffDays(hoje, d._c.prazo)}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
    </>
  );
}
