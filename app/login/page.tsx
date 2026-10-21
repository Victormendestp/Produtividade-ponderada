"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Modo = "entrar" | "criar" | "esqueci";

export default function LoginPage() {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErro(""); setInfo(""); setBusy(true);
    const supabase = createClient();
    try {
      if (modo === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw new Error(error.message.includes("Invalid") ? "E-mail ou senha incorretos." : error.message.includes("confirm") ? "Confirme seu e-mail pelo link que enviamos antes de entrar." : error.message);
        router.replace("/"); router.refresh();
      } else if (modo === "criar") {
        if (!nome.trim()) throw new Error("Informe seu nome.");
        if (senha.length < 6) throw new Error("A senha precisa ter pelo menos 6 caracteres.");
        const { data, error } = await supabase.auth.signUp({ email, password: senha, options: { data: { nome: nome.trim() }, emailRedirectTo: `${window.location.origin}/auth/callback` } });
        if (error) throw new Error(error.message);
        if (data.session) { router.replace("/"); router.refresh(); }
        else setInfo("Conta criada. Abra o link de confirmação que enviamos para o seu e-mail e depois entre.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/conta` });
        if (error) throw new Error(error.message);
        setInfo("Se o e-mail estiver cadastrado, você vai receber um link para criar uma nova senha.");
      }
    } catch (err) { setErro(err instanceof Error ? err.message : "Não foi possível continuar."); }
    setBusy(false);
  }

  return (
    <div className="auth">
      <form className="auth-card" onSubmit={submit}>
        <h1>Produtividade Ponderada</h1>
        <p>{modo === "entrar" ? "Entre com seu e-mail e senha." : modo === "criar" ? "Crie seu acesso. Um coordenador libera seu perfil depois." : "Informe seu e-mail para redefinir a senha."}</p>
        {modo === "criar" && <div className="field"><label htmlFor="nome">Nome</label><input id="nome" value={nome} onChange={e => setNome(e.target.value)} autoComplete="name" /></div>}
        <div className="field"><label htmlFor="email">E-mail</label><input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></div>
        {modo !== "esqueci" && <div className="field"><label htmlFor="senha">Senha</label><input id="senha" type="password" required value={senha} onChange={e => setSenha(e.target.value)} autoComplete={modo === "criar" ? "new-password" : "current-password"} /></div>}
        {erro && <span className="err">{erro}</span>}
        {info && <span className="ok">{info}</span>}
        <button className="btn primary" disabled={busy}>{busy ? "Aguarde…" : modo === "entrar" ? "Entrar" : modo === "criar" ? "Criar conta" : "Enviar link"}</button>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          {modo !== "entrar" ? <button type="button" className="btn link" onClick={() => setModo("entrar")}>Já tenho conta</button>
            : <button type="button" className="btn link" onClick={() => setModo("criar")}>Criar conta</button>}
          {modo === "entrar" && <button type="button" className="btn link" onClick={() => setModo("esqueci")}>Esqueci a senha</button>}
        </div>
      </form>
    </div>
  );
}
