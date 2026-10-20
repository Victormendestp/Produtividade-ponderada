"use client";
import { useState } from "react";
import { useData } from "@/components/DataProvider";
import type { Gestor, Prioridade } from "@/lib/types";

function GestorRow({ g }: { g: Gestor }) {
  const { supabase, run } = useData();
  const [nome, setNome] = useState(g.nome);
  return (
    <div className="cfg-row">
      <input type="text" value={nome} onChange={e => setNome(e.target.value)} aria-label="Nome do gestor" />
      <label><input type="checkbox" checked={g.ativo} onChange={e => run(() => supabase.from("gestores").update({ ativo: e.target.checked }).eq("id", g.id), e.target.checked ? "Gestor ativado" : "Gestor desativado")} /> Ativo</label>
      <button className="btn sm" disabled={!nome.trim() || nome.trim() === g.nome} onClick={() => run(() => supabase.from("gestores").update({ nome: nome.trim() }).eq("id", g.id), "Nome salvo")}>Salvar</button>
    </div>
  );
}

function PrioRow({ p }: { p: Prioridade }) {
  const { supabase, run } = useData();
  const [sla, setSla] = useState(String(p.sla));
  const [pts, setPts] = useState(String(p.pts));
  const changed = sla !== String(p.sla) || pts !== String(p.pts);
  const valid = /^\d+$/.test(sla) && /^\d+$/.test(pts);
  return (
    <div className="cfg-row">
      <b style={{ minWidth: 70 }}>{p.nome}</b>
      <label>SLA (dias) <input type="number" min={0} value={sla} onChange={e => setSla(e.target.value)} style={{ width: 70 }} className="btn sm" /></label>
      <label>Pontos <input type="number" min={0} value={pts} onChange={e => setPts(e.target.value)} style={{ width: 70 }} className="btn sm" /></label>
      <button className="btn sm" disabled={!changed || !valid} onClick={() => run(() => supabase.from("prioridades").update({ sla: Number(sla), pts: Number(pts) }).eq("nome", p.nome), "Prioridade salva")}>Salvar</button>
    </div>
  );
}

export default function Config() {
  const { isAdmin, gestores, prios, supabase, run } = useData();
  const [novo, setNovo] = useState("");
  if (!isAdmin) return <div className="notice">Somente o administrador acessa as configurações.</div>;

  async function add() {
    if (!novo.trim()) return;
    if (await run(() => supabase.from("gestores").insert({ nome: novo.trim() }), "Gestor adicionado")) setNovo("");
  }

  return (
    <>
      <section className="block">
        <h2>Gestores</h2>
        <p className="hint">Desativar tira o gestor do painel sem apagar o histórico.</p>
        <div className="cfg-list">
          {gestores.map(g => <GestorRow key={`${g.id}-${g.nome}`} g={g} />)}
          <div className="cfg-row">
            <input type="text" placeholder="Nome do novo gestor" value={novo} onChange={e => setNovo(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} />
            <button className="btn sm primary" onClick={add} disabled={!novo.trim()}>+ Adicionar</button>
          </div>
        </div>
      </section>
      <section className="block">
        <h2>Prioridades</h2>
        <p className="hint">Mudar SLA ou pontos recalcula todas as demandas, inclusive as antigas.</p>
        <div className="cfg-list">{prios.map(p => <PrioRow key={`${p.nome}-${p.sla}-${p.pts}`} p={p} />)}</div>
      </section>
      <section className="block">
        <h2>Regras de cálculo</h2>
        <div className="rules">
          <p><b>Prazo</b> = data da demanda + SLA da prioridade (em dias corridos).</p>
          <p><b>Pontos possíveis</b> = pontos da prioridade. <b>Pontos conquistados</b> = os mesmos pontos, só se a conclusão for até o prazo; fora do prazo vale zero.</p>
          <p><b>Produtividade</b> = conquistados ÷ possíveis. Verde a partir de 80%, amarelo de 50% a 79%, vermelho abaixo de 50%.</p>
          <p><b>Semana</b> de segunda a domingo, contada no mês da sexta-feira. Demandas sem prioridade não entram na conta.</p>
          <p><b>1:1</b>: verde até 7 dias desde o último, amarelo até 14, vermelho acima disso.</p>
        </div>
      </section>
    </>
  );
}
