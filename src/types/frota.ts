// =====================================================
// TIPOS TYPESCRIPT PARA MÓDULO FROTA
// Sistema ERP MultiWeave Core
// =====================================================

// =====================================================
// 1. ENUMS E TIPOS BÁSICOS
// =====================================================

export type VehicleType = 'proprio' | 'locado' | 'agregado';
export type VehicleStatus = 'ativo' | 'inativo' | 'manutencao';
export type DocumentType = 'crlv' | 'ipva' | 'seguro' | 'licenca' | 'vistoria';
export type DocumentStatus = 'valido' | 'vencido' | 'a_vencer';
export type AssignmentStatus = 'em_uso' | 'devolvido';
export type MaintenanceType = 'preventiva' | 'corretiva';
export type MaintenanceStatus = 'pendente' | 'em_execucao' | 'finalizada';
export type OccurrenceType = 'multa' | 'sinistro';
export type OccurrenceStatus = 'pendente' | 'pago' | 'contestacao' | 'encerrado';
export type RequestStatus = 'pendente' | 'aprovado' | 'reprovado' | 'devolvido';

// =====================================================
// 2. TIPOS PRINCIPAIS
// =====================================================

export interface Vehicle {
  id: string;
  company_id: string;
  tipo: VehicleType;
  placa: string;
  renavam?: string;
  chassi?: string;
  marca?: string;
  modelo?: string;
  ano?: number;
  cor?: string;
  quilometragem: number;
  situacao: VehicleStatus;
  proprietario_id?: string;
  locadora?: string;
  colaborador_id?: string;
  created_at: string;
  updated_at: string;
  
  // Campos relacionados (populados via JOIN)
  proprietario_nome?: string;
  colaborador_nome?: string;
  condutor_atual?: string;
  status_atribuicao?: AssignmentStatus;
}

export interface VehicleDocument {
  id: string;
  vehicle_id: string;
  tipo: DocumentType;
  numero_documento?: string;
  vencimento?: string;
  arquivo_url?: string;
  status: DocumentStatus;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface Driver {
  id: string;
  company_id: string;
  nome: string;
  cpf?: string;
  matricula?: string;
  cnh_numero?: string;
  cnh_categoria?: string;
  cnh_validade?: string;
  ader_validade?: string;
  ativo: boolean;
  user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface VehicleAssignment {
  id: string;
  vehicle_id: string;
  driver_id: string;
  data_inicio: string;
  data_fim?: string;
  km_inicial: number;
  km_final?: number;
  status: AssignmentStatus;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  
  // Campos relacionados
  placa?: string;
  condutor_nome?: string;
}

export interface VehicleInspection {
  id: string;
  vehicle_id: string;
  driver_id: string;
  data: string;
  base?: string;
  km_inicial?: number;
  km_final?: number;
  avarias?: string;
  observacoes?: string;
  assinatura_condutor: boolean;
  assinatura_gestor: boolean;
  created_at: string;
  updated_at: string;
  
  // Campos relacionados
  placa?: string;
  condutor_nome?: string;
  itens?: InspectionItem[];
}

export interface InspectionItem {
  id: string;
  inspection_id: string;
  categoria: string;
  item: string;
  conforme: boolean;
  observacao?: string;
  created_at: string;
}

export interface VehicleMaintenance {
  id: string;
  vehicle_id: string;
  tipo: MaintenanceType;
  descricao: string;
  oficina?: string;
  km_proxima?: number;
  data_agendada?: string;
  data_realizada?: string;
  valor: number;
  status: MaintenanceStatus;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  
  // Campos relacionados
  placa?: string;
  marca?: string;
  modelo?: string;
  quilometragem_atual?: number;
}

export interface VehicleOccurrence {
  id: string;
  vehicle_id: string;
  driver_id?: string;
  tipo: OccurrenceType;
  data: string;
  local?: string;
  descricao: string;
  valor: number;
  status: OccurrenceStatus;
  arquivo_url?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  
  // Campos relacionados
  placa?: string;
  condutor_nome?: string;
}

export interface VehicleRequest {
  id: string;
  company_id: string;
  solicitante_id: string;
  vehicle_id?: string;
  finalidade: string;
  data_inicio: string;
  data_fim?: string;
  status: RequestStatus;
  observacoes?: string;
  aprovado_por?: string;
  data_aprovacao?: string;
  created_at: string;
  updated_at: string;
  
  // Campos relacionados
  solicitante_nome?: string;
  placa?: string;
  aprovador_nome?: string;
}

export interface VehicleImage {
  id: string;
  vehicle_id: string;
  tipo: string;
  url: string;
  descricao?: string;
  created_at: string;
}

// =====================================================
// 3. TIPOS PARA DASHBOARD
// =====================================================

export interface FrotaDashboardStats {
  total_veiculos: number;
  veiculos_ativos: number;
  veiculos_proprios: number;
  veiculos_locados: number;
  veiculos_agregados: number;
  veiculos_manutencao: number;
  documentos_vencer: number;
  manutencoes_proximas: number;
  ocorrencias_pendentes: number;
  vistorias_mes: number;
}

export interface UpcomingMaintenance {
  id: string;
  vehicle_id: string;
  placa: string;
  marca?: string;
  modelo?: string;
  tipo: MaintenanceType;
  descricao: string;
  data_agendada?: string;
  km_proxima?: number;
  quilometragem_atual: number;
  status: MaintenanceStatus;
}

export interface ExpiringDocument {
  id: string;
  vehicle_id: string;
  placa: string;
  tipo: DocumentType;
  numero_documento?: string;
  vencimento: string;
  status: DocumentStatus;
  dias_para_vencer: number;
}

// =====================================================
// 4. TIPOS PARA FORMULÁRIOS
// =====================================================

export interface CreateVehicleData {
  tipo: VehicleType;
  placa: string;
  renavam?: string;
  chassi?: string;
  marca?: string;
  modelo?: string;
  ano?: number;
  cor?: string;
  quilometragem?: number;
  situacao?: VehicleStatus;
  proprietario_id?: string;
  locadora?: string;
  colaborador_id?: string;
}

export interface UpdateVehicleData extends Partial<CreateVehicleData> {
  id: string;
}

export interface CreateDriverData {
  nome: string;
  cpf?: string;
  matricula?: string;
  cnh_numero?: string;
  cnh_categoria?: string;
  cnh_validade?: string;
  ader_validade?: string;
  user_id?: string;
}

export interface UpdateDriverData extends Partial<CreateDriverData> {
  id: string;
}

export interface CreateInspectionData {
  vehicle_id: string;
  driver_id: string;
  base?: string;
  km_inicial?: number;
  km_final?: number;
  avarias?: string;
  observacoes?: string;
  itens: InspectionItemData[];
}

export interface InspectionItemData {
  categoria: string;
  item: string;
  conforme: boolean;
  observacao?: string;
}

export interface CreateMaintenanceData {
  vehicle_id: string;
  tipo: MaintenanceType;
  descricao: string;
  oficina?: string;
  km_proxima?: number;
  data_agendada?: string;
  valor?: number;
  observacoes?: string;
}

export interface UpdateMaintenanceData extends Partial<CreateMaintenanceData> {
  id: string;
  status?: MaintenanceStatus;
  data_realizada?: string;
}

export interface CreateOccurrenceData {
  vehicle_id: string;
  driver_id?: string;
  tipo: OccurrenceType;
  data: string;
  local?: string;
  descricao: string;
  valor?: number;
  arquivo_url?: string;
  observacoes?: string;
}

export interface CreateVehicleRequestData {
  vehicle_id?: string;
  finalidade: string;
  data_inicio: string;
  data_fim?: string;
  observacoes?: string;
}

export interface CreateDocumentData {
  vehicle_id: string;
  tipo: DocumentType;
  numero_documento?: string;
  vencimento?: string;
  arquivo_url?: string;
  observacoes?: string;
}

// =====================================================
// 5. TIPOS PARA FILTROS
// =====================================================

export interface VehicleFilters {
  tipo?: VehicleType;
  situacao?: VehicleStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface DriverFilters {
  ativo?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface InspectionFilters {
  vehicle_id?: string;
  driver_id?: string;
  limit?: number;
  offset?: number;
}

export interface MaintenanceFilters {
  vehicle_id?: string;
  tipo?: MaintenanceType;
  status?: MaintenanceStatus;
  limit?: number;
  offset?: number;
}

export interface OccurrenceFilters {
  vehicle_id?: string;
  driver_id?: string;
  tipo?: OccurrenceType;
  status?: OccurrenceStatus;
  limit?: number;
  offset?: number;
}

export interface RequestFilters {
  solicitante_id?: string;
  status?: RequestStatus;
  limit?: number;
  offset?: number;
}

// =====================================================
// 6. TIPOS PARA OPERAÇÕES ESPECÍFICAS
// =====================================================

export interface AssignVehicleData {
  vehicle_id: string;
  driver_id: string;
  km_inicial?: number;
  observacoes?: string;
}

export interface ReturnVehicleData {
  vehicle_id: string;
  km_final: number;
  observacoes?: string;
}

export interface UpdateMileageData {
  vehicle_id: string;
  quilometragem: number;
}

// =====================================================
// 7. TIPOS PARA RELATÓRIOS
// =====================================================

export interface VehicleReport {
  vehicle: Vehicle;
  total_maintenances: number;
  total_maintenance_cost: number;
  total_occurrences: number;
  total_occurrence_cost: number;
  last_inspection?: VehicleInspection;
  current_assignment?: VehicleAssignment;
  upcoming_maintenances: VehicleMaintenance[];
  expiring_documents: VehicleDocument[];
}

export interface DriverReport {
  driver: Driver;
  total_assignments: number;
  current_vehicle?: Vehicle;
  total_inspections: number;
  total_occurrences: number;
  license_expiring: boolean;
  license_days_to_expire?: number;
}

// =====================================================
// 8. TIPOS PARA NOTIFICAÇÕES
// =====================================================

export interface FrotaNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  data: {
    vehicle_id?: string;
    driver_id?: string;
    document_id?: string;
    maintenance_id?: string;
    occurrence_id?: string;
    request_id?: string;
    [key: string]: any;
  };
  created_at: string;
  read: boolean;
}

// =====================================================
// 9. TIPOS PARA CONFIGURAÇÕES
// =====================================================

export interface FrotaSettings {
  maintenance_reminder_days: number;
  document_expiry_warning_days: number;
  license_expiry_warning_days: number;
  auto_create_inspection_on_return: boolean;
  require_manager_signature: boolean;
  allow_self_approval: boolean;
  max_vehicle_requests_per_user: number;
  default_maintenance_interval_km: number;
  default_maintenance_interval_days: number;
}

// =====================================================
// 10. TIPOS PARA ESTATÍSTICAS
// =====================================================

export interface FrotaStatistics {
  period: {
    start: string;
    end: string;
  };
  vehicles: {
    total: number;
    by_type: Record<VehicleType, number>;
    by_status: Record<VehicleStatus, number>;
  };
  maintenance: {
    total_cost: number;
    total_count: number;
    by_type: Record<MaintenanceType, number>;
    by_status: Record<MaintenanceStatus, number>;
  };
  occurrences: {
    total_cost: number;
    total_count: number;
    by_type: Record<OccurrenceType, number>;
    by_status: Record<OccurrenceStatus, number>;
  };
  inspections: {
    total_count: number;
    with_issues: number;
    without_issues: number;
  };
  requests: {
    total_count: number;
    by_status: Record<RequestStatus, number>;
    approval_rate: number;
  };
}
