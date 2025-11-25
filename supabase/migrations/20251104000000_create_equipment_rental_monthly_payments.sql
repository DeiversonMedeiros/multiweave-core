-- =====================================================
-- SISTEMA DE PAGAMENTOS MENSAIS DE ALUGUEL DE EQUIPAMENTOS E VEÍCULOS
-- =====================================================
-- Data: 2025-11-04
-- Descrição: Tabela e funções para processar pagamentos mensais de aluguéis

-- Tabela para pagamentos mensais de aluguéis
CREATE TABLE IF NOT EXISTS rh.equipment_rental_monthly_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_rental_approval_id UUID NOT NULL REFERENCES rh.equipment_rental_approvals(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Período de referência
  month_reference INTEGER NOT NULL CHECK (month_reference BETWEEN 1 AND 12),
  year_reference INTEGER NOT NULL,
  
  -- Valores
  valor_base DECIMAL(10,2) NOT NULL, -- Valor mensal base do aluguel
  dias_trabalhados INTEGER DEFAULT 0, -- Dias trabalhados no mês
  dias_ausencia INTEGER DEFAULT 0, -- Dias de ausência (férias, licença médica)
  desconto_ausencia DECIMAL(10,2) DEFAULT 0, -- Valor descontado por ausências
  valor_calculado DECIMAL(10,2) NOT NULL, -- Valor após descontos (valor_base - desconto_ausencia)
  valor_aprovado DECIMAL(10,2), -- Valor aprovado pelo gestor (pode ser diferente do calculado)
  
  -- Status do pagamento
  status VARCHAR(20) DEFAULT 'pendente_aprovacao' CHECK (status IN (
    'pendente_aprovacao', 
    'aprovado', 
    'rejeitado',
    'enviado_flash',
    'boleto_gerado',
    'enviado_contas_pagar',
    'pago',
    'cancelado'
  )),
  
  -- Aprovação
  aprovado_por UUID REFERENCES profiles(id),
  aprovado_em TIMESTAMP WITH TIME ZONE,
  observacoes_aprovacao TEXT,
  
  -- Integração Flash
  flash_payment_id VARCHAR(255), -- ID do pagamento no Flash
  flash_invoice_id VARCHAR(255), -- ID do boleto no Flash
  flash_account_number VARCHAR(255), -- Número da conta Flash do funcionário
  
  -- Integração Contas a Pagar
  accounts_payable_id UUID REFERENCES financeiro.contas_pagar(id),
  
  -- Processamento
  processado_por UUID REFERENCES profiles(id),
  processado_em TIMESTAMP WITH TIME ZONE,
  enviado_flash_em TIMESTAMP WITH TIME ZONE,
  enviado_contas_pagar_em TIMESTAMP WITH TIME ZONE,
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(equipment_rental_approval_id, month_reference, year_reference)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_equipment_rental_monthly_payments_company_id 
  ON rh.equipment_rental_monthly_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_equipment_rental_monthly_payments_employee_id 
  ON rh.equipment_rental_monthly_payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_equipment_rental_monthly_payments_approval_id 
  ON rh.equipment_rental_monthly_payments(equipment_rental_approval_id);
CREATE INDEX IF NOT EXISTS idx_equipment_rental_monthly_payments_status 
  ON rh.equipment_rental_monthly_payments(status);
CREATE INDEX IF NOT EXISTS idx_equipment_rental_monthly_payments_reference 
  ON rh.equipment_rental_monthly_payments(month_reference, year_reference);
CREATE INDEX IF NOT EXISTS idx_equipment_rental_monthly_payments_created_at 
  ON rh.equipment_rental_monthly_payments(created_at DESC);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_equipment_rental_monthly_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_equipment_rental_monthly_payments_updated_at
    BEFORE UPDATE ON rh.equipment_rental_monthly_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_equipment_rental_monthly_payments_updated_at();

-- =====================================================
-- RLS Policies
-- =====================================================

ALTER TABLE rh.equipment_rental_monthly_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view equipment_rental_monthly_payments from their company" 
  ON rh.equipment_rental_monthly_payments
  FOR SELECT USING (
    public.user_has_company_access(auth.uid(), company_id)
  );

CREATE POLICY "Users can insert equipment_rental_monthly_payments in their company" 
  ON rh.equipment_rental_monthly_payments
  FOR INSERT WITH CHECK (
    public.user_has_company_access(auth.uid(), company_id)
  );

CREATE POLICY "Users can update equipment_rental_monthly_payments from their company" 
  ON rh.equipment_rental_monthly_payments
  FOR UPDATE USING (
    public.user_has_company_access(auth.uid(), company_id)
  );

CREATE POLICY "Users can delete equipment_rental_monthly_payments from their company" 
  ON rh.equipment_rental_monthly_payments
  FOR DELETE USING (
    public.user_has_company_access(auth.uid(), company_id)
  );

-- =====================================================
-- FUNÇÕES RPC
-- =====================================================

-- Função para calcular valor mensal de aluguel com descontos
CREATE OR REPLACE FUNCTION calculate_equipment_rental_monthly_value(
  p_equipment_rental_approval_id UUID,
  p_month_reference INTEGER,
  p_year_reference INTEGER
) RETURNS TABLE (
  valor_base DECIMAL(10,2),
  dias_trabalhados INTEGER,
  dias_ausencia INTEGER,
  desconto_ausencia DECIMAL(10,2),
  valor_calculado DECIMAL(10,2)
) AS $$
DECLARE
  v_equipment_rental RECORD;
  v_start_date DATE;
  v_end_date DATE;
  v_working_days INTEGER;
  v_total_days INTEGER;
  v_days_absence INTEGER;
  v_valor_base DECIMAL(10,2);
  v_desconto DECIMAL(10,2);
  v_valor_calculado DECIMAL(10,2);
BEGIN
  -- Buscar dados do aluguel
  SELECT 
    era.employee_id,
    era.company_id,
    era.valor_mensal,
    era.data_inicio,
    era.data_fim
  INTO v_equipment_rental
  FROM rh.equipment_rental_approvals era
  WHERE era.id = p_equipment_rental_approval_id
    AND era.status IN ('aprovado', 'ativo');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aluguel de equipamento não encontrado ou não aprovado';
  END IF;

  -- Calcular período do mês
  v_start_date := DATE_TRUNC('month', MAKE_DATE(p_year_reference, p_month_reference, 1));
  v_end_date := (DATE_TRUNC('month', MAKE_DATE(p_year_reference, p_month_reference, 1)) + INTERVAL '1 month - 1 day')::DATE;

  -- Ajustar se aluguel começou depois do início do mês
  IF v_equipment_rental.data_inicio > v_start_date THEN
    v_start_date := v_equipment_rental.data_inicio;
  END IF;

  -- Ajustar se aluguel termina antes do fim do mês
  IF v_equipment_rental.data_fim IS NOT NULL AND v_equipment_rental.data_fim < v_end_date THEN
    v_end_date := v_equipment_rental.data_fim;
  END IF;

  -- Calcular dias trabalhados usando função existente
  SELECT calculate_working_days_for_benefits(
    v_equipment_rental.company_id,
    v_equipment_rental.employee_id,
    v_start_date,
    v_end_date
  ) INTO v_working_days;

  -- Calcular total de dias no período
  v_total_days := v_end_date - v_start_date + 1;

  -- Calcular dias de ausência
  v_days_absence := v_total_days - v_working_days;

  -- Valor base (valor mensal)
  v_valor_base := v_equipment_rental.valor_mensal;

  -- Calcular desconto proporcional por dias de ausência
  IF v_total_days > 0 THEN
    v_desconto := (v_valor_base / v_total_days) * v_days_absence;
  ELSE
    v_desconto := 0;
  END IF;

  -- Valor calculado (base - desconto)
  v_valor_calculado := v_valor_base - v_desconto;

  -- Retornar resultado
  RETURN QUERY SELECT 
    v_valor_base,
    v_working_days,
    v_days_absence,
    ROUND(v_desconto, 2),
    ROUND(v_valor_calculado, 2);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para processar pagamentos mensais de aluguéis
CREATE OR REPLACE FUNCTION process_monthly_equipment_rentals(
  p_company_id UUID,
  p_month_reference INTEGER,
  p_year_reference INTEGER,
  p_processed_by UUID
) RETURNS INTEGER AS $$
DECLARE
  v_equipment_rental RECORD;
  v_calculation RECORD;
  v_payment_id UUID;
  v_count INTEGER := 0;
BEGIN
  -- Iterar sobre aluguéis ativos da empresa
  FOR v_equipment_rental IN
    SELECT era.id, era.employee_id, era.company_id, era.valor_mensal
    FROM rh.equipment_rental_approvals era
    WHERE era.company_id = p_company_id
      AND era.status IN ('aprovado', 'ativo')
      AND (
        era.data_fim IS NULL 
        OR (era.data_fim >= MAKE_DATE(p_year_reference, p_month_reference, 1))
      )
      AND era.data_inicio <= (DATE_TRUNC('month', MAKE_DATE(p_year_reference, p_month_reference, 1)) + INTERVAL '1 month - 1 day')::DATE
  LOOP
    -- Verificar se já existe pagamento para este período
    SELECT id INTO v_payment_id
    FROM rh.equipment_rental_monthly_payments
    WHERE equipment_rental_approval_id = v_equipment_rental.id
      AND month_reference = p_month_reference
      AND year_reference = p_year_reference;

    -- Se já existe, pular
    IF v_payment_id IS NOT NULL THEN
      CONTINUE;
    END IF;

    -- Calcular valor mensal
    SELECT * INTO v_calculation
    FROM calculate_equipment_rental_monthly_value(
      v_equipment_rental.id,
      p_month_reference,
      p_year_reference
    );

    -- Criar registro de pagamento
    INSERT INTO rh.equipment_rental_monthly_payments (
      equipment_rental_approval_id,
      employee_id,
      company_id,
      month_reference,
      year_reference,
      valor_base,
      dias_trabalhados,
      dias_ausencia,
      desconto_ausencia,
      valor_calculado,
      valor_aprovado,
      status,
      processado_por,
      processado_em
    ) VALUES (
      v_equipment_rental.id,
      v_equipment_rental.employee_id,
      v_equipment_rental.company_id,
      p_month_reference,
      p_year_reference,
      v_calculation.valor_base,
      v_calculation.dias_trabalhados,
      v_calculation.dias_ausencia,
      v_calculation.desconto_ausencia,
      v_calculation.valor_calculado,
      v_calculation.valor_calculado, -- Inicialmente, valor aprovado = valor calculado
      'pendente_aprovacao',
      p_processed_by,
      NOW()
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para aprovar pagamento mensal
CREATE OR REPLACE FUNCTION approve_monthly_equipment_rental_payment(
  p_payment_id UUID,
  p_approved_by UUID,
  p_valor_aprovado DECIMAL(10,2) DEFAULT NULL,
  p_observacoes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE rh.equipment_rental_monthly_payments
  SET 
    status = 'aprovado',
    aprovado_por = p_approved_by,
    aprovado_em = NOW(),
    valor_aprovado = COALESCE(p_valor_aprovado, valor_calculado),
    observacoes_aprovacao = COALESCE(p_observacoes, observacoes_aprovacao),
    updated_at = NOW()
  WHERE id = p_payment_id
    AND status = 'pendente_aprovacao';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para rejeitar pagamento mensal
CREATE OR REPLACE FUNCTION reject_monthly_equipment_rental_payment(
  p_payment_id UUID,
  p_rejected_by UUID,
  p_observacoes TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  IF p_observacoes IS NULL OR TRIM(p_observacoes) = '' THEN
    RAISE EXCEPTION 'Observações são obrigatórias para rejeitar um pagamento';
  END IF;

  UPDATE rh.equipment_rental_monthly_payments
  SET 
    status = 'rejeitado',
    aprovado_por = p_rejected_by,
    aprovado_em = NOW(),
    observacoes_aprovacao = p_observacoes,
    updated_at = NOW()
  WHERE id = p_payment_id
    AND status = 'pendente_aprovacao';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários
COMMENT ON TABLE rh.equipment_rental_monthly_payments IS 'Pagamentos mensais de aluguel de equipamentos e veículos';
COMMENT ON FUNCTION calculate_equipment_rental_monthly_value IS 'Calcula valor mensal de aluguel considerando descontos por férias e licença médica';
COMMENT ON FUNCTION process_monthly_equipment_rentals IS 'Processa e gera pagamentos mensais para todos os aluguéis ativos de uma empresa';
COMMENT ON FUNCTION approve_monthly_equipment_rental_payment IS 'Aprova um pagamento mensal de aluguel';
COMMENT ON FUNCTION reject_monthly_equipment_rental_payment IS 'Rejeita um pagamento mensal de aluguel';

