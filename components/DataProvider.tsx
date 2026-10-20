"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { calc, todayISO, type DemandaC } from "@/lib/calc";
import type { Cliente, Demanda, Gestor, OneOnOne, Prioridade, Profile } from "@/lib/types";

type Supa = ReturnType<typeof createClient>;

interface Data {
  supabase: Supa;
  profile: Profile;
  isAdmin: boolean;
  hoje: string;
  loading: boolean;
  error: string;
  gestores: Gestor[];
  clientes: Cliente[];
  oneonones: OneOnOne[];
  demandas: DemandaC[];
  prios: Prioridade[];
  profiles: Profile[];
  reload: () => Promise<void>;
  toast: (msg: string) => void;
  /** Executa uma escrita no banco, mostra o erro (se houver) e recarrega os dados. */
  run: (fn: () => PromiseLike<{ error: { message: string } | null }>, ok?: string) => Promise<boolean>;
}

const Ctx = createContext<Data | null>(null);
export const useData = () => { const c = useContext(Ctx); if (!c) throw new Error("useData fora do DataProvider"); return c; };

export function DataProvider({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [gestores, setGestores] = useState<Gestor[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [oneonones, setOneonones] = useState<OneOnOne[]>([]);
  const [raw, setRaw] = useState<Demanda[]>([]);
  const [prios, setPrios] = useState<Prioridade[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [msg, setMsg] = useState("");
  const isAdmin = profile.papel === "admin";
  const hoje = todayISO();

  const reload = useCallback(async () => {
    const [g, c, o, d, p, u] = await Promise.all([
      supabase.from("gestores").select("*").order("nome"),
      supabase.from("clientes").select("*").order("nome"),
      supabase.from("oneonones").select("*").order("data", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("demandas").select("*").order("data", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("prioridades").select("*").order("ordem"),
      isAdmin ? supabase.from("profiles").select("*").order("created_at") : Promise.resolve({ data: [] as Profile[], error: null }),
    ]);
    const err = [g, c, o, d, p, u].find(r => r.error)?.error;
    setError(err ? err.message : "");
    setGestores((g.data ?? []) as Gestor[]);
    setClientes((c.data ?? []) as Cliente[]);
    setOneonones((o.data ?? []) as OneOnOne[]);
    setRaw((d.data ?? []) as Demanda[]);
    setPrios((p.data ?? []) as Prioridade[]);
    setProfiles((u.data ?? []) as Profile[]);
    setLoading(false);
  }, [supabase, isAdmin]);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(""), 2600); return () => clearTimeout(t); }, [msg]);

  const demandas = useMemo(() => raw.map(d => ({ ...d, _c: calc(d, prios, hoje) })), [raw, prios, hoje]);

  const run = useCallback<Data["run"]>(async (fn, ok) => {
    const { error } = await fn();
    if (error) { setMsg(`Erro: ${error.message}`); return false; }
    await reload();
    if (ok) setMsg(ok);
    return true;
  }, [reload]);

  const value: Data = { supabase, profile, isAdmin, hoje, loading, error, gestores, clientes, oneonones, demandas, prios, profiles, reload, toast: setMsg, run };
  return (
    <Ctx.Provider value={value}>
      {children}
      {msg && <div className="toast" role="status">{msg}</div>}
    </Ctx.Provider>
  );
}
