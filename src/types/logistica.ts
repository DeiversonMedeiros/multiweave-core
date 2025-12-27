// =====================================================
// TIPOS PARA MÓDULO LOGÍSTICA
// Sistema ERP MultiWeave Core
// =====================================================

export type TransportType = 'terrestre' | 'fluvial' | 'aereo' | 'logistica_reversa_claro';
export type RequestingSector = 'manutencao' | 'implantacao' | 'empresarial' | 'infraestrutura' | 'acesso' | 'na';
export type RequestStatus = 'pendente' | 'aprovado' | 'rejeitado' | 'cancelado';
export type TripStatus = 'agendada' | 'em_viagem' | 'concluida' | 'cancelada';
export type CostType = 'combustivel' | 'pedagio' | 'diarias' | 'servicos_externos' | 'outros';

export interface LogisticsRequest {
  id: string;
  company_id: string;
  numero_solicitacao: string;
  tipo_transporte: TransportType;
  setor_solicitante: RequestingSector;
  previsao_envio: string; // DATE
  prazo_destino: string; // DATE
  km_estimado?: number;
  endereco_retirada: string;
  endereco_entrega: string;
  cep_retirada?: string;
  cep_entrega?: string;
  nome_responsavel_remetente: string;
  cpf_responsavel_remetente?: string;
  telefone_responsavel_remetente: string;
  nome_responsavel_destinatario: string;
  cpf_responsavel_destinatario?: string;
  telefone_responsavel_destinatario?: string;
  peso?: number;
  largura?: number;
  altura?: number;
  comprimento?: number;
  quantidade_volumes?: number;
  project_id?: string;
  cost_center_id?: string;
  os_number?: string;
  segmento?: string;
  cliente?: string;
  observacoes?: string;
  status: RequestStatus;
  solicitado_por?: string;
  solicitado_por_nome?: string;
  aprovado_por?: string;
  aprovado_por_nome?: string;
  aprovado_em?: string;
  observacoes_aprovacao?: string;
  created_at: string;
  updated_at: string;
}

export interface Trip {
  id: string;
  company_id: string;
  request_id: string;
  request_numero?: string;
  vehicle_id: string;
  vehicle_placa?: string;
  driver_id: string;
  driver_nome?: string;
  data_saida: string; // DATE
  hora_saida?: string; // TIME
  data_chegada?: string; // DATE
  hora_chegada?: string; // TIME
  km_inicial?: number;
  km_final?: number;
  km_percorrido?: number;
  status: TripStatus;
  project_id?: string;
  project_nome?: string;
  cost_center_id?: string;
  cost_center_nome?: string;
  os_number?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface TripItem {
  id: string;
  trip_id: string;
  descricao: string;
  quantidade: number;
  unidade_medida?: string;
  peso?: number;
  observacoes?: string;
  material_id?: string;
  created_at: string;
  updated_at: string;
}

export interface TripChecklist {
  id: string;
  trip_id: string;
  items_conferidos: ChecklistItem[];
  observacoes?: string;
  conferido_por?: string;
  conferido_em?: string;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  item_id: string;
  conferido: boolean;
  observacoes?: string;
}

export interface TripDelivery {
  id: string;
  trip_id: string;
  data_entrega: string; // DATE
  hora_entrega?: string; // TIME
  recebido_por: string;
  cpf_recebedor?: string;
  telefone_recebedor?: string;
  items_entregues: DeliveryItem[];
  todos_itens_entregues: boolean;
  observacoes?: string;
  comprovante_url?: string;
  entregue_por?: string;
  entregue_em?: string;
  created_at: string;
  updated_at: string;
}

export interface DeliveryItem {
  item_id: string;
  quantidade_entregue: number;
  observacoes?: string;
}

export interface TripCost {
  id: string;
  company_id: string;
  trip_id?: string;
  trip_numero?: string;
  tipo_custo: CostType;
  descricao: string;
  valor: number;
  data_custo: string; // DATE
  vehicle_id?: string;
  vehicle_placa?: string;
  cost_center_id: string;
  cost_center_nome?: string;
  project_id?: string;
  project_nome?: string;
  os_number?: string;
  comprovante_url?: string;
  observacoes?: string;
  financial_entry_id?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface VehicleAvailability {
  vehicle_id: string;
  vehicle_placa: string;
  vehicle_modelo?: string;
  data: string; // DATE
  disponivel: boolean;
  trip_id?: string;
  trip_status?: string;
}

export interface LogisticsRequestFormData {
  tipo_transporte: TransportType;
  setor_solicitante: RequestingSector;
  previsao_envio: string;
  prazo_destino: string;
  km_estimado?: number;
  endereco_retirada: string;
  endereco_entrega: string;
  cep_retirada?: string;
  cep_entrega?: string;
  nome_responsavel_remetente: string;
  cpf_responsavel_remetente?: string;
  telefone_responsavel_remetente: string;
  nome_responsavel_destinatario: string;
  cpf_responsavel_destinatario?: string;
  telefone_responsavel_destinatario?: string;
  peso?: number;
  largura?: number;
  altura?: number;
  comprimento?: number;
  quantidade_volumes?: number;
  project_id?: string;
  cost_center_id?: string;
  os_number?: string;
  segmento?: string;
  cliente?: string;
  observacoes?: string;
}

export interface TripFormData {
  request_id: string;
  vehicle_id: string;
  driver_id: string;
  data_saida: string;
  hora_saida?: string;
  km_inicial?: number;
  project_id?: string;
  cost_center_id?: string;
  os_number?: string;
  observacoes?: string;
}

export interface ChecklistFormData {
  items_conferidos: ChecklistItem[];
  observacoes?: string;
}

export interface DeliveryFormData {
  data_entrega: string;
  hora_entrega?: string;
  recebido_por: string;
  cpf_recebedor?: string;
  telefone_recebedor?: string;
  items_entregues: DeliveryItem[];
  todos_itens_entregues: boolean;
  observacoes?: string;
  comprovante_url?: string;
}

export interface TripCostFormData {
  trip_id?: string;
  tipo_custo: CostType;
  descricao: string;
  valor: number;
  data_custo: string;
  vehicle_id?: string;
  cost_center_id: string;
  project_id?: string;
  os_number?: string;
  comprovante_url?: string;
  observacoes?: string;
}

