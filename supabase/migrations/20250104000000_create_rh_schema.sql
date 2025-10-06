-- =====================================================
-- MÓDULO DE RECURSOS HUMANOS - ESTRUTURA BASE
-- =====================================================

-- Criar schema RH
CREATE SCHEMA IF NOT EXISTS rh;

-- =====================================================
-- 1. FUNCIONÁRIOS
-- =====================================================
CREATE TABLE rh.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  matricula VARCHAR(50),
  cpf VARCHAR(14) UNIQUE NOT NULL,
  rg VARCHAR(20),
  data_nascimento DATE,
  data_admissao DATE NOT NULL,
  data_demissao DATE,
  cargo_id UUID REFERENCES rh.positions(id),
  departamento_id UUID REFERENCES rh.units(id),
  salario_base DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'afastado', 'demitido')),
  telefone VARCHAR(20),
  email VARCHAR(255),
  endereco TEXT,
  cidade VARCHAR(100),
  estado VARCHAR(2),
  cep VARCHAR(10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. CARGOS/POSIÇÕES
-- =====================================================
CREATE TABLE rh.positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  nivel_hierarquico INTEGER DEFAULT 1,
  salario_minimo DECIMAL(10,2),
  salario_maximo DECIMAL(10,2),
  carga_horaria INTEGER DEFAULT 40,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. DEPARTAMENTOS/UNIDADES
-- =====================================================
CREATE TABLE rh.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  codigo VARCHAR(20),
  responsavel_id UUID REFERENCES rh.employees(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. REGISTROS DE PONTO
-- =====================================================
CREATE TABLE rh.time_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  data_registro DATE NOT NULL,
  entrada TIME,
  saida TIME,
  entrada_almoco TIME,
  saida_almoco TIME,
  horas_trabalhadas DECIMAL(4,2) DEFAULT 0,
  horas_extras DECIMAL(4,2) DEFAULT 0,
  horas_faltas DECIMAL(4,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'corrigido')),
  observacoes TEXT,
  aprovado_por UUID REFERENCES profiles(id),
  aprovado_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, data_registro)
);

-- =====================================================
-- 5. ESCALAS DE TRABALHO
-- =====================================================
CREATE TABLE rh.work_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  carga_horaria_semanal INTEGER DEFAULT 40,
  dias_trabalho INTEGER[] DEFAULT ARRAY[1,2,3,4,5], -- 1=Segunda, 2=Terça, etc.
  horario_inicio TIME DEFAULT '08:00',
  horario_fim TIME DEFAULT '17:00',
  intervalo_almoco INTEGER DEFAULT 60, -- em minutos
  tolerancia_entrada INTEGER DEFAULT 15, -- em minutos
  tolerancia_saida INTEGER DEFAULT 15, -- em minutos
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. VÍNCULOS FUNCIONÁRIO-ESCALA
-- =====================================================
CREATE TABLE rh.employee_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES rh.work_schedules(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  data_inicio DATE NOT NULL,
  data_fim DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. SISTEMA UNIFICADO DE BENEFÍCIOS
-- =====================================================

-- Configurações de Benefícios
CREATE TABLE rh.benefit_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  benefit_type VARCHAR(50) NOT NULL CHECK (benefit_type IN ('vr_va', 'transporte', 'equipment_rental', 'premiacao', 'outros')),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  calculation_type VARCHAR(50) NOT NULL CHECK (calculation_type IN ('fixed_value', 'daily_value', 'percentage', 'work_days')),
  base_value DECIMAL(10,2),
  percentage_value DECIMAL(5,2),
  min_value DECIMAL(10,2),
  max_value DECIMAL(10,2),
  daily_calculation_base INTEGER DEFAULT 30,
  requires_approval BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vínculos Funcionário-Benefício
CREATE TABLE rh.employee_benefit_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
  benefit_config_id UUID NOT NULL REFERENCES rh.benefit_configurations(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  custom_value DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Processamento Mensal de Benefícios
CREATE TABLE rh.monthly_benefit_processing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
  benefit_config_id UUID NOT NULL REFERENCES rh.benefit_configurations(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  month_reference INTEGER NOT NULL CHECK (month_reference BETWEEN 1 AND 12),
  year_reference INTEGER NOT NULL,
  base_value DECIMAL(10,2),
  work_days INTEGER,
  absence_days INTEGER,
  discount_value DECIMAL(10,2) DEFAULT 0,
  final_value DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'validated', 'rejected')),
  processed_at TIMESTAMP WITH TIME ZONE,
  validated_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES profiles(id),
  validated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, benefit_config_id, month_reference, year_reference)
);

-- =====================================================
-- 8. FÉRIAS E LICENÇAS
-- =====================================================
CREATE TABLE rh.vacations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('ferias', 'licenca_medica', 'licenca_maternidade', 'licenca_paternidade', 'afastamento', 'outros')),
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  dias_solicitados INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'em_andamento', 'concluido')),
  observacoes TEXT,
  anexos TEXT[], -- URLs dos anexos
  solicitado_por UUID REFERENCES profiles(id),
  aprovado_por UUID REFERENCES profiles(id),
  aprovado_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 9. ATESTADOS MÉDICOS
-- =====================================================
CREATE TABLE rh.medical_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  numero_atestado VARCHAR(100),
  data_emissao DATE NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  dias_afastamento INTEGER NOT NULL,
  cid_codigo VARCHAR(10),
  cid_descricao TEXT,
  observacoes TEXT,
  anexo_url TEXT,
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  aprovado_por UUID REFERENCES profiles(id),
  aprovado_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 10. FOLHA DE PAGAMENTO
-- =====================================================
CREATE TABLE rh.payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  mes_referencia INTEGER NOT NULL CHECK (mes_referencia BETWEEN 1 AND 12),
  ano_referencia INTEGER NOT NULL,
  salario_base DECIMAL(10,2) NOT NULL,
  horas_trabalhadas DECIMAL(4,2) DEFAULT 0,
  horas_extras DECIMAL(4,2) DEFAULT 0,
  valor_horas_extras DECIMAL(10,2) DEFAULT 0,
  total_vencimentos DECIMAL(10,2) DEFAULT 0,
  total_descontos DECIMAL(10,2) DEFAULT 0,
  salario_liquido DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'processado', 'pago', 'cancelado')),
  data_pagamento DATE,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, mes_referencia, ano_referencia)
);

-- =====================================================
-- 11. ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para employees
CREATE INDEX idx_employees_company_id ON rh.employees(company_id);
CREATE INDEX idx_employees_cpf ON rh.employees(cpf);
CREATE INDEX idx_employees_status ON rh.employees(status);
CREATE INDEX idx_employees_cargo_id ON rh.employees(cargo_id);

-- Índices para time_records
CREATE INDEX idx_time_records_employee_id ON rh.time_records(employee_id);
CREATE INDEX idx_time_records_company_id ON rh.time_records(company_id);
CREATE INDEX idx_time_records_data_registro ON rh.time_records(data_registro);
CREATE INDEX idx_time_records_status ON rh.time_records(status);

-- Índices para benefit_processing
CREATE INDEX idx_benefit_processing_employee_id ON rh.monthly_benefit_processing(employee_id);
CREATE INDEX idx_benefit_processing_company_id ON rh.monthly_benefit_processing(company_id);
CREATE INDEX idx_benefit_processing_reference ON rh.monthly_benefit_processing(month_reference, year_reference);

-- =====================================================
-- 12. TRIGGERS PARA UPDATED_AT
-- =====================================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION rh.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger em todas as tabelas
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON rh.employees FOR EACH ROW EXECUTE FUNCTION rh.update_updated_at_column();
CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON rh.positions FOR EACH ROW EXECUTE FUNCTION rh.update_updated_at_column();
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON rh.units FOR EACH ROW EXECUTE FUNCTION rh.update_updated_at_column();
CREATE TRIGGER update_time_records_updated_at BEFORE UPDATE ON rh.time_records FOR EACH ROW EXECUTE FUNCTION rh.update_updated_at_column();
CREATE TRIGGER update_work_schedules_updated_at BEFORE UPDATE ON rh.work_schedules FOR EACH ROW EXECUTE FUNCTION rh.update_updated_at_column();
CREATE TRIGGER update_employee_schedules_updated_at BEFORE UPDATE ON rh.employee_schedules FOR EACH ROW EXECUTE FUNCTION rh.update_updated_at_column();
CREATE TRIGGER update_benefit_configurations_updated_at BEFORE UPDATE ON rh.benefit_configurations FOR EACH ROW EXECUTE FUNCTION rh.update_updated_at_column();
CREATE TRIGGER update_employee_benefit_assignments_updated_at BEFORE UPDATE ON rh.employee_benefit_assignments FOR EACH ROW EXECUTE FUNCTION rh.update_updated_at_column();
CREATE TRIGGER update_vacations_updated_at BEFORE UPDATE ON rh.vacations FOR EACH ROW EXECUTE FUNCTION rh.update_updated_at_column();
CREATE TRIGGER update_medical_certificates_updated_at BEFORE UPDATE ON rh.medical_certificates FOR EACH ROW EXECUTE FUNCTION rh.update_updated_at_column();
CREATE TRIGGER update_payroll_updated_at BEFORE UPDATE ON rh.payroll FOR EACH ROW EXECUTE FUNCTION rh.update_updated_at_column();
