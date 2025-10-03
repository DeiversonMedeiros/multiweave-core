// Type definitions for Supabase core schema tables

export type Company = {
  id: string;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  inscricao_estadual?: string;
  endereco?: Record<string, any>;
  contato?: Record<string, any>;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  nome: string;
  descricao?: string;
  permissoes: Record<string, any>;
  created_at: string;
  updated_at: string;
};

export type User = {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type UserCompany = {
  id: string;
  user_id: string;
  company_id: string;
  profile_id: string;
  ativo: boolean;
  created_at: string;
};

export type CostCenter = {
  id: string;
  company_id: string;
  nome: string;
  codigo: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: string;
  company_id: string;
  cost_center_id?: string;
  nome: string;
  codigo: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type Partner = {
  id: string;
  company_id: string;
  tipo: ('cliente' | 'fornecedor' | 'transportador')[];
  razao_social: string;
  nome_fantasia?: string;
  cnpj: string;
  matriz_id?: string;
  endereco?: Record<string, any>;
  contato?: Record<string, any>;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type Material = {
  id: string;
  company_id: string;
  nome: string;
  codigo: string;
  tipo: 'produto' | 'servico' | 'materia_prima';
  unidade_medida: string;
  classe?: string;
  ncm?: string;
  cfop?: string;
  cst?: string;
  imagem_url?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};
