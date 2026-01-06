-- =====================================================
-- FUNÇÃO: Calcular Saldo Mensal do Banco de Horas
-- =====================================================
-- Calcula o saldo do banco de horas APENAS do mês específico (isolado)
-- Não considera saldo anterior - mostra apenas o impacto do mês
-- Considera apenas horas extras 50% (não inclui 100%) e horas negativas
-- =====================================================

CREATE OR REPLACE FUNCTION rh.get_monthly_bank_hours_balance(
  p_employee_id UUID,
  p_company_id UUID,
  p_year INTEGER,
  p_month INTEGER
)
RETURNS DECIMAL(6,2)
LANGUAGE plpgsql
AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_total_horas_negativas DECIMAL(5,2) := 0;
  v_total_horas_extras_50 DECIMAL(5,2) := 0;
  v_saldo_mensal DECIMAL(6,2) := 0;
BEGIN
  -- Calcular primeiro e último dia do mês
  v_start_date := DATE_TRUNC('month', MAKE_DATE(p_year, p_month, 1));
  v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  
  -- Calcular horas negativas e extras 50% do mês
  -- IMPORTANTE: 
  -- - horas_negativas: somar todos os valores (já vêm como positivo no banco, ex: 17.91)
  -- - horas_extras_50: priorizar campo específico, usar horas_extras como fallback apenas se não houver horas_extras_100
  SELECT 
    COALESCE(SUM(COALESCE(horas_negativas, 0)), 0),
    COALESCE(SUM(
      CASE 
        WHEN COALESCE(horas_extras_50, 0) > 0 THEN horas_extras_50
        WHEN COALESCE(horas_extras_50, 0) = 0 THEN
          CASE 
            WHEN COALESCE(horas_extras, 0) > 0 AND COALESCE(horas_extras_100, 0) = 0 THEN horas_extras
            ELSE 0
          END
        ELSE 0
      END
    ), 0)
  INTO v_total_horas_negativas, v_total_horas_extras_50
  FROM rh.time_records
  WHERE employee_id = p_employee_id
    AND company_id = p_company_id
    AND data_registro BETWEEN v_start_date AND v_end_date
    AND status = 'aprovado'; -- CRÍTICO: Apenas registros aprovados entram no banco de horas
    -- NOTA: Registros com status 'pendente' NÃO devem ser considerados no cálculo.
    -- Horas extras pendentes ainda não foram aprovadas pelo gestor e não entram no banco.
  
  -- Calcular saldo mensal isolado: horas extras 50% - horas negativas
  -- Não considera saldo anterior - apenas o impacto do mês
  v_saldo_mensal := v_total_horas_extras_50 - v_total_horas_negativas;
  
  -- Log para debug (remover em produção se necessário)
  RAISE NOTICE 'get_monthly_bank_hours_balance: employee_id=%, year=%, month=%, horas_negativas=%, horas_extras_50=%, saldo_mensal=%', 
    p_employee_id, p_year, p_month, v_total_horas_negativas, v_total_horas_extras_50, v_saldo_mensal;
  
  RETURN ROUND(v_saldo_mensal, 2);
END;
$$;

COMMENT ON FUNCTION rh.get_monthly_bank_hours_balance IS 
  'Calcula o saldo do banco de horas APENAS do mês específico (isolado).
   Não considera saldo anterior - mostra apenas o impacto do mês.
   Considera apenas horas extras 50% (não inclui 100%) e horas negativas.
   Fórmula: saldo_mensal = horas_extras_50 - horas_negativas';

-- Criar função RPC pública para acesso via API
CREATE OR REPLACE FUNCTION public.get_monthly_bank_hours_balance(
  p_employee_id UUID,
  p_company_id UUID,
  p_year INTEGER,
  p_month INTEGER
)
RETURNS DECIMAL(6,2)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, rh
AS $$
BEGIN
  RETURN rh.get_monthly_bank_hours_balance(p_employee_id, p_company_id, p_year, p_month);
END;
$$;

COMMENT ON FUNCTION public.get_monthly_bank_hours_balance IS 
  'RPC: Calcula o saldo do banco de horas até o final de um mês específico.';

GRANT EXECUTE ON FUNCTION public.get_monthly_bank_hours_balance TO authenticated;

