"use client";
import { useParams } from "next/navigation";
import { useData } from "@/components/DataProvider";
import { useDialogs } from "@/components/Dialogs";
import { Chart } from "@/components/Chart";
import { Fresh, Prio, Prod } from "@/components/ui";
import { addDays, agg, br, brShort, monday, pct, series, type DemandaC } from "@/lib/calc";
import type { OneOnOne } from "@/lib/types";

function Texto({ t }: { t: string }) {
  return t.trim() ? <p>{t}</p> : <p className="empty">Não registrado</p>;
}

function OOBody({ o, ligadas }: { o: OneOnOne; ligadas: DemandaC[] }) {
  return (
    <div className="oo">
      <div><h3>Resumo</h3><Texto t={o.resumo} /></div>
      <div><h3>Pontos de atenção</h3><Texto t={o.atencao} /></div>
      <div><h3>Combinados</h3><Texto t={o.combinados} /></div>
      {ligadas.length > 0 && (
        <div className="full"><h3>Demandas levantadas ({ligadas.length})</h3>
          <ul>{ligadas.map(d => <li key={d.id}>{d.cliente_nome || "Sem cliente"}: {d.problema} · <Prio p={d.prioridade} /> <span className={`pill ${d._c.cls}`}>{d._c.status}</span></li>)}</ul>
        </div>
      )}
    </div>
  );
}

export default function GestorPage() {
  const { id } = useParams<{ id: string }>();
  const { gestores, clientes, demandas, oneonones, hoje, isAdmin, profile, run, supabase } = useData();
  const { openOneOnOne, openDemanda, openCliente } = useDialogs();
  const g = gestores.find(x => x.id === id);
  if (!g) return <div className="notice">Gestor não encontrado ou sem permissão de acesso.</div>;

  const podeConcluir = isAdmin || (profile.papel === "gestor" && profile.gestor_id === g.id);
  const seg = monday(hoje);
  const mine = demandas.filter(d => d.gestor_id === g.id);
  const carteira = clientes.filter(c => c.gestor_id === g.id);
  const oos = oneonones.filter(o => o.gestor_id === g.id);
  const ultimo = oos[0];
  const abertas = mine.filter(d => !d.conclusao).sort((a, b) => (a._c.prazo || "9").localeCompare(b._c.prazo || "9"));
  const pts = series(mine, seg, 12);
  const s4 = agg(mine.filter(d => d.data >= addDays(seg, -21) && d.data <= addDays(seg, 6)));
  const total = agg(mine);

  const concluir = (d: DemandaC) => run(() => supabase.from("demandas").update({ conclusao: hoje }).eq("id", d.id), "Demanda concluída");

  return (
    <>
      <div className="ghead">
        <div>
          <h2>{g.nome}</h2>
          <div className="meta"><Fresh data={ultimo?.data} hoje={hoje} /><span>{carteira.length} cliente{carteira.length === 1 ? "" : "s"}</span><span>{abertas.length} em aberto</span>{!g.ativo && <span className="pill s-none">Inativo</span>}</div>
        </div>
        {isAdmin && <div className="acts">
          <button className="btn" onClick={() => openCliente({ gestorId: g.id })}>+ Cliente</button>
          <button className="btn" onClick={() => openDemanda({ gestorId: g.id })}>+ Demanda</button>
          <button className="btn primary" onClick={() => openOneOnOne({ gestorId: g.id })}>+ Registrar 1:1</button>
        </div>}
      </div>

      <div className="kpis">
        <div className="kpi hero"><span className="k">Últimas 4 semanas</span><span className="v">{pct(s4.prod)}</span><span className="d">{s4.conq} de {s4.poss} pontos</span></div>
        <div className="kpi"><span className="k">Desde o início</span><span className="v">{pct(total.prod)}</span><span className="d">{total.n} demandas</span></div>
        <div className="kpi"><span className="k">No prazo</span><span className="v">{total.ok}</span><span className="d">concluídas dentro do SLA</span></div>
        <div className="kpi"><span className="k">Atrasadas</span><span className="v" style={{ color: total.late ? "var(--crit)" : undefined }}>{total.late}</span><span className="d">em aberto fora do SLA</span></div>
      </div>

      <section className="block">
        <h2>Evolução · 12 semanas</h2>
        <p className="hint">Produtividade semanal de {g.nome}. Passe o mouse para ver os pontos.</p>
        <Chart ariaLabel={`Produtividade de ${g.nome} nas últimas 12 semanas`} points={pts.map(p => ({ label: brShort(p.w), value: p.prod, detail: `${p.conq}/${p.poss} pts · ${p.n} demandas` }))} />
      </section>

      <section className="block">
        <h2>Último 1:1 {ultimo && <span className="date">{br(ultimo.data)}</span>}
          {isAdmin && ultimo && <button className="btn sm" onClick={() => openOneOnOne({ oo: ultimo })}>Editar</button>}</h2>
        {ultimo ? <OOBody o={ultimo} ligadas={mine.filter(d => d.oneonone_id === ultimo.id)} /> : <div className="notice">Nenhum 1:1 registrado ainda.{isAdmin && " Use “+ Registrar 1:1”."}</div>}
      </section>

      <div className="grid2">
        <section className="block">
          <h2>Demandas em aberto <span className="pill s-open">{abertas.length}</span></h2>
          <p className="hint">Ordenadas pelo prazo.</p>
          {abertas.length === 0 ? <div className="notice">Nada em aberto.</div> : (
            <div className="tbl-wrap"><table>
              <thead><tr><th>Cliente</th><th>Problema</th><th>Prioridade</th><th>Prazo</th><th>Status</th><th /></tr></thead>
              <tbody>{abertas.map(d => (
                <tr key={d.id} className={d._c.row}>
                  <td className="proj">{d.cliente_nome || "—"}</td><td className="txt">{d.problema}{d.acao && <div className="sq" style={{ textTransform: "none", letterSpacing: 0 }}>Ação: {d.acao}</div>}</td>
                  <td><Prio p={d.prioridade} /></td><td className="date">{d._c.prazo ? br(d._c.prazo) : "—"}</td>
                  <td><span className={`pill ${d._c.cls}`}>{d._c.status}</span></td>
                  <td className="acts">
                    {podeConcluir && <button className="btn sm" onClick={() => concluir(d)}>✓ Concluir</button>}
                    <button className="btn sm" onClick={() => openDemanda({ d })}>Abrir</button>
                  </td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </section>

        <section className="block">
          <h2>Carteira <span className="pill s-none">{carteira.length}</span></h2>
          <p className="hint">{isAdmin ? "Clique no cliente para editar." : "Clientes sob responsabilidade do gestor."}</p>
          {carteira.length === 0 ? <div className="notice">Nenhum cliente na carteira.</div> : (
            <div className="tbl-wrap"><table>
              <thead><tr><th>Cliente</th><th>Status</th><th className="n">Em aberto</th><th className="n">Produtividade</th></tr></thead>
              <tbody>{carteira.map(c => {
                const dc = mine.filter(d => d.cliente_id === c.id);
                const st = c.status === "Ativo" ? "s-good" : c.status === "Em risco" ? "s-warn" : c.status === "Churn" ? "s-crit" : "s-none";
                return (
                  <tr key={c.id} className={isAdmin ? "click" : undefined} onClick={isAdmin ? () => openCliente({ c }) : undefined}>
                    <td className="proj">{c.nome}{c.obs && <div className="sq" style={{ textTransform: "none", letterSpacing: 0 }}>{c.obs}</div>}</td>
                    <td><span className={`pill ${st}`}>{c.status}</span></td>
                    <td className="n">{dc.filter(d => !d.conclusao).length}</td><td className="n"><Prod v={agg(dc).prod} /></td>
                  </tr>
                );
              })}</tbody>
            </table></div>
          )}
        </section>
      </div>

      <section className="block">
        <h2>Histórico de 1:1 <span className="pill s-none">{oos.length}</span></h2>
        {oos.length === 0 ? <div className="notice">Sem histórico ainda.</div> : (
          <div className="hist">{oos.map(o => (
            <details key={o.id}>
              <summary><span className="date">{br(o.data)}</span><span className="x">{o.resumo || "Sem resumo"}</span>
                {isAdmin && <button className="btn sm" onClick={e => { e.preventDefault(); openOneOnOne({ oo: o }); }}>Editar</button>}</summary>
              <div className="body"><OOBody o={o} ligadas={mine.filter(d => d.oneonone_id === o.id)} /></div>
            </details>
          ))}</div>
        )}
      </section>
    </>
  );
}
