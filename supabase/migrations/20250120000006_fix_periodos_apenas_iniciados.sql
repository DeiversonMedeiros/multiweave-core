-- =====================================================
-- CORREÇÃO: Mostrar apenas períodos aquisitivos que já começaram
-- =====================================================
-- Data: 2025-01-20
-- Descrição: Ajusta a lógica para mostrar apenas períodos que já iniciaram
--            Não mostrar períodos futuros que ainda não começaram

-- Atualizar função calcular_e_criar_periodos_aquisitivos
-- Garantir que só cria períodos que já começaram
CREATE OR REPLACE FUNCTION rh.calcular_e_criar_periodos_aquisitivos(
  p_employee_id UUID,
  p_company_id UUID
) RETURNS INTEGER AS $$
DECLARE
  employee_record RECORD;
  data_admissao DATE;
  data_atual DATE := CURRENT_DATE;
  periodo_count INTEGER := 0;
  periodo_numero INTEGER := 0;
  data_inicio_periodo DATE;
  data_fim_periodo DATE;
  data_vencimento DATE;
  v_ano_aquisitivo INTEGER;
  status_periodo VARCHAR(20);
  dias_disponiveis INTEGER := 30;
BEGIN
  -- Buscar dados do funcionário
  SELECT e.id, e.data_admissao, e.company_id
  INTO employee_record
  FROM rh.employees e
  WHERE e.id = p_employee_id AND e.company_id = p_company_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Funcionário não encontrado';
  END IF;
  
  IF employee_record.data_admissao IS NULL THEN
    RAISE EXCEPTION 'Funcionário não possui data de admissão cadastrada';
  END IF;
  
  data_admissao := employee_record.data_admissao;
  
  -- Calcular períodos aquisitivos baseados na data de admissão
  -- Cada período aquisitivo tem 12 meses
  -- O primeiro período começa na data de admissão
  -- Períodos subsequentes começam 12 meses após o anterior
  
  data_inicio_periodo := data_admissao;
  
  -- Criar períodos apenas até o período que já começou
  -- IMPORTANTE: Só criar períodos que já iniciaram (data_inicio_periodo <= CURRENT_DATE)
  -- Não criar períodos futuros que ainda não começaram
  WHILE data_inicio_periodo <= data_atual
  LOOP
    periodo_numero := periodo_numero + 1;
    
    -- Calcular fim do período (12 meses após o início)
    data_fim_periodo := data_inicio_periodo + INTERVAL '12 months' - INTERVAL '1 day';
    
    -- Data de vencimento: 12 meses após o fim do período aquisitivo
    data_vencimento := data_fim_periodo + INTERVAL '12 months';
    
    -- Ano aquisitivo: ano do início do período
    v_ano_aquisitivo := EXTRACT(YEAR FROM data_inicio_periodo);
    
    -- Verificar se o período já existe
    IF NOT EXISTS (
      SELECT 1 FROM rh.vacation_entitlements
      WHERE employee_id = p_employee_id
        AND ano_aquisitivo = v_ano_aquisitivo
    ) THEN
      -- Determinar status do período
      IF data_vencimento < data_atual THEN
        -- Período vencido
        status_periodo := 'vencido';
      ELSIF data_fim_periodo < data_atual THEN
        -- Período completado (12 meses já passaram), mas ainda não vencido
        status_periodo := 'ativo';
      ELSE
        -- Período ainda em andamento (menos de 12 meses, mas já começou)
        status_periodo := 'pendente';
      END IF;
      
      -- Criar período aquisitivo
      INSERT INTO rh.vacation_entitlements (
        employee_id,
        company_id,
        ano_aquisitivo,
        data_inicio_periodo,
        data_fim_periodo,
        data_vencimento,
        dias_disponiveis,
        dias_gozados,
        status,
        created_at,
        updated_at
      ) VALUES (
        p_employee_id,
        p_company_id,
        v_ano_aquisitivo,
        data_inicio_periodo,
        data_fim_periodo,
        data_vencimento,
        dias_disponiveis,
        0,
        status_periodo,
        NOW(),
        NOW()
      );
      
      periodo_count := periodo_count + 1;
    END IF;
    
    -- Próximo período começa 12 meses após o início do período atual
    data_inicio_periodo := data_inicio_periodo + INTERVAL '12 months';
  END LOOP;
  
  RETURN periodo_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualizar função buscar_anos_ferias_disponiveis
-- Garantir que só retorna períodos que já começaram
DROP FUNCTION IF EXISTS public.buscar_anos_ferias_disponiveis(UUID);

CREATE OR REPLACE FUNCTION public.buscar_anos_ferias_disponiveis(
  employee_id_param UUID
) RETURNS TABLE (
  ano INTEGER,
  dias_disponiveis INTEGER,
  dias_gozados INTEGER,
  dias_restantes INTEGER,
  status TEXT,
  data_vencimento DATE,
  data_fim_periodo DATE
) AS $$
DECLARE
  employee_record RECORD;
  company_id_param UUID;
BEGIN
  -- Buscar dados do funcionário para obter company_id e data de admissão
  SELECT e.id, e.company_id, e.data_admissao
  INTO employee_record
  FROM rh.employees e
  WHERE e.id = employee_id_param;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  company_id_param := employee_record.company_id;
  
  -- Se o funcionário tem data de admissão, calcular e criar períodos aquisitivos automaticamente
  IF employee_record.data_admissao IS NOT NULL THEN
    PERFORM rh.calcular_e_criar_periodos_aquisitivos(employee_id_param, company_id_param);
  END IF;
  
  -- Retornar períodos que:
  -- 1. Ainda não foram totalmente gozados (status != 'gozado')
  -- 2. Já começaram (data_inicio_periodo <= CURRENT_DATE)
  -- 3. Têm dias restantes disponíveis
  -- IMPORTANTE: Usar CTE (Common Table Expression) para isolar completamente o SELECT
  RETURN QUERY
  WITH periodos_disponiveis AS (
    SELECT 
      ve.ano_aquisitivo,
      ve.dias_disponiveis,
      ve.dias_gozados,
      ve.dias_restantes,
      ve.status,
      ve.data_vencimento,
      ve.data_fim_periodo
    FROM rh.vacation_entitlements ve
    WHERE ve.employee_id = employee_id_param
      -- Excluir períodos totalmente gozados
      AND ve.status != 'gozado'
      -- Apenas períodos que já começaram (data_inicio_periodo <= CURRENT_DATE)
      AND ve.data_inicio_periodo <= CURRENT_DATE
      -- Apenas períodos que têm dias restantes disponíveis
      AND ve.dias_restantes > 0
  )
  SELECT 
    pd.ano_aquisitivo::INTEGER as ano,
    pd.dias_disponiveis::INTEGER,
    pd.dias_gozados::INTEGER,
    pd.dias_restantes::INTEGER,
    pd.status::TEXT,
    pd.data_vencimento::DATE,
    pd.data_fim_periodo::DATE
  FROM periodos_disponiveis pd
  ORDER BY pd.ano_aquisitivo DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários
COMMENT ON FUNCTION rh.calcular_e_criar_periodos_aquisitivos IS 'Calcula e cria automaticamente períodos aquisitivos baseados na data de admissão. Cria apenas períodos que já começaram (data_inicio_periodo <= CURRENT_DATE).';
COMMENT ON FUNCTION public.buscar_anos_ferias_disponiveis IS 'Busca anos de férias disponíveis para um funcionário. Retorna apenas períodos que já começaram e têm dias restantes disponíveis.';

