-- =====================================================
-- CORREÇÃO: Renomear variável ano_aquisitivo para evitar ambiguidade
-- =====================================================
-- Data: 2025-01-20
-- Descrição: Renomeia variável ano_aquisitivo para v_ano_aquisitivo na função
--            calcular_e_criar_periodos_aquisitivos para evitar ambiguidade
--            quando chamada de dentro de buscar_anos_ferias_disponiveis

-- Atualizar função calcular_e_criar_periodos_aquisitivos
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
  v_ano_aquisitivo INTEGER;  -- Renomeado para evitar ambiguidade com coluna da tabela
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
        -- Período ainda em andamento ou futuro (menos de 12 meses ou ainda não começou)
        -- Criar período com status 'pendente' para permitir visualização e programação
        status_periodo := 'pendente';
      END IF;
      
      -- Criar período aquisitivo (incluindo períodos futuros para visualização)
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

-- Comentário
COMMENT ON FUNCTION rh.calcular_e_criar_periodos_aquisitivos IS 'Calcula e cria automaticamente períodos aquisitivos baseados na data de admissão do funcionário, incluindo períodos futuros para visualização. Variável v_ano_aquisitivo renomeada para evitar ambiguidade.';

