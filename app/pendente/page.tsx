import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SairButton } from "./SairButton";

export const dynamic = "force-dynamic";

export default async function Pendente() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: p } = await supabase.from("profiles").select("papel, nome").eq("id", user.id).single();
  if (p && p.papel !== "pendente") redirect("/");
  return (
    <div className="auth">
      <div className="auth-card">
        <h1>Acesso aguardando liberação</h1>
        <p>Olá{p?.nome ? `, ${p.nome}` : ""}. Sua conta foi criada com o e-mail <b>{user.email}</b>. O administrador precisa definir seu perfil (gestor ou liderança) para você ver os dados.</p>
        <p>Depois de liberado, é só atualizar esta página.</p>
        <SairButton />
      </div>
    </div>
  );
}
