// =====================================================
// TIPOS PARA SISTEMA DE TIPOS DE BANCO DE HORAS V2
// =====================================================

export interface BankHoursType {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  code: string;
  has_bank_hours: boolean;
  accumulation_period_months: number;
  max_accumulation_hours: number;
  compensation_rate: number;
  auto_compensate: boolean;
  compensation_priority: 'fifo' | 'lifo' | 'manual';
  expires_after_months: number;
  allow_negative_balance: boolean;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface BankHoursAssignment {
  id: string;
  employee_id: string;
  company_id: string;
  bank_hours_type_id: string;
  is_active: boolean;
  assigned_at: string;
  assigned_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  employee?: {
    id: string;
    nome: string;
    matricula?: string;
    cpf: string;
  };
  bank_hours_type?: BankHoursType;
}

// =====================================================
// TIPOS PARA FORMULÁRIOS
// =====================================================

export interface BankHoursTypeForm {
  name: string;
  description?: string;
  code: string;
  has_bank_hours: boolean;
  accumulation_period_months: number;
  max_accumulation_hours: number;
  compensation_rate: number;
  auto_compensate: boolean;
  compensation_priority: 'fifo' | 'lifo' | 'manual';
  expires_after_months: number;
  allow_negative_balance: boolean;
  is_default: boolean;
}

export interface BankHoursAssignmentForm {
  employee_id: string;
  bank_hours_type_id: string;
  notes?: string;
}

// =====================================================
// TIPOS PARA RELATÓRIOS E DASHBOARD
// =====================================================

export interface BankHoursTypeSummary {
  id: string;
  name: string;
  code: string;
  employees_count: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

export interface BankHoursAssignmentSummary {
  id: string;
  employee_name: string;
  employee_matricula?: string;
  type_name: string;
  type_code: string;
  is_active: boolean;
  assigned_at: string;
  assigned_by?: string;
}

// =====================================================
// TIPOS PARA CONFIGURAÇÕES PADRÃO
// =====================================================

export interface BankHoursTypeDefaults {
  name: string;
  description: string;
  code: string;
  has_bank_hours: boolean;
  accumulation_period_months: number;
  max_accumulation_hours: number;
  compensation_rate: number;
  auto_compensate: boolean;
  compensation_priority: 'fifo' | 'lifo' | 'manual';
  expires_after_months: number;
  allow_negative_balance: boolean;
  is_default: boolean;
}

// =====================================================
// CONSTANTES E ENUMS
// =====================================================

export const BANK_HOURS_TYPE_DEFAULTS: BankHoursTypeDefaults = {
  name: 'Padrão',
  description: 'Tipo padrão de banco de horas',
  code: 'PADRAO',
  has_bank_hours: true,
  accumulation_period_months: 12,
  max_accumulation_hours: 40.00,
  compensation_rate: 1.00,
  auto_compensate: false,
  compensation_priority: 'fifo',
  expires_after_months: 12,
  allow_negative_balance: false,
  is_default: true,
};

export const COMPENSATION_PRIORITIES = {
  FIFO: 'fifo',
  LIFO: 'lifo',
  MANUAL: 'manual',
} as const;

// =====================================================
// TIPOS PARA MIGRAÇÃO
// =====================================================

export interface BankHoursMigrationResult {
  migrated_count: number;
  default_type_id: string;
  success: boolean;
  error?: string;
}
