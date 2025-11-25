-- Corrigir função aprovar_ferias que está incompleta no banco
CREATE OR REPLACE FUNCTION rh.aprovar_ferias(
  p_vacation_id UUID,
  p_aprovado_por UUID
) RETURNS BOOLEAN AS $$
DECLARE
  vacation_record RECORD;
  periodo RECORD;
  dias_gozados_calculados INTEGER := 0;
  dias_gozados_atuais INTEGER := 0;
  ano_aquisitivo INTEGER;
BEGIN
  -- Buscar dados da férias
  SELECT * INTO vacation_record
  FROM rh.vacations
  WHERE id = p_vacation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Férias não encontrada';
  END IF;
  
  IF vacation_record.status != 'pendente' THEN
    RAISE EXCEPTION 'Férias já foi processada';
  END IF;
  
  -- Determinar o ano aquisitivo baseado na data de início
  ano_aquisitivo := EXTRACT(YEAR FROM vacation_record.data_inicio);
  
  -- Calcular total de dias gozados (somando dias de férias de todos os períodos)
  SELECT COALESCE(SUM(dias_ferias), 0) INTO dias_gozados_calculados
  FROM rh.vacation_periods
  WHERE vacation_id = p_vacation_id;
  
  -- Buscar dias gozados atuais
  SELECT COALESCE(ve.dias_gozados, 0) INTO dias_gozados_atuais
  FROM rh.vacation_entitlements ve
  WHERE ve.employee_id = vacation_record.employee_id
    AND ve.ano_aquisitivo = ano_aquisitivo
    AND ve.status IN ('ativo', 'parcialmente_gozado');
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Período aquisitivo não encontrado para o funcionário e ano %', ano_aquisitivo;
  END IF;
  
  -- Verificar se há dias suficientes disponíveis
  IF dias_gozados_calculados > (30 - dias_gozados_atuais) THEN
    RAISE EXCEPTION 'Dias solicitados (%) excedem os dias disponíveis (%)', 
      dias_gozados_calculados, (30 - dias_gozados_atuais);
  END IF;
  
  -- Atualizar status da férias
  UPDATE rh.vacations
  SET status = 'aprovado',
      aprovado_por = p_aprovado_por,
      aprovado_em = NOW()
  WHERE id = p_vacation_id;
  
  -- Atualizar entitlement
  UPDATE rh.vacation_entitlements ve
  SET dias_gozados = dias_gozados_atuais + dias_gozados_calculados,
      status = CASE 
        WHEN (dias_gozados_atuais + dias_gozados_calculados) >= 30 THEN 'gozado'
        WHEN (dias_gozados_atuais + dias_gozados_calculados) > 0 THEN 'parcialmente_gozado'
        ELSE 'ativo'
      END,
      updated_at = NOW()
  WHERE ve.employee_id = vacation_record.employee_id
    AND ve.ano_aquisitivo = ano_aquisitivo
    AND ve.status IN ('ativo', 'parcialmente_gozado');
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir que a função rejeitar_ferias existe e está correta
CREATE OR REPLACE FUNCTION rh.rejeitar_ferias(
  p_vacation_id UUID,
  p_aprovado_por UUID,
  p_motivo_rejeicao TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  -- Verificar se a férias existe
  IF NOT EXISTS (SELECT 1 FROM rh.vacations WHERE id = p_vacation_id) THEN
    RAISE EXCEPTION 'Férias não encontrada';
  END IF;
  
  -- Verificar se está pendente
  IF EXISTS (SELECT 1 FROM rh.vacations WHERE id = p_vacation_id AND status != 'pendente') THEN
    RAISE EXCEPTION 'Férias já foi processada';
  END IF;
  
  -- Atualizar status da férias
  UPDATE rh.vacations
  SET status = 'rejeitado',
      aprovado_por = p_aprovado_por,
      aprovado_em = NOW(),
      observacoes = COALESCE(p_motivo_rejeicao, observacoes)
  WHERE id = p_vacation_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir permissões
GRANT ALL ON FUNCTION rh.aprovar_ferias(UUID, UUID) TO authenticated;
GRANT ALL ON FUNCTION rh.aprovar_ferias(UUID, UUID) TO service_role;
GRANT ALL ON FUNCTION rh.rejeitar_ferias(UUID, UUID, TEXT) TO authenticated;
GRANT ALL ON FUNCTION rh.rejeitar_ferias(UUID, UUID, TEXT) TO service_role;

