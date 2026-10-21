"use client";
import { useMemo, useState } from "react";
import { useData } from "@/components/DataProvider";
import { useDialogs } from "@/components/Dialogs";
import { Prio } from "@/components/ui";
import { agg, br, pct, type Status } from "@/lib/calc";

const STATUS: Status[] = ["Em andamento", "Atrasada", "Concluída no prazo", "Concluída fora do prazo", "Sem prioridade"];

export default function Demandas() {
  const { demandas, gestores, prios, isAdmin, hoje, run, supabase } = useData();
  const { openDemanda } = useDialogs();
  const [g, setG] = useState("");
  const [st, setSt] = useState("");
  const [pr, setPr] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [q, setQ] = useState("");
  const nome = (id: string | null) => gestores.find(x => x.id === id)?.nome ?? "—";

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return demandas.filter(d =>
      (!g || d.gestor_id === g) && (!st || d._c.status === st) && (!pr || (pr === "-" ? !d.prioridade : d.prioridade === pr)) &&
      (!de || d.data >= de) && (!ate || d.data <= ate) &&
      (!s || `${d.cliente_nome} ${d.problema} ${d.acao}`.toLowerCase().includes(s)));
  }, [demandas, g, st, pr, de, ate, q]);
  const a = agg(list);

  function csv() {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const head = ["Gestor", "Cliente", "Data", "Semana", "Problema", "Ação", "Prioridade", "Prazo", "Conclusão", "Status", "Pontos possíveis", "Pontos conquistados"];
    const rows = list.map(d => [nome(d.gestor_id), d.cliente_nome, br(d.data), d._c.semana, d.problema, d.acao, d.prioridade ?? "", br(d._c.prazo), br(d.conclusao), d._c.status, d._c.poss, d._c.conq]);
    const text = "﻿" + [head, ...rows].map(r => r.map(esc).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
    const el = document.createElement("a");
    el.href = url; el.download = `demandas-${hoje}.csv`; el.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="block">
      <h2>Demandas {isAdmin && <button className="btn sm primary" onClick={() => openDemanda({ gestorId: g || undefined })}>+ Nova demanda</button>}
        <button className="btn sm" onClick={csv} disabled={!list.length}>Baixar CSV</button></h2>
      <p className="hint">{a.n} demanda{a.n === 1 ? "" : "s"} · {a.conq} de {a.poss} pontos · produtividade {pct(a.prod)}</p>
      <div className="filters">
        {gestores.length > 1 && <select value={g} onChange={e => setG(e.target.value)} aria-label="Gestor">
          <option value="">Todos os gestores</option>{gestores.map(x => <option key={x.id} value={x.id}>{x.nome}</option>)}</select>}
        <select value={st} onChange={e => setSt(e.target.value)} aria-label="Status"><option value="">Todos os status</option>{STATUS.map(s => <option key={s}>{s}</option>)}</select>
        <select value={pr} onChange={e => setPr(e.target.value)} aria-label="Prioridade"><option value="">Todas as prioridades</option>{prios.map(p => <option key={p.nome}>{p.nome}</option>)}<option value="-">Sem prioridade</option></select>
        <input type="date" value={de} onChange={e => setDe(e.target.value)} aria-label="De" title="De" />
        <input type="date" value={ate} onChange={e => setAte(e.target.value)} aria-label="Até" title="Até" />
        <input type="search" placeholder="Buscar cliente, problema ou ação" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      {list.length === 0 ? <div className="notice">Nenhuma demanda com esses filtros.</div> : (
        <div className="tbl-wrap"><table>
          <thead><tr><th>Gestor</th><th>Cliente</th><th>Data</th><th>Problema</th><th>Ação</th><th>Prioridade</th><th>Prazo</th><th>Conclusão</th><th>Status</th><th className="n">Pts</th><th /></tr></thead>
          <tbody>{list.map(d => (
            <tr key={d.id} className={d._c.row}>
              <td className="proj">{nome(d.gestor_id)}</td><td>{d.cliente_nome || "—"}</td><td className="date">{br(d.data)}</td>
              <td className="txt">{d.problema}</td><td className="txt">{d.acao}</td><td><Prio p={d.prioridade} /></td>
              <td className="date">{d._c.prazo ? br(d._c.prazo) : "—"}</td><td className="date">{d.conclusao ? br(d.conclusao) : "—"}</td>
              <td><span className={`pill ${d._c.cls}`}>{d._c.status}</span></td><td className="n">{d._c.conq}/{d._c.poss}</td>
              <td className="acts">
                {!d.conclusao && isAdmin && <button className="btn sm" onClick={() => run(() => supabase.from("demandas").update({ conclusao: hoje }).eq("id", d.id), "Demanda concluída")}>✓ Concluir</button>}
                <button className="btn sm" onClick={() => openDemanda({ d })}>{isAdmin ? "Editar" : "Abrir"}</button>
              </td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </section>
  );
}
