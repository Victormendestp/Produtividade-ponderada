"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useData } from "./DataProvider";
import { br, calc, todayISO } from "@/lib/calc";
import type { Cliente, ClienteStatus, Demanda, OneOnOne } from "@/lib/types";

/* ---------- <dialog> nativo ---------- */
function Modal({ title, wide, onClose, children, footer }: { title: string; wide?: boolean; onClose: () => void; children: React.ReactNode; footer: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; if (d && !d.open) d.showModal(); }, []);
  return (
    <dialog ref={ref} className={wide ? "wide" : undefined} onCancel={e => { e.preventDefault(); onClose(); }}>
      <div className="dlg-h">{title}</div>
      <div className="dlg-b">{children}</div>
      <div className="dlg-f">{footer}</div>
    </dialog>
  );
}

const STATUS_CLI: ClienteStatus[] = ["Ativo", "Em risco", "Pausado", "Churn"];

/** Encontra o cliente pelo nome na carteira do gestor; se não existir, cria. */
async function clienteId(supabase: ReturnType<typeof useData>["supabase"], clientes: Cliente[], gestorId: string, nome: string) {
  const n = nome.trim();
  if (!n) return { id: null as string | null };
  const found = clientes.find(c => c.gestor_id === gestorId && c.nome.trim().toLowerCase() === n.toLowerCase());
  if (found) return { id: found.id };
  const { data, error } = await supabase.from("clientes").insert({ nome: n, gestor_id: gestorId }).select("id").single();
  if (error) throw new Error(error.message);
  return { id: data.id as string };
}

/* ---------- 1:1 ---------- */
interface Row { key: number; cliente: string; problema: string; acao: string; prioridade: string }
let rowKey = 0;
const emptyRow = (): Row => ({ key: ++rowKey, cliente: "", problema: "", acao: "", prioridade: "" });

function OneOnOneDialog({ oo, gestorId, onClose }: { oo?: OneOnOne; gestorId?: string; onClose: () => void }) {
  const { supabase, gestores, clientes, demandas, prios, reload, toast } = useData();
  const [g, setG] = useState(oo?.gestor_id ?? gestorId ?? "");
  const [data, setData] = useState(oo?.data ?? todayISO());
  const [resumo, setResumo] = useState(oo?.resumo ?? "");
  const [atencao, setAtencao] = useState(oo?.atencao ?? "");
  const [combinados, setCombinados] = useState(oo?.combinados ?? "");
  const [rows, setRows] = useState<Row[]>(oo ? [] : [emptyRow()]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const carteira = clientes.filter(c => c.gestor_id === g);
  const linked = oo ? demandas.filter(d => d.oneonone_id === oo.id) : [];
  const setRow = (k: number, p: Partial<Row>) => setRows(rs => rs.map(r => r.key === k ? { ...r, ...p } : r));

  async function save() {
    setErr("");
    if (!g) return setErr("Escolha o gestor.");
    if (!data) return setErr("Informe a data do 1:1.");
    const filled = rows.filter(r => r.cliente.trim() || r.problema.trim() || r.acao.trim());
    if (filled.some(r => !r.problema.trim())) return setErr("Toda demanda precisa ter o problema descrito.");
    setBusy(true);
    try {
      const payload = { gestor_id: g, data, resumo, atencao, combinados };
      const res = oo
        ? await supabase.from("oneonones").update(payload).eq("id", oo.id).select("id").single()
        : await supabase.from("oneonones").insert(payload).select("id").single();
      if (res.error) throw new Error(res.error.message);
      const ooId = res.data.id as string;
      if (oo && oo.data !== data) {
        // demandas que nasceram neste 1:1 acompanham a nova data
        const u = await supabase.from("demandas").update({ data }).eq("oneonone_id", ooId).eq("data", oo.data);
        if (u.error) throw new Error(u.error.message);
      }
      const novos: Cliente[] = [...clientes];
      for (const r of filled) {
        const { id } = await clienteId(supabase, novos, g, r.cliente);
        if (id && !novos.some(c => c.id === id)) novos.push({ id, nome: r.cliente.trim(), gestor_id: g, status: "Ativo", obs: "" });
        const ins = await supabase.from("demandas").insert({
          gestor_id: g, cliente_id: id, cliente_nome: r.cliente.trim(), oneonone_id: ooId, data,
          problema: r.problema.trim(), acao: r.acao.trim(), prioridade: r.prioridade || null,
        });
        if (ins.error) throw new Error(ins.error.message);
      }
      await reload();
      toast(oo ? "1:1 atualizado" : `1:1 registrado${filled.length ? ` com ${filled.length} demanda${filled.length > 1 ? "s" : ""}` : ""}`);
      onClose();
    } catch (e) { setErr(e instanceof Error ? e.message : "Erro ao salvar."); }
    setBusy(false);
  }

  async function remove() {
    if (!oo || !confirm("Excluir este 1:1? As demandas ligadas a ele continuam, só perdem o vínculo.")) return;
    setBusy(true);
    const { error } = await supabase.from("oneonones").delete().eq("id", oo.id);
    setBusy(false);
    if (error) return setErr(error.message);
    await reload(); toast("1:1 excluído"); onClose();
  }

  return (
    <Modal wide title={oo ? "Editar 1:1" : "Registrar 1:1"} onClose={onClose} footer={<>
      {oo && <button className="btn danger" onClick={remove} disabled={busy}>Excluir</button>}
      <span className="spacer" />
      {err && <span className="err">{err}</span>}
      <button className="btn" onClick={onClose}>Cancelar</button>
      <button className="btn primary" onClick={save} disabled={busy}>{busy ? "Salvando…" : "Salvar"}</button>
    </>}>
      <div className="field"><label>Gestor</label>
        <select value={g} onChange={e => setG(e.target.value)} disabled={!!oo}>
          <option value="">Escolha…</option>
          {gestores.filter(x => x.ativo || x.id === g).map(x => <option key={x.id} value={x.id}>{x.nome}</option>)}
        </select></div>
      <div className="field"><label>Data do 1:1</label><input type="date" value={data} onChange={e => setData(e.target.value)} /></div>
      <div className="field full"><label>Resumo da conversa</label><textarea value={resumo} onChange={e => setResumo(e.target.value)} /></div>
      <div className="field"><label>Pontos de atenção</label><textarea value={atencao} onChange={e => setAtencao(e.target.value)} /></div>
      <div className="field"><label>Combinados / próximos passos</label><textarea value={combinados} onChange={e => setCombinados(e.target.value)} /></div>
      {linked.length > 0 && (
        <div className="linked"><span className="lab">Demandas já registradas neste 1:1</span>
          <ul>{linked.map(d => <li key={d.id}>{d.cliente_nome || "Sem cliente"}: {d.problema} <span className={`pill ${d._c.cls}`}>{d._c.status}</span></li>)}</ul>
        </div>
      )}
      <div className="drows">
        <span className="lab">{oo ? "Adicionar demandas" : "Demandas levantadas"} (a data da demanda é a data do 1:1)</span>
        <datalist id="carteira">{carteira.map(c => <option key={c.id} value={c.nome} />)}</datalist>
        {rows.map(r => (
          <div className="drow" key={r.key}>
            <input list="carteira" placeholder="Cliente (novo é criado na carteira)" value={r.cliente} onChange={e => setRow(r.key, { cliente: e.target.value })} aria-label="Cliente" />
            <input placeholder="Problema" value={r.problema} onChange={e => setRow(r.key, { problema: e.target.value })} aria-label="Problema" />
            <input placeholder="Ação" value={r.acao} onChange={e => setRow(r.key, { acao: e.target.value })} aria-label="Ação" />
            <select value={r.prioridade} onChange={e => setRow(r.key, { prioridade: e.target.value })} aria-label="Prioridade">
              <option value="">Prioridade…</option>
              {prios.map(p => <option key={p.nome} value={p.nome}>{p.nome}</option>)}
            </select>
            <button className="rm" onClick={() => setRows(rs => rs.filter(x => x.key !== r.key))} aria-label="Remover linha">×</button>
          </div>
        ))}
        <div><button className="btn sm" onClick={() => setRows(rs => [...rs, emptyRow()])}>+ Demanda</button></div>
      </div>
    </Modal>
  );
}

/* ---------- Demanda ---------- */
function DemandaDialog({ d, gestorId, onClose }: { d?: Demanda; gestorId?: string; onClose: () => void }) {
  const { supabase, isAdmin, profile, gestores, clientes, prios, reload, toast } = useData();
  // gestor só altera a conclusão das próprias demandas; liderança só visualiza
  const podeConcluir = isAdmin || (!!d && profile.papel === "gestor" && profile.gestor_id === d.gestor_id);
  const [g, setG] = useState(d?.gestor_id ?? gestorId ?? "");
  const [cliente, setCliente] = useState(d?.cliente_nome ?? "");
  const [data, setData] = useState(d?.data ?? todayISO());
  const [prioridade, setPrioridade] = useState(d?.prioridade ?? "");
  const [problema, setProblema] = useState(d?.problema ?? "");
  const [acao, setAcao] = useState(d?.acao ?? "");
  const [conclusao, setConclusao] = useState(d?.conclusao ?? "");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const c = calc({ data, prioridade: prioridade || null, conclusao: conclusao || null }, prios);
  const ro = !isAdmin;

  async function save() {
    setErr("");
    if (isAdmin) {
      if (!g) return setErr("Escolha o gestor.");
      if (!data) return setErr("Informe a data.");
      if (!problema.trim()) return setErr("Descreva o problema.");
    }
    if (conclusao && conclusao < data) return setErr("A conclusão não pode ser antes da data da demanda.");
    setBusy(true);
    try {
      if (isAdmin) {
        const { id } = await clienteId(supabase, clientes, g, cliente);
        const payload = { gestor_id: g, cliente_id: id, cliente_nome: cliente.trim(), data, prioridade: prioridade || null, problema: problema.trim(), acao: acao.trim(), conclusao: conclusao || null };
        const r = d ? await supabase.from("demandas").update(payload).eq("id", d.id) : await supabase.from("demandas").insert(payload);
        if (r.error) throw new Error(r.error.message);
      } else if (d) {
        const r = await supabase.from("demandas").update({ conclusao: conclusao || null }).eq("id", d.id);
        if (r.error) throw new Error(r.error.message);
      }
      await reload(); toast(d ? "Demanda atualizada" : "Demanda criada"); onClose();
    } catch (e) { setErr(e instanceof Error ? e.message : "Erro ao salvar."); }
    setBusy(false);
  }

  async function remove() {
    if (!d || !confirm("Excluir esta demanda?")) return;
    const { error } = await supabase.from("demandas").delete().eq("id", d.id);
    if (error) return setErr(error.message);
    await reload(); toast("Demanda excluída"); onClose();
  }

  return (
    <Modal title={d ? (ro ? "Demanda" : "Editar demanda") : "Nova demanda"} onClose={onClose} footer={<>
      {d && isAdmin && <button className="btn danger" onClick={remove}>Excluir</button>}
      <span className="spacer" />
      {err && <span className="err">{err}</span>}
      <button className="btn" onClick={onClose}>{podeConcluir ? "Cancelar" : "Fechar"}</button>
      {podeConcluir && <button className="btn primary" onClick={save} disabled={busy}>{busy ? "Salvando…" : "Salvar"}</button>}
    </>}>
      <div className="field"><label>Gestor</label>
        <select value={g} onChange={e => setG(e.target.value)} disabled={ro}>
          <option value="">Escolha…</option>
          {gestores.filter(x => x.ativo || x.id === g).map(x => <option key={x.id} value={x.id}>{x.nome}</option>)}
        </select></div>
      <div className="field"><label>Cliente</label>
        <input list="carteira-d" value={cliente} onChange={e => setCliente(e.target.value)} disabled={ro} />
        <datalist id="carteira-d">{clientes.filter(x => x.gestor_id === g).map(x => <option key={x.id} value={x.nome} />)}</datalist></div>
      <div className="field"><label>Data</label><input type="date" value={data} onChange={e => setData(e.target.value)} disabled={ro} /></div>
      <div className="field"><label>Prioridade</label>
        <select value={prioridade} onChange={e => setPrioridade(e.target.value)} disabled={ro}>
          <option value="">Sem prioridade</option>
          {prios.map(p => <option key={p.nome} value={p.nome}>{p.nome} · SLA {p.sla}d · {p.pts} pt</option>)}
        </select></div>
      <div className="field full"><label>Problema</label><textarea value={problema} onChange={e => setProblema(e.target.value)} disabled={ro} /></div>
      <div className="field full"><label>Ação</label><textarea value={acao} onChange={e => setAcao(e.target.value)} disabled={ro} /></div>
      <div className="field"><label>Data de conclusão</label><input type="date" value={conclusao} onChange={e => setConclusao(e.target.value)} disabled={!podeConcluir} /></div>
      <div className="calc">
        <span>Prazo: <b>{c.prazo ? br(c.prazo) : "—"}</b></span>
        <span>Status: <b>{c.status}</b></span>
        <span>Pontos: <b>{c.conq} de {c.poss}</b></span>
        <span>{c.semana}</span>
      </div>
    </Modal>
  );
}

/* ---------- Cliente ---------- */
function ClienteDialog({ c, gestorId, onClose }: { c?: Cliente; gestorId?: string; onClose: () => void }) {
  const { supabase, gestores, run } = useData();
  const [nome, setNome] = useState(c?.nome ?? "");
  const [g, setG] = useState(c?.gestor_id ?? gestorId ?? "");
  const [status, setStatus] = useState<ClienteStatus>(c?.status ?? "Ativo");
  const [obs, setObs] = useState(c?.obs ?? "");
  const [err, setErr] = useState("");

  async function save() {
    if (!nome.trim()) return setErr("Informe o nome do cliente.");
    const payload = { nome: nome.trim(), gestor_id: g || null, status, obs };
    const ok = await run(() => c ? supabase.from("clientes").update(payload).eq("id", c.id) : supabase.from("clientes").insert(payload), c ? "Cliente atualizado" : "Cliente adicionado");
    if (ok) onClose();
  }
  async function remove() {
    if (!c || !confirm(`Excluir ${c.nome} da carteira? As demandas continuam com o nome do cliente.`)) return;
    if (await run(() => supabase.from("clientes").delete().eq("id", c.id), "Cliente excluído")) onClose();
  }

  return (
    <Modal title={c ? "Editar cliente" : "Novo cliente"} onClose={onClose} footer={<>
      {c && <button className="btn danger" onClick={remove}>Excluir</button>}
      <span className="spacer" />
      {err && <span className="err">{err}</span>}
      <button className="btn" onClick={onClose}>Cancelar</button>
      <button className="btn primary" onClick={save}>Salvar</button>
    </>}>
      <div className="field"><label>Cliente</label><input value={nome} onChange={e => setNome(e.target.value)} autoFocus /></div>
      <div className="field"><label>Gestor responsável</label>
        <select value={g} onChange={e => setG(e.target.value)}>
          <option value="">Sem gestor</option>
          {gestores.filter(x => x.ativo || x.id === g).map(x => <option key={x.id} value={x.id}>{x.nome}</option>)}
        </select></div>
      <div className="field"><label>Status</label>
        <select value={status} onChange={e => setStatus(e.target.value as ClienteStatus)}>{STATUS_CLI.map(s => <option key={s}>{s}</option>)}</select></div>
      <div className="field full"><label>Observações</label><textarea value={obs} onChange={e => setObs(e.target.value)} /></div>
    </Modal>
  );
}

/* ---------- Contexto ---------- */
type Open =
  | { kind: "oo"; oo?: OneOnOne; gestorId?: string }
  | { kind: "dem"; d?: Demanda; gestorId?: string }
  | { kind: "cli"; c?: Cliente; gestorId?: string }
  | null;

interface Dialogs {
  openOneOnOne: (o?: { oo?: OneOnOne; gestorId?: string }) => void;
  openDemanda: (o?: { d?: Demanda; gestorId?: string }) => void;
  openCliente: (o?: { c?: Cliente; gestorId?: string }) => void;
}
const Ctx = createContext<Dialogs | null>(null);
export const useDialogs = () => { const c = useContext(Ctx); if (!c) throw new Error("useDialogs fora do provider"); return c; };

export function DialogsProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState<Open>(null);
  const close = () => setOpen(null);
  const api: Dialogs = {
    openOneOnOne: o => setOpen({ kind: "oo", ...o }),
    openDemanda: o => setOpen({ kind: "dem", ...o }),
    openCliente: o => setOpen({ kind: "cli", ...o }),
  };
  return (
    <Ctx.Provider value={api}>
      {children}
      {open?.kind === "oo" && <OneOnOneDialog oo={open.oo} gestorId={open.gestorId} onClose={close} />}
      {open?.kind === "dem" && <DemandaDialog d={open.d} gestorId={open.gestorId} onClose={close} />}
      {open?.kind === "cli" && <ClienteDialog c={open.c} gestorId={open.gestorId} onClose={close} />}
    </Ctx.Provider>
  );
}
