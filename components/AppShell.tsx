"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useData } from "./DataProvider";
import { useDialogs } from "./Dialogs";
import { PAPEL_LABEL } from "@/lib/types";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { profile, isAdmin, supabase, loading, error } = useData();
  const { openOneOnOne } = useDialogs();
  const path = usePathname();
  const router = useRouter();

  const nav: { href: string; label: string }[] =
    profile.papel === "gestor"
      ? [{ href: profile.gestor_id ? `/gestores/${profile.gestor_id}` : "/painel", label: "Meu painel" }, { href: "/demandas", label: "Demandas" }]
      : [{ href: "/painel", label: "Painel" }, { href: "/gestores", label: "Gestores" }, { href: "/demandas", label: "Demandas" }];
  if (isAdmin) nav.push({ href: "/config", label: "Configurações" }, { href: "/usuarios", label: "Usuários" });
  const active = (href: string) => path === href || (href !== "/" && path.startsWith(href + "/"));

  async function sair() {
    await supabase.auth.signOut();
    router.replace("/login"); router.refresh();
  }

  return (
    <>
      <header className="top">
        <div className="wrap">
          <Link href="/" className="brand"><h1>Produtividade Ponderada</h1><span className="sub">1:1 · carteiras · SLA</span></Link>
          <nav className="tabs" aria-label="Seções">
            {nav.map(n => <Link key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined}>{n.label}</Link>)}
          </nav>
          {isAdmin && <button className="btn primary" onClick={() => openOneOnOne()}>+ Registrar 1:1</button>}
          <div className="who">
            <Link href="/conta" title="Minha conta">{profile.nome || profile.email} · {PAPEL_LABEL[profile.papel]}</Link>
            <button className="btn sm" onClick={sair}>Sair</button>
          </div>
        </div>
      </header>
      <main className="wrap">
        {error && <div className="notice" style={{ marginBottom: 16, color: "var(--crit)" }}>Não foi possível carregar os dados: {error}</div>}
        {loading ? <div className="notice">Carregando…</div> : children}
      </main>
    </>
  );
}
