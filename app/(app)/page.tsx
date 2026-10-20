import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: p } = await supabase.from("profiles").select("papel, gestor_id").eq("id", user.id).single();
  if (p?.papel === "gestor" && p.gestor_id) redirect(`/gestores/${p.gestor_id}`);
  redirect("/painel");
}
