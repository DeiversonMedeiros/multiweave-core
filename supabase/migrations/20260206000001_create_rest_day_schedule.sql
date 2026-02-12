-- =====================================================
-- ESCALA DE FOLGA - SISTEMA DE FOLGAS ADICIONAIS
-- =====================================================
-- Permite inserir dias de folga para funcionários e
-- descontar automaticamente as horas do banco de horas
-- =====================================================

-- Tabela para armazenar dias de folga adicionais
CREATE TABLE IF NOT EXISTS rh.rest_day_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Data da folga
  data_folga DATE NOT NULL,
  
  -- Quantidade de horas a descontar (se NULL, usa horas_diarias do turno)
  horas_descontar DECIMAL(5,2),
  
  -- Observações
  observacoes TEXT,
  
  -- Controle
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Evitar duplicatas: um funcionário não pode ter duas folgas no mesmo dia
  UNIQUE(employee_id, company_id, data_folga)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_rest_day_schedule_employee ON rh.rest_day_schedule(employee_id);
CREATE INDEX IF NOT EXISTS idx_rest_day_schedule_company ON rh.rest_day_schedule(company_id);
CREATE INDEX IF NOT EXISTS idx_rest_day_schedule_date ON rh.rest_day_schedule(data_folga);

-- Comentários
COMMENT ON TABLE rh.rest_day_schedule IS 'Registra dias de folga adicionais para funcionários, descontando horas do banco de horas';
COMMENT ON COLUMN rh.rest_day_schedule.data_folga IS 'Data do dia de folga';
COMMENT ON COLUMN rh.rest_day_schedule.horas_descontar IS 'Quantidade de horas a descontar do banco. Se NULL, usa horas_diarias do turno do funcionário';

-- Trigger para atualizar updated_at
CREATE TRIGGER update_rest_day_schedule_updated_at 
    BEFORE UPDATE ON rh.rest_day_schedule 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE rh.rest_day_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rest day schedule for their companies" ON rh.rest_day_schedule
    FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM user_companies WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage rest day schedule for their companies" ON rh.rest_day_schedule
    FOR ALL
    USING (
        company_id IN (
            SELECT company_id FROM user_companies WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- FUNÇÃO: Criar folga e descontar horas do banco
-- =====================================================
CREATE OR REPLACE FUNCTION rh.create_rest_day_and_deduct_hours(
  p_employee_id UUID,
  p_company_id UUID,
  p_data_folga DATE,
  p_horas_descontar DECIMAL DEFAULT NULL,
  p_observacoes TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_rest_day_id UUID;
  v_horas_diarias DECIMAL(5,2);
  v_horas_a_descontar DECIMAL(5,2);
  v_work_shift_id UUID;
  v_day_of_week INTEGER;
  v_day_hours JSONB;
  v_balance DECIMAL(6,2);
BEGIN
  -- Verificar se já existe folga para esta data
  IF EXISTS (
    SELECT 1 FROM rh.rest_day_schedule 
    WHERE employee_id = p_employee_id 
      AND company_id = p_company_id 
      AND data_folga = p_data_folga
  ) THEN
    RAISE EXCEPTION 'Já existe uma folga registrada para este funcionário nesta data';
  END IF;

  -- Calcular horas a descontar
  IF p_horas_descontar IS NOT NULL THEN
    v_horas_a_descontar := p_horas_descontar;
  ELSE
    -- Buscar horas diárias do turno do funcionário
    -- Primeiro, tentar via employee_shifts
    SELECT es.turno_id, ws.horas_diarias
    INTO v_work_shift_id, v_horas_diarias
    FROM rh.employee_shifts es
    INNER JOIN rh.work_shifts ws ON ws.id = es.turno_id
    WHERE es.funcionario_id = p_employee_id
      AND es.company_id = p_company_id
      AND es.ativo = true
      AND es.data_inicio <= p_data_folga
      AND (es.data_fim IS NULL OR es.data_fim >= p_data_folga)
    ORDER BY es.data_inicio DESC
    LIMIT 1;

    -- Se não encontrou via employee_shifts, buscar via employees.work_shift_id
    IF v_work_shift_id IS NULL OR v_horas_diarias IS NULL THEN
      SELECT e.work_shift_id, ws.horas_diarias
      INTO v_work_shift_id, v_horas_diarias
      FROM rh.employees e
      LEFT JOIN rh.work_shifts ws ON ws.id = e.work_shift_id
      WHERE e.id = p_employee_id
        AND e.company_id = p_company_id;
    END IF;

    -- Se encontrou turno, verificar se tem horarios_por_dia para o dia específico
    IF v_work_shift_id IS NOT NULL THEN
      -- Calcular dia da semana (1=Segunda, 7=Domingo)
      v_day_of_week := EXTRACT(DOW FROM p_data_folga);
      IF v_day_of_week = 0 THEN
        v_day_of_week := 7; -- Domingo = 7
      END IF;

      -- Buscar horário específico do dia
      SELECT horarios_por_dia->v_day_of_week::TEXT
      INTO v_day_hours
      FROM rh.work_shifts
      WHERE id = v_work_shift_id;

      -- Se tem horário específico para o dia, usar horas_diarias do JSONB
      IF v_day_hours IS NOT NULL AND v_day_hours ? 'horas_diarias' THEN
        v_horas_diarias := COALESCE((v_day_hours->>'horas_diarias')::NUMERIC, v_horas_diarias);
      END IF;
    END IF;

    -- Se não encontrou horas_diarias, usar padrão de 8 horas
    IF v_horas_diarias IS NULL THEN
      v_horas_diarias := 8.0;
    END IF;

    v_horas_a_descontar := v_horas_diarias;
  END IF;

  -- Verificar saldo do banco de horas (se houver configuração)
  SELECT current_balance INTO v_balance
  FROM rh.bank_hours_balance
  WHERE employee_id = p_employee_id
    AND company_id = p_company_id;

  -- Se não existe saldo, criar registro inicial
  IF v_balance IS NULL THEN
    INSERT INTO rh.bank_hours_balance (
      employee_id,
      company_id,
      current_balance,
      accumulated_hours,
      compensated_hours,
      expired_hours,
      last_calculation_date
    ) VALUES (
      p_employee_id,
      p_company_id,
      0.00,
      0.00,
      0.00,
      0.00,
      p_data_folga
    );
    v_balance := 0.00;
  END IF;

  -- Criar registro da folga
  INSERT INTO rh.rest_day_schedule (
    employee_id,
    company_id,
    data_folga,
    horas_descontar,
    observacoes,
    created_by
  ) VALUES (
    p_employee_id,
    p_company_id,
    p_data_folga,
    v_horas_a_descontar,
    p_observacoes,
    p_created_by
  ) RETURNING id INTO v_rest_day_id;

  -- Descontar horas do banco de horas (criar transação de débito)
  INSERT INTO rh.bank_hours_transactions (
    employee_id,
    company_id,
    transaction_type,
    transaction_date,
    hours_amount,
    description,
    is_automatic,
    created_by
  ) VALUES (
    p_employee_id,
    p_company_id,
    'adjustment',
    p_data_folga,
    -v_horas_a_descontar, -- Negativo = débito
    'Débito por dia de folga adicional (' || p_data_folga::TEXT || ')',
    false,
    p_created_by
  );

  -- Atualizar saldo do banco de horas
  UPDATE rh.bank_hours_balance
  SET 
    current_balance = current_balance - v_horas_a_descontar,
    last_calculation_date = p_data_folga,
    updated_at = NOW()
  WHERE employee_id = p_employee_id
    AND company_id = p_company_id;

  RETURN v_rest_day_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION rh.create_rest_day_and_deduct_hours IS 
'Cria um dia de folga adicional para um funcionário e desconta automaticamente as horas do banco de horas';

-- =====================================================
-- FUNÇÃO: Remover folga e reverter débito
-- =====================================================
CREATE OR REPLACE FUNCTION rh.remove_rest_day_and_revert_deduction(
  p_rest_day_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_rest_day RECORD;
  v_transaction_id UUID;
BEGIN
  -- Buscar dados da folga
  SELECT * INTO v_rest_day
  FROM rh.rest_day_schedule
  WHERE id = p_rest_day_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Folga não encontrada';
  END IF;

  -- Buscar transação relacionada (mais recente de ajuste na mesma data)
  SELECT id INTO v_transaction_id
  FROM rh.bank_hours_transactions
  WHERE employee_id = v_rest_day.employee_id
    AND company_id = v_rest_day.company_id
    AND transaction_date = v_rest_day.data_folga
    AND transaction_type = 'adjustment'
    AND hours_amount = -v_rest_day.horas_descontar
    AND description LIKE '%dia de folga adicional%'
  ORDER BY created_at DESC
  LIMIT 1;

  -- Reverter débito (adicionar horas de volta)
  IF v_transaction_id IS NOT NULL THEN
    -- Criar transação de crédito para reverter
    INSERT INTO rh.bank_hours_transactions (
      employee_id,
      company_id,
      transaction_type,
      transaction_date,
      hours_amount,
      description,
      is_automatic,
      created_by
    ) VALUES (
      v_rest_day.employee_id,
      v_rest_day.company_id,
      'adjustment',
      v_rest_day.data_folga,
      v_rest_day.horas_descontar, -- Positivo = crédito
      'Reversão de débito por remoção de folga adicional (' || v_rest_day.data_folga::TEXT || ')',
      false,
      v_rest_day.created_by
    );

    -- Atualizar saldo do banco de horas
    UPDATE rh.bank_hours_balance
    SET 
      current_balance = current_balance + v_rest_day.horas_descontar,
      updated_at = NOW()
    WHERE employee_id = v_rest_day.employee_id
      AND company_id = v_rest_day.company_id;
  END IF;

  -- Remover registro da folga
  DELETE FROM rh.rest_day_schedule
  WHERE id = p_rest_day_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION rh.remove_rest_day_and_revert_deduction IS 
'Remove um dia de folga adicional e reverte o débito no banco de horas';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON rh.rest_day_schedule TO authenticated;
GRANT EXECUTE ON FUNCTION rh.create_rest_day_and_deduct_hours TO authenticated;
GRANT EXECUTE ON FUNCTION rh.remove_rest_day_and_revert_deduction TO authenticated;
