// =====================================================
// TIPOS DO MÓDULO DE COMBUSTÍVEL
// Sistema ERP MultiWeave Core
// =====================================================

// =====================================================
// 1. ENUMS E TIPOS BÁSICOS
// =====================================================

export type FuelType = 'gasolina' | 'etanol' | 'diesel' | 'diesel_s10' | 'gnv' | 'outros';
export type PaymentType = 'cartao_combustivel' | 'reembolso' | 'fatura' | 'outros';
export type RequestStatus = 'pendente' | 'aprovada' | 'reprovada' | 'recarregada' | 'cancelada';
export type PurposeType = 'logistica' | 'os' | 'manutencao' | 'implantacao' | 'outros';
export type RefuelStatus = 'pendente' | 'registrado' | 'cancelado';
export type AlertType = 'consumo_acima_esperado' | 'orcamento_estourado' | 'km_incompativel' | 'abastecimento_duplicado';
export type AlertSeverity = 'baixa' | 'media' | 'alta' | 'critica';
export type LimitType = 'veiculo' | 'colaborador' | 'centro_custo' | 'projeto';
export type FrequencyType = 'diaria' | 'semanal' | 'quinzenal' | 'mensal';

// =====================================================
// 2. TIPOS PRINCIPAIS
// =====================================================

export interface FuelTypeConfig {
  id: string;
  company_id: string;
  nome: string;
  tipo: FuelType;
  consumo_medio_km_l?: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApprovedGasStation {
  id: string;
  company_id: string;
  nome: string;
  cnpj?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  telefone?: string;
  observacoes?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface RefuelLimit {
  id: string;
  company_id: string;
  tipo_limite: LimitType;
  veiculo_id?: string;
  colaborador_id?: string;
  centro_custo_id?: string;
  projeto_id?: string;
  limite_mensal_litros?: number;
  limite_mensal_valor?: number;
  periodo_inicio?: string;
  periodo_fim?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  
  // Campos relacionados (populados via JOIN)
  veiculo_placa?: string;
  colaborador_nome?: string;
  centro_custo_nome?: string;
  projeto_nome?: string;
}

export interface FuelBudget {
  id: string;
  company_id: string;
  centro_custo_id?: string;
  projeto_id?: string;
  condutor_id?: string;
  mes: number;
  ano: number;
  valor_orcado: number;
  valor_consumido: number;
  litros_orcados?: number;
  litros_consumidos: number;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  
  // Campos relacionados (populados via JOIN)
  centro_custo_nome?: string;
  projeto_nome?: string;
  condutor_nome?: string;
  saldo_disponivel?: number; // Calculado: valor_orcado - valor_consumido
  percentual_consumido?: number; // Calculado: (valor_consumido / valor_orcado) * 100
}

export interface BudgetRevision {
  id: string;
  budget_id: string;
  valor_anterior: number;
  valor_novo: number;
  motivo: string;
  revisado_por?: string;
  revisado_em: string;
  
  // Campos relacionados
  revisado_por_nome?: string;
}

export interface RefuelRequest {
  id: string;
  company_id: string;
  numero_solicitacao: string;
  
  // Informações do abastecimento
  condutor_id: string;
  veiculo_id: string;
  tipo_combustivel_id?: string;
  rota?: string;
  km_estimado?: number;
  km_veiculo: number;
  valor_solicitado: number;
  litros_estimados?: number;
  regiao?: string;
  
  // Vínculos obrigatórios
  centro_custo_id: string;
  projeto_id?: string;
  finalidade: PurposeType;
  os_number?: string;
  
  // Status e aprovação
  status: RequestStatus;
  solicitado_por?: string;
  aprovado_por?: string;
  aprovado_em?: string;
  observacoes_aprovacao?: string;
  
  // Informações de recarga (Ticket Log)
  recarga_confirmada: boolean;
  valor_recarregado?: number;
  recarga_anexo_url?: string;
  recarga_observacoes?: string;
  recarga_confirmada_por?: string;
  recarga_confirmada_em?: string;
  
  // Auditoria
  created_at: string;
  updated_at: string;
  
  // Campos relacionados (populados via JOIN)
  condutor_nome?: string;
  veiculo_placa?: string;
  veiculo_modelo?: string;
  tipo_combustivel_nome?: string;
  centro_custo_nome?: string;
  projeto_nome?: string;
  solicitado_por_nome?: string;
  aprovado_por_nome?: string;
  recarga_confirmada_por_nome?: string;
  tem_registro?: boolean; // Se já foi registrado o abastecimento
}

export interface ScheduledRefuel {
  id: string;
  company_id: string;
  condutor_id: string;
  veiculo_id: string;
  tipo_combustivel_id?: string;
  centro_custo_id: string;
  projeto_id?: string;
  valor_estimado?: number;
  litros_estimados?: number;
  frequencia: FrequencyType;
  dia_semana?: number; // 0 = domingo, 6 = sábado
  dia_mes?: number; // 1-31
  data_inicio: string;
  data_fim?: string;
  ativo: boolean;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  
  // Campos relacionados
  condutor_nome?: string;
  veiculo_placa?: string;
  veiculo_modelo?: string;
  tipo_combustivel_nome?: string;
  centro_custo_nome?: string;
  projeto_nome?: string;
}

export interface RefuelRecord {
  id: string;
  request_id: string;
  company_id: string;
  
  // Informações do abastecimento
  data_abastecimento: string;
  hora_abastecimento?: string;
  posto_id?: string;
  posto_nome?: string;
  tipo_combustivel_id?: string;
  litros: number;
  valor_total: number;
  preco_litro?: number; // Calculado
  km_anterior?: number;
  km_atual: number;
  km_rodado?: number; // Calculado
  consumo_km_l?: number; // Calculado
  
  // Tipo de pagamento
  tipo_pagamento?: PaymentType;
  
  // Comprovante
  comprovante_url?: string;
  observacoes?: string;
  
  // Status
  status: RefuelStatus;
  
  // Vínculos
  centro_custo_id?: string;
  projeto_id?: string;
  
  // Integração com viagem
  trip_id?: string;
  
  // Auditoria
  registrado_por?: string;
  created_at: string;
  updated_at: string;
  
  // Campos relacionados
  posto_nome_completo?: string;
  tipo_combustivel_nome?: string;
  centro_custo_nome?: string;
  projeto_nome?: string;
  registrado_por_nome?: string;
  veiculo_placa?: string;
  condutor_nome?: string;
}

export interface VehicleConsumption {
  id: string;
  company_id: string;
  veiculo_id: string;
  mes: number;
  ano: number;
  total_litros: number;
  total_valor: number;
  km_rodados: number;
  consumo_medio?: number; // km/l
  desvio_consumo?: number; // Diferença entre esperado e real
  created_at: string;
  updated_at: string;
  
  // Campos relacionados
  veiculo_placa?: string;
  veiculo_modelo?: string;
  consumo_esperado?: number;
}

export interface DriverConsumption {
  id: string;
  company_id: string;
  condutor_id: string;
  mes: number;
  ano: number;
  total_litros: number;
  total_valor: number;
  quantidade_abastecimentos: number;
  veiculos_utilizados: string[];
  created_at: string;
  updated_at: string;
  
  // Campos relacionados
  condutor_nome?: string;
  veiculos_placa?: string[]; // Array de placas dos veículos utilizados
}

export interface ConsumptionAlert {
  id: string;
  company_id: string;
  tipo_alerta: AlertType;
  veiculo_id?: string;
  condutor_id?: string;
  request_id?: string;
  centro_custo_id?: string;
  projeto_id?: string;
  mensagem: string;
  severidade: AlertSeverity;
  resolvido: boolean;
  resolvido_por?: string;
  resolvido_em?: string;
  observacoes_resolucao?: string;
  created_at: string;
  updated_at: string;
  
  // Campos relacionados
  veiculo_placa?: string;
  condutor_nome?: string;
  centro_custo_nome?: string;
  projeto_nome?: string;
  resolvido_por_nome?: string;
}

export interface AuditLog {
  id: string;
  company_id: string;
  tabela: string;
  registro_id: string;
  acao: 'INSERT' | 'UPDATE' | 'DELETE';
  campos_alterados?: Record<string, { antigo: any; novo: any }>;
  usuario_id?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  
  // Campos relacionados
  usuario_nome?: string;
}

// =====================================================
// 3. TIPOS PARA FORMULÁRIOS
// =====================================================

export interface RefuelRequestFormData {
  condutor_id: string;
  veiculo_id: string;
  tipo_combustivel_id?: string;
  rota?: string;
  km_estimado?: number;
  km_veiculo: number;
  valor_solicitado: number;
  litros_estimados?: number;
  regiao?: string;
  centro_custo_id: string;
  projeto_id?: string;
  finalidade: PurposeType;
  os_number?: string;
  observacoes?: string;
}

export interface RefuelRecordFormData {
  data_abastecimento: string;
  hora_abastecimento?: string;
  posto_id?: string;
  posto_nome?: string;
  tipo_combustivel_id?: string;
  litros: number;
  valor_total: number;
  km_anterior?: number;
  km_atual: number;
  tipo_pagamento?: PaymentType;
  comprovante_url?: string;
  observacoes?: string;
  trip_id?: string;
}

export interface FuelBudgetFormData {
  centro_custo_id?: string;
  projeto_id?: string;
  condutor_id?: string;
  mes: number;
  ano: number;
  valor_orcado: number;
  litros_orcados?: number;
  observacoes?: string;
}

export interface RecargaConfirmFormData {
  valor_recarregado: number;
  recarga_anexo_url?: string;
  recarga_observacoes?: string;
}

// =====================================================
// 4. TIPOS PARA DASHBOARD E RELATÓRIOS
// =====================================================

export interface FuelDashboardStats {
  consumo_mensal_litros: number;
  consumo_mensal_valor: number;
  consumo_por_veiculo: Array<{
    veiculo_id: string;
    veiculo_placa: string;
    total_litros: number;
    total_valor: number;
  }>;
  consumo_por_colaborador: Array<{
    condutor_id: string;
    condutor_nome: string;
    total_litros: number;
    total_valor: number;
  }>;
  consumo_por_centro_custo: Array<{
    centro_custo_id: string;
    centro_custo_nome: string;
    total_litros: number;
    total_valor: number;
  }>;
  consumo_por_projeto: Array<{
    projeto_id: string;
    projeto_nome: string;
    total_litros: number;
    total_valor: number;
  }>;
  orcamento_previsto: number;
  orcamento_realizado: number;
  abastecimentos_pendentes: number;
}

export interface ConsumptionChartData {
  periodo: string; // "2025-01", "Jan/2025", etc.
  litros: number;
  valor: number;
  km_rodados?: number;
}

export interface TopDriverData {
  condutor_id: string;
  condutor_nome: string;
  total_litros: number;
  total_valor: number;
  quantidade_abastecimentos: number;
}

export interface ConsumptionDeviationData {
  veiculo_id: string;
  veiculo_placa: string;
  consumo_esperado: number;
  consumo_real: number;
  desvio: number;
  desvio_percentual: number;
}

