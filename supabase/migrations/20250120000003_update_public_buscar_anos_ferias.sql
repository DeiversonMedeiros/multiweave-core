-- =====================================================
-- MOVER FUNÇÃO COMPLETA PARA SCHEMA PUBLIC
-- =====================================================
-- Data: 2025-01-20
-- Descrição: Move a função buscar_anos_ferias_disponiveis completa para o schema public
--            e remove a função do schema rh para simplificar a arquitetura

-- Remover função antiga do schema public se existir
DROP FUNCTION IF EXISTS public.buscar_anos_ferias_disponiveis(UUID);

-- Criar função completa no schema public (mesma lógica que estava no rh)
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
  -- 2. Têm dias restantes disponíveis OU são períodos futuros (status = 'pendente')
  -- 3. Incluir períodos futuros para permitir visualização e programação
  -- Usar alias de tabela para evitar ambiguidade com variáveis de outras funções
  RETURN QUERY
  SELECT 
    ve.ano_aquisitivo as ano,
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
    -- Incluir períodos que têm dias restantes OU são períodos futuros (pendentes)
    AND (ve.dias_restantes > 0 OR ve.status = 'pendente')
  ORDER BY ve.ano_aquisitivo DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário
COMMENT ON FUNCTION public.buscar_anos_ferias_disponiveis IS 'Busca anos de férias disponíveis para um funcionário, incluindo períodos futuros (pendentes) para visualização e programação. Cria automaticamente períodos aquisitivos baseados na data de admissão.';

