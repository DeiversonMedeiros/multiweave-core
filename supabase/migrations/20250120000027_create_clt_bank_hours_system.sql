-- =====================================================
-- SISTEMA DE BANCO DE HORAS CLT COMPLETO
-- =====================================================
-- Implementa regras CLT para banco de horas com:
-- - 3 tipos de escala (5x2, 6x1, 12x36)
-- - Horas extras 50% e 100%
-- - Validade de 6 meses
-- - Fechamento semestral
-- - Tratamento de feriados e domingos
-- =====================================================

-- =====================================================
-- 1. ADICIONAR CAMPOS NECESSÁRIOS
-- =====================================================

-- Adicionar campos em time_records para separar horas extras
ALTER TABLE rh.time_records 
ADD COLUMN IF NOT EXISTS horas_extras_50 DECIMAL(4,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS horas_extras_100 DECIMAL(4,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS horas_para_banco DECIMAL(4,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS horas_para_pagamento DECIMAL(4,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_feriado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_domingo BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_dia_folga BOOLEAN DEFAULT false;

COMMENT ON COLUMN rh.time_records.horas_extras_50 IS 'Horas extras com adicional de 50%';
COMMENT ON COLUMN rh.time_records.horas_extras_100 IS 'Horas extras com adicional de 100%';
COMMENT ON COLUMN rh.time_records.horas_para_banco IS 'Horas que vão para o banco de horas (apenas 50%)';
COMMENT ON COLUMN rh.time_records.horas_para_pagamento IS 'Horas que devem ser pagas diretamente (100%)';
COMMENT ON COLUMN rh.time_records.is_feriado IS 'Indica se o dia é feriado';
COMMENT ON COLUMN rh.time_records.is_domingo IS 'Indica se o dia é domingo';
COMMENT ON COLUMN rh.time_records.is_dia_folga IS 'Indica se é dia de folga do funcionário';

-- Adicionar campos em bank_hours_transactions
ALTER TABLE rh.bank_hours_transactions
ADD COLUMN IF NOT EXISTS overtime_percentage INTEGER DEFAULT 50 CHECK (overtime_percentage IN (50, 100)),
ADD COLUMN IF NOT EXISTS expires_at DATE,
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS closure_id UUID;

COMMENT ON COLUMN rh.bank_hours_transactions.overtime_percentage IS 'Percentual da hora extra (50 ou 100)';
COMMENT ON COLUMN rh.bank_hours_transactions.expires_at IS 'Data de expiração da transação (6 meses após criação)';
COMMENT ON COLUMN rh.bank_hours_transactions.is_paid IS 'Indica se as horas foram pagas no fechamento';
COMMENT ON COLUMN rh.bank_hours_transactions.closure_id IS 'ID do fechamento semestral que processou esta transação';

-- Atualizar configuração padrão do banco de horas para 6 meses
ALTER TABLE rh.bank_hours_config 
ALTER COLUMN expires_after_months SET DEFAULT 6;

-- =====================================================
-- 2. CRIAR TABELAS ADICIONAIS
-- =====================================================

-- Tabela de fechamentos semestrais
CREATE TABLE IF NOT EXISTS rh.bank_hours_closure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Período do fechamento
  closure_date DATE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Saldos
  positive_balance_paid DECIMAL(6,2) DEFAULT 0,
  negative_balance_zeroed DECIMAL(6,2) DEFAULT 0,
  total_hours_50_paid DECIMAL(6,2) DEFAULT 0,
  total_hours_100_paid DECIMAL(6,2) DEFAULT 0,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  
  -- Controle
  created_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(employee_id, company_id, closure_date)
);

CREATE INDEX idx_bank_hours_closure_employee ON rh.bank_hours_closure(employee_id);
CREATE INDEX idx_bank_hours_closure_company ON rh.bank_hours_closure(company_id);
CREATE INDEX idx_bank_hours_closure_date ON rh.bank_hours_closure(closure_date);
CREATE INDEX idx_bank_hours_closure_status ON rh.bank_hours_closure(status);

COMMENT ON TABLE rh.bank_hours_closure IS 'Registro de fechamentos semestrais do banco de horas';

-- Tabela de eventos financeiros de horas extras
CREATE TABLE IF NOT EXISTS rh.payroll_overtime_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  closure_id UUID REFERENCES rh.bank_hours_closure(id) ON DELETE SET NULL,
  
  -- Período
  payroll_period VARCHAR(7) NOT NULL, -- Formato: YYYY-MM
  event_date DATE NOT NULL,
  
  -- Horas
  hours_50_amount DECIMAL(6,2) DEFAULT 0,
  hours_100_amount DECIMAL(6,2) DEFAULT 0,
  
  -- Valores (serão calculados na folha)
  total_value DECIMAL(10,2) DEFAULT 0,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'paid', 'cancelled')),
  
  -- Controle
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payroll_overtime_events_employee ON rh.payroll_overtime_events(employee_id);
CREATE INDEX idx_payroll_overtime_events_company ON rh.payroll_overtime_events(company_id);
CREATE INDEX idx_payroll_overtime_events_period ON rh.payroll_overtime_events(payroll_period);
CREATE INDEX idx_payroll_overtime_events_status ON rh.payroll_overtime_events(status);

COMMENT ON TABLE rh.payroll_overtime_events IS 'Eventos financeiros de horas extras para pagamento na folha';

-- =====================================================
-- 3. FUNÇÕES AUXILIARES
-- =====================================================

-- Função para verificar se uma data é feriado
CREATE OR REPLACE FUNCTION rh.is_holiday(p_date DATE, p_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM rh.holidays 
    WHERE company_id = p_company_id 
      AND data = p_date 
      AND ativo = true
  );
END;
$$ LANGUAGE plpgsql;

-- Função para verificar se uma data é domingo
CREATE OR REPLACE FUNCTION rh.is_sunday(p_date DATE)
RETURNS BOOLEAN AS $$
BEGIN
  -- PostgreSQL: EXTRACT(DOW FROM date) retorna 0=Domingo
  RETURN EXTRACT(DOW FROM p_date) = 0;
END;
$$ LANGUAGE plpgsql;

-- Função para obter tipo de escala do funcionário em uma data
CREATE OR REPLACE FUNCTION rh.get_employee_work_shift_type(
  p_employee_id UUID,
  p_company_id UUID,
  p_date DATE
)
RETURNS VARCHAR(50) AS $$
DECLARE
  v_tipo_escala VARCHAR(50);
BEGIN
  SELECT ws.tipo_escala
  INTO v_tipo_escala
  FROM rh.employee_shifts es
  INNER JOIN rh.work_shifts ws ON ws.id = es.turno_id
  WHERE es.funcionario_id = p_employee_id
    AND es.company_id = p_company_id
    AND es.ativo = true
    AND es.data_inicio <= p_date
    AND (es.data_fim IS NULL OR es.data_fim >= p_date)
  ORDER BY es.data_inicio DESC
  LIMIT 1;

  RETURN COALESCE(v_tipo_escala, 'fixa');
END;
$$ LANGUAGE plpgsql;

-- Função para verificar se é dia de folga do funcionário
CREATE OR REPLACE FUNCTION rh.is_rest_day(
  p_employee_id UUID,
  p_company_id UUID,
  p_date DATE
)
RETURNS BOOLEAN AS $$
DECLARE
  v_dias_semana INTEGER[];
  v_day_of_week INTEGER;
BEGIN
  -- Buscar dias da semana do turno
  SELECT ws.dias_semana
  INTO v_dias_semana
  FROM rh.employee_shifts es
  INNER JOIN rh.work_shifts ws ON ws.id = es.turno_id
  WHERE es.funcionario_id = p_employee_id
    AND es.company_id = p_company_id
    AND es.ativo = true
    AND es.data_inicio <= p_date
    AND (es.data_fim IS NULL OR es.data_fim >= p_date)
  ORDER BY es.data_inicio DESC
  LIMIT 1;

  -- Se não encontrou turno, retornar false
  IF v_dias_semana IS NULL OR array_length(v_dias_semana, 1) = 0 THEN
    RETURN false;
  END IF;

  -- Converter dia da semana (0=Domingo -> 7, 1=Segunda -> 1, etc.)
  v_day_of_week := CASE 
    WHEN EXTRACT(DOW FROM p_date) = 0 THEN 7
    ELSE EXTRACT(DOW FROM p_date)::INTEGER
  END;

  -- Se o dia da semana não está nos dias de trabalho, é folga
  RETURN NOT (v_day_of_week = ANY(v_dias_semana));
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. FUNÇÃO PRINCIPAL: CALCULAR HORAS EXTRAS POR ESCALA
-- =====================================================

CREATE OR REPLACE FUNCTION rh.calculate_overtime_by_scale(
  p_time_record_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_employee_id UUID;
  v_company_id UUID;
  v_date DATE;
  v_horas_trabalhadas DECIMAL(4,2);
  v_horas_diarias DECIMAL(4,2);
  v_tipo_escala VARCHAR(50);
  v_is_feriado BOOLEAN;
  v_is_domingo BOOLEAN;
  v_is_dia_folga BOOLEAN;
  v_horas_extras_50 DECIMAL(4,2) := 0;
  v_horas_extras_100 DECIMAL(4,2) := 0;
  v_horas_para_banco DECIMAL(4,2) := 0;
  v_horas_para_pagamento DECIMAL(4,2) := 0;
  v_excedente DECIMAL(4,2);
BEGIN
  -- Buscar dados do registro
  SELECT 
    tr.employee_id,
    tr.company_id,
    tr.data_registro,
    tr.horas_trabalhadas
  INTO 
    v_employee_id,
    v_company_id,
    v_date,
    v_horas_trabalhadas
  FROM rh.time_records tr
  WHERE tr.id = p_time_record_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Buscar tipo de escala e horas diárias
  SELECT 
    rh.get_employee_work_shift_type(v_employee_id, v_company_id, v_date),
    ws.horas_diarias
  INTO 
    v_tipo_escala,
    v_horas_diarias
  FROM rh.employee_shifts es
  INNER JOIN rh.work_shifts ws ON ws.id = es.turno_id
  WHERE es.funcionario_id = v_employee_id
    AND es.company_id = v_company_id
    AND es.ativo = true
    AND es.data_inicio <= v_date
    AND (es.data_fim IS NULL OR es.data_fim >= v_date)
  ORDER BY es.data_inicio DESC
  LIMIT 1;

  -- Se não encontrou turno, usar padrão
  IF v_horas_diarias IS NULL THEN
    v_horas_diarias := 8.0;
  END IF;
  IF v_tipo_escala IS NULL THEN
    v_tipo_escala := 'fixa';
  END IF;

  -- Verificar se é feriado, domingo ou dia de folga
  v_is_feriado := rh.is_holiday(v_date, v_company_id);
  v_is_domingo := rh.is_sunday(v_date);
  v_is_dia_folga := rh.is_rest_day(v_employee_id, v_company_id, v_date);

  -- Calcular excedente (horas trabalhadas - horas diárias)
  v_excedente := GREATEST(0, v_horas_trabalhadas - v_horas_diarias);

  -- Aplicar regras por tipo de escala
  IF v_tipo_escala = 'escala_12x36' THEN
    -- ESCALA 12x36: Só existe excedente se romper 12h
    IF v_horas_trabalhadas > 12 THEN
      v_excedente := v_horas_trabalhadas - 12;
      -- Se é feriado trabalhado, pagar 100%
      IF v_is_feriado THEN
        v_horas_extras_100 := v_excedente;
        v_horas_para_pagamento := v_excedente;
      ELSE
        -- Horas extras normais vão para banco (50%)
        v_horas_extras_50 := v_excedente;
        v_horas_para_banco := v_excedente;
      END IF;
    END IF;
    
  ELSIF v_tipo_escala = 'flexivel_6x1' THEN
    -- ESCALA 6x1: Dia de folga ou feriado = 100%
    IF v_is_dia_folga OR v_is_feriado THEN
      v_horas_extras_100 := v_excedente;
      v_horas_para_pagamento := v_excedente;
    ELSE
      -- Horas extras normais vão para banco (50%)
      v_horas_extras_50 := v_excedente;
      v_horas_para_banco := v_excedente;
    END IF;
    
  ELSE
    -- ESCALA 5x2 (fixa) ou outras: Domingo ou feriado = 100%
    IF v_is_domingo OR v_is_feriado THEN
      v_horas_extras_100 := v_excedente;
      v_horas_para_pagamento := v_excedente;
    ELSE
      -- Sábado em escala 5x2: vai para banco (50%)
      -- Horas extras normais: vão para banco (50%)
      v_horas_extras_50 := v_excedente;
      v_horas_para_banco := v_excedente;
    END IF;
  END IF;

  -- Atualizar registro
  UPDATE rh.time_records
  SET 
    horas_extras_50 = ROUND(v_horas_extras_50, 2),
    horas_extras_100 = ROUND(v_horas_extras_100, 2),
    horas_para_banco = ROUND(v_horas_para_banco, 2),
    horas_para_pagamento = ROUND(v_horas_para_pagamento, 2),
    is_feriado = v_is_feriado,
    is_domingo = v_is_domingo,
    is_dia_folga = v_is_dia_folga
  WHERE id = p_time_record_id;

END;
$$;

COMMENT ON FUNCTION rh.calculate_overtime_by_scale IS 
  'Calcula horas extras conforme tipo de escala e regras CLT.
   Separa horas 50% (banco) de horas 100% (pagamento direto).';

-- =====================================================
-- 5. ATUALIZAR FUNÇÃO recalculate_time_record_hours
-- =====================================================

-- Esta função já existe, vamos adicionar chamada para calcular horas extras por escala
-- A função será atualizada para chamar calculate_overtime_by_scale após calcular horas trabalhadas

CREATE OR REPLACE FUNCTION rh.recalculate_time_record_hours_with_scale(p_time_record_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Primeiro, recalcular horas trabalhadas (lógica existente)
  PERFORM rh.recalculate_time_record_hours(p_time_record_id);
  
  -- Depois, calcular horas extras por escala
  PERFORM rh.calculate_overtime_by_scale(p_time_record_id);
END;
$$;

-- =====================================================
-- 6. FUNÇÃO: PROCESSAR BANCO DE HORAS DIÁRIO
-- =====================================================

CREATE OR REPLACE FUNCTION rh.process_daily_bank_hours(
  p_employee_id UUID,
  p_company_id UUID,
  p_date DATE
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_time_record_id UUID;
  v_horas_para_banco DECIMAL(4,2);
  v_config rh.bank_hours_config%ROWTYPE;
  v_balance rh.bank_hours_balance%ROWTYPE;
BEGIN
  -- Buscar registro de ponto do dia
  SELECT id, horas_para_banco
  INTO v_time_record_id, v_horas_para_banco
  FROM rh.time_records
  WHERE employee_id = p_employee_id
    AND company_id = p_company_id
    AND data_registro = p_date
    AND status = 'aprovado';

  -- Se não há registro ou não há horas para banco, retornar
  IF v_time_record_id IS NULL OR v_horas_para_banco <= 0 THEN
    RETURN;
  END IF;

  -- Verificar se tem banco de horas configurado
  SELECT * INTO v_config
  FROM rh.bank_hours_config
  WHERE employee_id = p_employee_id
    AND company_id = p_company_id
    AND is_active = true
    AND has_bank_hours = true;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Buscar ou criar saldo
  SELECT * INTO v_balance
  FROM rh.bank_hours_balance
  WHERE employee_id = p_employee_id
    AND company_id = p_company_id;

  IF NOT FOUND THEN
    INSERT INTO rh.bank_hours_balance (employee_id, company_id, current_balance)
    VALUES (p_employee_id, p_company_id, 0)
    RETURNING * INTO v_balance;
  END IF;

  -- Verificar limite máximo de acumulação
  IF v_balance.accumulated_hours + v_horas_para_banco > v_config.max_accumulation_hours THEN
    -- Exceder limite, não acumular
    RETURN;
  END IF;

  -- Criar transação de acumulação
  INSERT INTO rh.bank_hours_transactions (
    employee_id,
    company_id,
    transaction_type,
    transaction_date,
    hours_amount,
    time_record_id,
    overtime_percentage,
    expires_at,
    description,
    is_automatic
  ) VALUES (
    p_employee_id,
    p_company_id,
    'accumulation',
    p_date,
    v_horas_para_banco,
    v_time_record_id,
    50,
    p_date + INTERVAL '6 months',
    'Acumulação diária de horas extras 50%',
    true
  );

  -- Atualizar saldo
  UPDATE rh.bank_hours_balance
  SET 
    current_balance = current_balance + v_horas_para_banco,
    accumulated_hours = accumulated_hours + v_horas_para_banco,
    last_calculation_date = p_date,
    updated_at = NOW()
  WHERE employee_id = p_employee_id
    AND company_id = p_company_id;

END;
$$;

COMMENT ON FUNCTION rh.process_daily_bank_hours IS 
  'Processa banco de horas diário para um funcionário.
   Apenas horas 50% são acumuladas no banco.';

-- =====================================================
-- 7. FUNÇÃO: PROCESSAR BANCO DE HORAS SEMANAL
-- =====================================================

CREATE OR REPLACE FUNCTION rh.process_weekly_bank_hours(
  p_company_id UUID,
  p_week_start_date DATE
)
RETURNS TABLE(
  employees_processed INTEGER,
  total_hours_accumulated DECIMAL(8,2)
) AS $$
DECLARE
  v_employee_record RECORD;
  v_week_end_date DATE;
  v_total_employees INTEGER := 0;
  v_total_hours DECIMAL(8,2) := 0;
BEGIN
  v_week_end_date := p_week_start_date + INTERVAL '6 days';

  -- Processar cada funcionário com banco de horas
  FOR v_employee_record IN
    SELECT DISTINCT e.id as employee_id
    FROM rh.employees e
    INNER JOIN rh.bank_hours_config bhc ON bhc.employee_id = e.id
    WHERE e.company_id = p_company_id
      AND e.status = 'ativo'
      AND bhc.is_active = true
      AND bhc.has_bank_hours = true
  LOOP
    -- Processar cada dia da semana
    FOR i IN 0..6 LOOP
      PERFORM rh.process_daily_bank_hours(
        v_employee_record.employee_id,
        p_company_id,
        p_week_start_date + (i || ' days')::INTERVAL
      );
    END LOOP;

    v_total_employees := v_total_employees + 1;
  END LOOP;

  -- Calcular total de horas acumuladas na semana
  SELECT COALESCE(SUM(hours_amount), 0)
  INTO v_total_hours
  FROM rh.bank_hours_transactions
  WHERE company_id = p_company_id
    AND transaction_type = 'accumulation'
    AND transaction_date BETWEEN p_week_start_date AND v_week_end_date
    AND is_automatic = true;

  RETURN QUERY SELECT v_total_employees, v_total_hours;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION rh.process_weekly_bank_hours IS 
  'Processa banco de horas semanal para todos os funcionários da empresa.';

-- =====================================================
-- 8. FUNÇÃO: PROCESSAR BANCO DE HORAS MENSAL
-- =====================================================

CREATE OR REPLACE FUNCTION rh.process_monthly_bank_hours(
  p_company_id UUID,
  p_month_year VARCHAR(7) -- Formato: YYYY-MM
)
RETURNS TABLE(
  employees_processed INTEGER,
  total_hours_accumulated DECIMAL(8,2),
  total_hours_debit DECIMAL(8,2)
) AS $$
DECLARE
  v_month_start DATE;
  v_month_end DATE;
  v_employee_record RECORD;
  v_total_employees INTEGER := 0;
  v_total_accumulated DECIMAL(8,2) := 0;
  v_total_debit DECIMAL(8,2) := 0;
  v_result RECORD;
BEGIN
  -- Calcular primeiro e último dia do mês
  v_month_start := (p_month_year || '-01')::DATE;
  v_month_end := (v_month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  -- Processar cada funcionário
  FOR v_employee_record IN
    SELECT DISTINCT e.id as employee_id
    FROM rh.employees e
    INNER JOIN rh.bank_hours_config bhc ON bhc.employee_id = e.id
    WHERE e.company_id = p_company_id
      AND e.status = 'ativo'
      AND bhc.is_active = true
      AND bhc.has_bank_hours = true
  LOOP
    -- Processar dias sem registro (débito)
    PERFORM rh.calculate_and_accumulate_bank_hours(
      v_employee_record.employee_id,
      p_company_id,
      v_month_start,
      v_month_end
    );

    v_total_employees := v_total_employees + 1;
  END LOOP;

  -- Calcular totais
  SELECT 
    COALESCE(SUM(CASE WHEN hours_amount > 0 THEN hours_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN hours_amount < 0 THEN ABS(hours_amount) ELSE 0 END), 0)
  INTO v_total_accumulated, v_total_debit
  FROM rh.bank_hours_transactions
  WHERE company_id = p_company_id
    AND transaction_date BETWEEN v_month_start AND v_month_end
    AND is_automatic = true;

  RETURN QUERY SELECT v_total_employees, v_total_accumulated, v_total_debit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION rh.process_monthly_bank_hours IS 
  'Processa banco de horas mensal incluindo débitos de dias sem registro.';

-- =====================================================
-- 9. FUNÇÃO: FECHAMENTO SEMESTRAL DO BANCO DE HORAS
-- =====================================================

CREATE OR REPLACE FUNCTION rh.process_semester_bank_hours_closure(
  p_employee_id UUID,
  p_company_id UUID,
  p_closure_date DATE DEFAULT CURRENT_DATE
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_closure_id UUID;
  v_period_start DATE;
  v_period_end DATE;
  v_balance rh.bank_hours_balance%ROWTYPE;
  v_positive_balance DECIMAL(6,2) := 0;
  v_negative_balance DECIMAL(6,2) := 0;
  v_hours_50_to_pay DECIMAL(6,2) := 0;
  v_hours_100_to_pay DECIMAL(6,2) := 0;
  v_transaction_record RECORD;
  v_payroll_period VARCHAR(7);
BEGIN
  -- Calcular período (6 meses antes)
  v_period_start := p_closure_date - INTERVAL '6 months';
  v_period_end := p_closure_date;

  -- Buscar saldo atual
  SELECT * INTO v_balance
  FROM rh.bank_hours_balance
  WHERE employee_id = p_employee_id
    AND company_id = p_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Funcionário não possui banco de horas configurado';
  END IF;

  -- Separar saldo positivo e negativo
  IF v_balance.current_balance > 0 THEN
    v_positive_balance := v_balance.current_balance;
  ELSE
    v_negative_balance := ABS(v_balance.current_balance);
  END IF;

  -- Buscar transações expiradas ou do período
  FOR v_transaction_record IN
    SELECT *
    FROM rh.bank_hours_transactions
    WHERE employee_id = p_employee_id
      AND company_id = p_company_id
      AND transaction_type = 'accumulation'
      AND (expires_at <= p_closure_date OR transaction_date BETWEEN v_period_start AND v_period_end)
      AND is_paid = false
    ORDER BY transaction_date ASC
  LOOP
    -- Se é hora extra 50%, vai para pagamento
    IF v_transaction_record.overtime_percentage = 50 THEN
      v_hours_50_to_pay := v_hours_50_to_pay + v_transaction_record.hours_amount;
    END IF;
  END LOOP;

  -- Buscar horas 100% do período (não vão para banco, mas precisam ser pagas)
  SELECT COALESCE(SUM(horas_para_pagamento), 0)
  INTO v_hours_100_to_pay
  FROM rh.time_records
  WHERE employee_id = p_employee_id
    AND company_id = p_company_id
    AND data_registro BETWEEN v_period_start AND v_period_end
    AND status = 'aprovado'
    AND horas_para_pagamento > 0;

  -- Criar registro de fechamento
  INSERT INTO rh.bank_hours_closure (
    employee_id,
    company_id,
    closure_date,
    period_start,
    period_end,
    positive_balance_paid,
    negative_balance_zeroed,
    total_hours_50_paid,
    total_hours_100_paid,
    status
  ) VALUES (
    p_employee_id,
    p_company_id,
    p_closure_date,
    v_period_start,
    v_period_end,
    v_positive_balance,
    v_negative_balance,
    v_hours_50_to_pay,
    v_hours_100_to_pay,
    'processing'
  ) RETURNING id INTO v_closure_id;

  -- Gerar período da folha (mês do fechamento)
  v_payroll_period := TO_CHAR(p_closure_date, 'YYYY-MM');

  -- Criar evento financeiro para horas extras
  INSERT INTO rh.payroll_overtime_events (
    employee_id,
    company_id,
    closure_id,
    payroll_period,
    event_date,
    hours_50_amount,
    hours_100_amount,
    status
  ) VALUES (
    p_employee_id,
    p_company_id,
    v_closure_id,
    v_payroll_period,
    p_closure_date,
    v_hours_50_to_pay + v_positive_balance, -- Saldo positivo + horas 50% acumuladas
    v_hours_100_to_pay,
    'pending'
  );

  -- Marcar transações como pagas
  UPDATE rh.bank_hours_transactions
  SET 
    is_paid = true,
    closure_id = v_closure_id
  WHERE employee_id = p_employee_id
    AND company_id = p_company_id
    AND transaction_type = 'accumulation'
    AND (expires_at <= p_closure_date OR transaction_date BETWEEN v_period_start AND v_period_end)
    AND is_paid = false;

  -- Zerar banco (saldo positivo pago, saldo negativo zerado)
  UPDATE rh.bank_hours_balance
  SET 
    current_balance = 0,
    last_calculation_date = p_closure_date,
    updated_at = NOW()
  WHERE employee_id = p_employee_id
    AND company_id = p_company_id;

  -- Atualizar status do fechamento
  UPDATE rh.bank_hours_closure
  SET 
    status = 'completed',
    updated_at = NOW()
  WHERE id = v_closure_id;

  RETURN v_closure_id;
END;
$$;

COMMENT ON FUNCTION rh.process_semester_bank_hours_closure IS 
  'Processa fechamento semestral do banco de horas:
   - Saldo positivo: pago em folha
   - Saldo negativo: zerado (não descontado)
   - Horas 50% expiradas: pagas
   - Horas 100%: sempre pagas';

-- =====================================================
-- 10. FUNÇÃO: PROCESSAR FECHAMENTO PARA TODA A EMPRESA
-- =====================================================

CREATE OR REPLACE FUNCTION rh.process_company_semester_closure(
  p_company_id UUID,
  p_closure_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  employees_processed INTEGER,
  closures_created INTEGER,
  total_hours_50_paid DECIMAL(8,2),
  total_hours_100_paid DECIMAL(8,2)
) AS $$
DECLARE
  v_employee_record RECORD;
  v_closure_id UUID;
  v_total_employees INTEGER := 0;
  v_total_closures INTEGER := 0;
  v_total_50 DECIMAL(8,2) := 0;
  v_total_100 DECIMAL(8,2) := 0;
BEGIN
  -- Processar cada funcionário com banco de horas
  FOR v_employee_record IN
    SELECT DISTINCT e.id as employee_id
    FROM rh.employees e
    INNER JOIN rh.bank_hours_config bhc ON bhc.employee_id = e.id
    WHERE e.company_id = p_company_id
      AND e.status = 'ativo'
      AND bhc.is_active = true
      AND bhc.has_bank_hours = true
  LOOP
    BEGIN
      v_closure_id := rh.process_semester_bank_hours_closure(
        v_employee_record.employee_id,
        p_company_id,
        p_closure_date
      );

      -- Somar horas do fechamento
      SELECT 
        total_hours_50_paid,
        total_hours_100_paid
      INTO 
        v_total_50,
        v_total_100
      FROM rh.bank_hours_closure
      WHERE id = v_closure_id;

      v_total_employees := v_total_employees + 1;
      v_total_closures := v_total_closures + 1;
    EXCEPTION
      WHEN OTHERS THEN
        -- Log erro mas continua processamento
        RAISE NOTICE 'Erro ao processar fechamento para funcionário %: %', v_employee_record.employee_id, SQLERRM;
    END;
  END LOOP;

  -- Calcular totais
  SELECT 
    COALESCE(SUM(total_hours_50_paid), 0),
    COALESCE(SUM(total_hours_100_paid), 0)
  INTO 
    v_total_50,
    v_total_100
  FROM rh.bank_hours_closure
  WHERE company_id = p_company_id
    AND closure_date = p_closure_date
    AND status = 'completed';

  RETURN QUERY SELECT v_total_employees, v_total_closures, v_total_50, v_total_100;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION rh.process_company_semester_closure IS 
  'Processa fechamento semestral do banco de horas para toda a empresa.';

-- =====================================================
-- 11. TRIGGER: CALCULAR HORAS EXTRAS AO APROVAR REGISTRO
-- =====================================================

CREATE OR REPLACE FUNCTION rh.trg_calculate_overtime_on_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Quando um registro é aprovado, calcular horas extras por escala
  IF NEW.status = 'aprovado' AND (OLD.status IS NULL OR OLD.status != 'aprovado') THEN
    PERFORM rh.calculate_overtime_by_scale(NEW.id);
    PERFORM rh.process_daily_bank_hours(NEW.employee_id, NEW.company_id, NEW.data_registro);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calculate_overtime_on_approval ON rh.time_records;
CREATE TRIGGER trg_calculate_overtime_on_approval
  AFTER UPDATE OF status ON rh.time_records
  FOR EACH ROW
  WHEN (NEW.status = 'aprovado' AND (OLD.status IS NULL OR OLD.status != 'aprovado'))
  EXECUTE FUNCTION rh.trg_calculate_overtime_on_approval();

-- =====================================================
-- 12. RLS POLICIES PARA NOVAS TABELAS
-- =====================================================

ALTER TABLE rh.bank_hours_closure ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.payroll_overtime_events ENABLE ROW LEVEL SECURITY;

-- Policies para bank_hours_closure
CREATE POLICY "Users can view bank hours closure for their companies" ON rh.bank_hours_closure
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid() AND ativo = true
    )
  );

CREATE POLICY "Users can manage bank hours closure for their companies" ON rh.bank_hours_closure
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid() AND ativo = true
    )
  );

-- Policies para payroll_overtime_events
CREATE POLICY "Users can view payroll overtime events for their companies" ON rh.payroll_overtime_events
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid() AND ativo = true
    )
  );

CREATE POLICY "Users can manage payroll overtime events for their companies" ON rh.payroll_overtime_events
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid() AND ativo = true
    )
  );

-- =====================================================
-- 13. ÍNDICES ADICIONAIS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_time_records_horas_para_banco ON rh.time_records(horas_para_banco) WHERE horas_para_banco > 0;
CREATE INDEX IF NOT EXISTS idx_time_records_horas_para_pagamento ON rh.time_records(horas_para_pagamento) WHERE horas_para_pagamento > 0;
CREATE INDEX IF NOT EXISTS idx_time_records_is_feriado ON rh.time_records(is_feriado) WHERE is_feriado = true;
CREATE INDEX IF NOT EXISTS idx_bank_hours_transactions_expires_at ON rh.bank_hours_transactions(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bank_hours_transactions_is_paid ON rh.bank_hours_transactions(is_paid) WHERE is_paid = false;
CREATE INDEX IF NOT EXISTS idx_bank_hours_transactions_closure_id ON rh.bank_hours_transactions(closure_id) WHERE closure_id IS NOT NULL;

