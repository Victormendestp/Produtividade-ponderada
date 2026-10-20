"use client";
import Link from "next/link";
import { useData } from "@/components/DataProvider";
import { Spark } from "@/components/Chart";
import { Fresh } from "@/components/ui";
import { agg, monday, pct, series, addDays } from "@/lib/calc";

export default function Gestores() {
  const { gestores, clientes, demandas, oneonones, hoje } = useData();
  const seg = monday(hoje);
  const ativos = gestores.filter(g => g.ativo);

  if (!ativos.length) return <div className="notice">Nenhum gestor ativo. Cadastre em Configurações.</div>;

  return (
    <section className="block">
      <h2>Gestores</h2>
      <p className="hint">Produtividade das últimas 4 semanas e evolução das últimas 8. Clique para ver carteira, 1:1 e demandas.</p>
      <div className="gcards">
        {ativos.map(g => {
          const mine = demandas.filter(d => d.gestor_id === g.id);
          const ult4 = agg(mine.filter(d => d.data >= addDays(seg, -21)));
          const o = oneonones.find(x => x.gestor_id === g.id);
          return (
            <Link key={g.id} href={`/gestores/${g.id}`} className="gcard">
              <span className="gn">{g.nome}</span>
              <div className="stats">
                <div><b>{clientes.filter(c => c.gestor_id === g.id).length}</b><span>clientes</span></div>
                <div><b>{mine.filter(d => !d.conclusao).length}</b><span>em aberto</span></div>
                <div><b>{pct(ult4.prod)}</b><span>últimas 4 sem.</span></div>
              </div>
              <div className="last"><Fresh data={o?.data} hoje={hoje} /></div>
              <div className="sparkwrap"><span className="sq">8 semanas</span><Spark values={series(mine, seg, 8).map(p => p.prod)} /></div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
