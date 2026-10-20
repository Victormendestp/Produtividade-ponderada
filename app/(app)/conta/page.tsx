"use client";
import { useState } from "react";
import { useData } from "@/components/DataProvider";
import { PAPEL_LABEL } from "@/lib/types";

export default function Conta() {
  const { profile, supabase, toast } = useData();
  const [senha, setSenha] = useState("");
  const [conf, setConf] = useState("");
  const [err, setErr] = useState("");

  async function trocar(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    if (senha.length < 6) return setErr("A senha precisa ter pelo menos 6 caracteres.");
    if (senha !== conf) return setErr("As senhas não conferem.");
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) return setErr(error.message);
    setSenha(""); setConf(""); toast("Senha alterada");
  }

  return (
    <section className="block" style={{ maxWidth: 460 }}>
      <h2>Minha conta</h2>
      <p className="hint">{profile.nome} · {profile.email} · {PAPEL_LABEL[profile.papel]}</p>
      <form className="auth-card" onSubmit={trocar}>
        <div className="field"><label htmlFor="s1">Nova senha</label><input id="s1" type="password" value={senha} onChange={e => setSenha(e.target.value)} autoComplete="new-password" /></div>
        <div className="field"><label htmlFor="s2">Confirmar nova senha</label><input id="s2" type="password" value={conf} onChange={e => setConf(e.target.value)} autoComplete="new-password" /></div>
        {err && <span className="err">{err}</span>}
        <button className="btn primary">Alterar senha</button>
      </form>
    </section>
  );
}
