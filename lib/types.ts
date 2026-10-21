export type Papel = "admin" | "gestor" | "lideranca" | "pendente";

export interface Profile {
  id: string;
  nome: string;
  email: string | null;
  papel: Papel;
  gestor_id: string | null;
  created_at?: string;
}

export interface Prioridade { nome: string; sla: number; pts: number; ordem: number }

export interface Gestor { id: string; nome: string; ativo: boolean; created_at?: string }

export type ClienteStatus = "Ativo" | "Em risco" | "Pausado" | "Churn";
export interface Cliente { id: string; nome: string; gestor_id: string | null; status: ClienteStatus; obs: string; created_at?: string }

export interface OneOnOne {
  id: string; gestor_id: string; data: string;
  resumo: string; atencao: string; combinados: string;
  created_by?: string | null; created_at: string; updated_at?: string;
}

export interface Demanda {
  id: string; gestor_id: string | null; cliente_id: string | null; cliente_nome: string;
  oneonone_id: string | null; data: string; problema: string; acao: string;
  prioridade: string | null; conclusao: string | null; created_at?: string;
}

export const PAPEL_LABEL: Record<Papel, string> = {
  admin: "Coordenador", gestor: "Gestor", lideranca: "Liderança", pendente: "Aguardando liberação",
};
