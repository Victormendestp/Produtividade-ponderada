"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Modo = "codigo" | "senha" | "criar" | "esqueci";

const traduz = (m: string) =>
  /invalid login/i.test(m) ? "E-mail ou senha incorretos." :
  /expired|invalid.*(otp|token)/i.test(m) ? "Código inválido ou expirado. Peça um novo." :
  /rate limit|security purposes|seconds/i.test(m) ? "Muitas tentativas. Espere um minuto e tente de novo." :
  /signups not allowed/i.test(m) ? "Este e-mail não está cadastrado. Peça ao seu coordenador para cadastrá-lo." :
  /confirm/i.test(m) ? "Confirme seu e-mail antes de entrar." : m;

export default function LoginPage() {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>("codigo");
  const [enviado, setEnviado] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const trocar = (m: Modo) => { setModo(m); setErro(""); setInfo(""); setEnviado(false); setCodigo(""); };
  const entrar = () => { router.replace("/"); router.refresh(); };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErro(""); setInfo(""); setBusy(true);
    const supabase = createClient();
    const mail = email.trim().toLowerCase();
    try {
      if (modo === "codigo" && !enviado) {
        const { data: liberado, error: e1 } = await supabase.rpc("email_liberado", { e: mail });
        if (e1) throw new Error(e1.message);
        if (!liberado) throw new Error("Este e-mail não está cadastrado. Peça ao seu coordenador para cadastrá-lo.");
        const { error } = await supabase.auth.signInWithOtp({ email: mail, options: { shouldCreateUser: true } });
        if (error) throw new Error(error.message);
        setEnviado(true);
        setInfo(`Enviamos um código para ${mail}. Confira também a caixa de spam.`);
      } else if (modo === "codigo") {
        const { error } = await supabase.auth.verifyOtp({ email: mail, token: codigo.trim(), type: "email" });
        if (error) throw new Error(error.message);
        entrar();
      } else if (modo === "senha") {
        const { error } = await supabase.auth.signInWithPassword({ email: mail, password: senha });
        if (error) throw new Error(error.message);
        entrar();
      } else if (modo === "criar") {
        if (!nome.trim()) throw new Error("Informe seu nome.");
        if (senha.length < 6) throw new Error("A senha precisa ter pelo menos 6 caracteres.");
        const { data, error } = await supabase.auth.signUp({ email: mail, password: senha, options: { data: { nome: nome.trim() }, emailRedirectTo: `${window.location.origin}/auth/callback` } });
        if (error) throw new Error(error.message);
        if (data.session) entrar();
        else setInfo("Conta criada. Abra o link de confirmação que enviamos para o seu e-mail e depois entre.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(mail, { redirectTo: `${window.location.origin}/auth/callback?next=/conta` });
        if (error) throw new Error(error.message);
        setInfo("Se o e-mail estiver cadastrado, você vai receber um link para criar uma nova senha.");
      }
    } catch (err) { setErro(traduz(err instanceof Error ? err.message : "Não foi possível continuar.")); }
    setBusy(false);
  }

  const texto = {
    codigo: enviado ? "Digite o código que chegou no seu e-mail." : "Informe seu e-mail. Vamos enviar um código de acesso.",
    senha: "Entre com seu e-mail e senha.",
    criar: "Crie seu acesso. Um coordenador libera seu perfil depois.",
    esqueci: "Informe seu e-mail para redefinir a senha.",
  }[modo];
  const botao = busy ? "Aguarde…" : { codigo: enviado ? "Entrar" : "Receber código", senha: "Entrar", criar: "Criar conta", esqueci: "Enviar link" }[modo];

  return (
    <div className="auth">
      <form className="auth-card" onSubmit={submit}>
        <h1>Produtividade Ponderada</h1>
        <p>{texto}</p>
        {modo === "criar" && <div className="field"><label htmlFor="nome">Nome</label><input id="nome" value={nome} onChange={e => setNome(e.target.value)} autoComplete="name" /></div>}
        <div className="field"><label htmlFor="email">E-mail</label>
          <input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" disabled={modo === "codigo" && enviado} /></div>
        {modo === "codigo" && enviado && (
          <div className="field"><label htmlFor="codigo">Código</label>
            <input id="codigo" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6,10}" maxLength={10} autoFocus
              value={codigo} onChange={e => setCodigo(e.target.value.replace(/\D/g, ""))} style={{ fontFamily: "var(--f-mono)", fontSize: 20, letterSpacing: ".3em" }} /></div>
        )}
        {(modo === "senha" || modo === "criar") && <div className="field"><label htmlFor="senha">Senha</label>
          <input id="senha" type="password" required value={senha} onChange={e => setSenha(e.target.value)} autoComplete={modo === "criar" ? "new-password" : "current-password"} /></div>}
        {erro && <span className="err">{erro}</span>}
        {info && <span className="ok">{info}</span>}
        <button className="btn primary" disabled={busy}>{botao}</button>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          {modo === "codigo" && enviado && <button type="button" className="btn link" onClick={() => trocar("codigo")}>Usar outro e-mail / reenviar</button>}
          {modo === "codigo" && !enviado && <button type="button" className="btn link" onClick={() => trocar("senha")}>Entrar com senha</button>}
          {modo === "senha" && <>
            <button type="button" className="btn link" onClick={() => trocar("codigo")}>Entrar com código</button>
            <button type="button" className="btn link" onClick={() => trocar("esqueci")}>Esqueci a senha</button>
          </>}
          {(modo === "criar" || modo === "esqueci") && <button type="button" className="btn link" onClick={() => trocar("senha")}>Já tenho conta</button>}
          {modo === "senha" && <button type="button" className="btn link" onClick={() => trocar("criar")}>Criar conta</button>}
        </div>
      </form>
    </div>
  );
}
