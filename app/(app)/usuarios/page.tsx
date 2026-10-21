"use client";
import { useData } from "@/components/DataProvider";
import { PAPEL_LABEL, type Papel, type Profile } from "@/lib/types";

const PAPEIS: Papel[] = ["pendente", "gestor", "lideranca", "admin"];

export default function Usuarios() {
  const { isAdmin, profiles, gestores, profile: eu, supabase, run } = useData();
  if (!isAdmin) return <div className="notice">Somente coordenadores gerenciam usuários.</div>;

  const set = (u: Profile, patch: Partial<Profile>) => run(() => supabase.from("profiles").update(patch).eq("id", u.id), "Usuário atualizado");
  const pend = profiles.filter(p => p.papel === "pendente").length;

  return (
    <section className="block">
      <h2>Usuários {pend > 0 && <span className="pill s-warn">{pend} aguardando liberação</span>}</h2>
      <p className="hint">Quem cria conta entra como “Aguardando liberação”. Defina o perfil: <b>Coordenador</b> faz os 1:1 e administra tudo (pode haver vários); <b>Gestor</b> só visualiza os próprios dados (escolha a qual gestor a conta pertence); <b>Liderança</b> visualiza tudo sem editar.</p>
      <div className="tbl-wrap"><table>
        <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Gestor vinculado</th></tr></thead>
        <tbody>{profiles.map(u => (
          <tr key={u.id}>
            <td className="proj">{u.nome || "—"}{u.id === eu.id && <span className="sq"> · você</span>}</td>
            <td>{u.email}</td>
            <td><select className="btn sm" value={u.papel} disabled={u.id === eu.id} onChange={e => set(u, { papel: e.target.value as Papel })} aria-label={`Perfil de ${u.nome || u.email}`}>
              {PAPEIS.map(p => <option key={p} value={p}>{PAPEL_LABEL[p]}</option>)}</select></td>
            <td>{u.papel === "gestor"
              ? <select className="btn sm" value={u.gestor_id ?? ""} onChange={e => set(u, { gestor_id: e.target.value || null })} aria-label={`Gestor de ${u.nome || u.email}`}>
                  <option value="">Escolha o gestor…</option>{gestores.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}</select>
              : <span className="sq">—</span>}
              {u.papel === "gestor" && !u.gestor_id && <div className="err">Sem vínculo, o gestor não vê nada.</div>}</td>
          </tr>
        ))}</tbody>
      </table></div>
    </section>
  );
}
