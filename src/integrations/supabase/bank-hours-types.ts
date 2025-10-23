// =====================================================
// TIPOS PARA SISTEMA DE BANCO DE HORAS
// =====================================================

export interface BankHoursConfig {
  id: string;
  employee_id: string;
  company_id: string;
  has_bank_hours: boolean;
  accumulation_period_months: number;
  max_accumulation_hours: number;
  compensation_rate: number;
  auto_compensate: boolean;
  compensation_priority: 'fifo' | 'lifo' | 'manual';
  expires_after_months: number;
  allow_negative_balance: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  employee?: {
    id: string;
    nome: string;
    matricula?: string;
    cpf: string;
  };
}

export interface BankHoursBalance {
  id: string;
  employee_id: string;
  company_id: string;
  current_balance: number;
  accumulated_hours: number;
  compensated_hours: number;
  expired_hours: number;
  last_calculation_date: string;
  next_expiration_date?: string;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  employee?: {
    id: string;
    nome: string;
    matricula?: string;
    cpf: string;
  };
}

export interface BankHoursTransaction {
  id: string;
  employee_id: string;
  company_id: string;
  transaction_type: 'accumulation' | 'compensation' | 'expiration' | 'adjustment' | 'transfer';
  transaction_date: string;
  hours_amount: number;
  time_record_id?: string;
  reference_period_start?: string;
  reference_period_end?: string;
  description?: string;
  compensation_rate: number;
  is_automatic: boolean;
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  employee?: {
    id: string;
    nome: string;
    matricula?: string;
  };
  time_record?: {
    id: string;
    data_registro: string;
    horas_extras: number;
  };
}

export interface BankHoursCalculation {
  id: string;
  company_id: string;
  calculation_date: string;
  period_start: string;
  period_end: string;
  employees_processed: number;
  hours_accumulated: number;
  hours_compensated: number;
  hours_expired: number;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

// =====================================================
// TIPOS PARA FORMULÁRIOS E CONFIGURAÇÕES
// =====================================================

export interface BankHoursConfigForm {
  employee_id: string;
  has_bank_hours: boolean;
  accumulation_period_months: number;
  max_accumulation_hours: number;
  compensation_rate: number;
  auto_compensate: boolean;
  compensation_priority: 'fifo' | 'lifo' | 'manual';
  expires_after_months: number;
  allow_negative_balance: boolean;
}

export interface BankHoursAdjustmentForm {
  employee_id: string;
  hours_amount: number;
  description: string;
}

export interface BankHoursCalculationForm {
  company_id: string;
  calculation_date: string;
  period_start: string;
  period_end: string;
}

// =====================================================
// TIPOS PARA RELATÓRIOS E DASHBOARD
// =====================================================

export interface BankHoursSummary {
  employee_id: string;
  employee_name: string;
  employee_matricula?: string;
  current_balance: number;
  accumulated_hours: number;
  compensated_hours: number;
  expired_hours: number;
  has_bank_hours: boolean;
  max_accumulation_hours: number;
  last_calculation_date: string;
}

export interface BankHoursReport {
  period_start: string;
  period_end: string;
  total_employees: number;
  employees_with_bank_hours: number;
  total_accumulated_hours: number;
  total_compensated_hours: number;
  total_expired_hours: number;
  average_balance: number;
  employees_summary: BankHoursSummary[];
}

// =====================================================
// TIPOS PARA CONFIGURAÇÕES PADRÃO
// =====================================================

export interface BankHoursDefaults {
  accumulation_period_months: number;
  max_accumulation_hours: number;
  compensation_rate: number;
  auto_compensate: boolean;
  compensation_priority: 'fifo' | 'lifo' | 'manual';
  expires_after_months: number;
  allow_negative_balance: boolean;
}

// =====================================================
// CONSTANTES E ENUMS
// =====================================================

export const BANK_HOURS_DEFAULTS: BankHoursDefaults = {
  accumulation_period_months: 12,
  max_accumulation_hours: 40.00,
  compensation_rate: 1.00,
  auto_compensate: false,
  compensation_priority: 'fifo',
  expires_after_months: 12,
  allow_negative_balance: false,
};

export const TRANSACTION_TYPES = {
  ACCUMULATION: 'accumulation',
  COMPENSATION: 'compensation',
  EXPIRATION: 'expiration',
  ADJUSTMENT: 'adjustment',
  TRANSFER: 'transfer',
} as const;

export const COMPENSATION_PRIORITIES = {
  FIFO: 'fifo',
  LIFO: 'lifo',
  MANUAL: 'manual',
} as const;

export const CALCULATION_STATUS = {
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;
