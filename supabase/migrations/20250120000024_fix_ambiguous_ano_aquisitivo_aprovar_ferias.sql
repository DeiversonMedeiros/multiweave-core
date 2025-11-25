-- Corrigir ambiguidade na função aprovar_ferias
-- O problema é que a comparação "ano_aquisitivo = ano_aquisitivo" é ambígua
-- porque não está claro se está comparando a coluna da tabela com a variável

CREATE OR REPLACE FUNCTION rh.aprovar_ferias(
  p_vacation_id UUID,
  p_aprovado_por UUID
) RETURNS BOOLEAN AS $$
DECLARE
  vacation_record RECORD;
  periodo RECORD;
  dias_gozados_calculados INTEGER := 0;
  dias_gozados_atuais INTEGER := 0;
  v_ano_aquisitivo INTEGER;
  v_profile_id UUID;
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
  
  -- Determinar o período aquisitivo baseado na data de início das férias
  -- O período aquisitivo é aquele cuja data_inicio_periodo <= data_inicio das férias <= data_fim_periodo
  -- ou o mais próximo que contenha a data de início
  SELECT ve.ano_aquisitivo, ve.dias_gozados
  INTO v_ano_aquisitivo, dias_gozados_atuais
  FROM rh.vacation_entitlements ve
  WHERE ve.employee_id = vacation_record.employee_id
    AND ve.data_inicio_periodo <= vacation_record.data_inicio
    AND ve.data_fim_periodo >= vacation_record.data_inicio
    AND ve.status IN ('ativo', 'parcialmente_gozado')
  ORDER BY ve.ano_aquisitivo DESC
  LIMIT 1;
  
  -- Se não encontrou período que contenha a data, buscar o período mais recente que já iniciou
  IF v_ano_aquisitivo IS NULL THEN
    SELECT ve.ano_aquisitivo, ve.dias_gozados
    INTO v_ano_aquisitivo, dias_gozados_atuais
    FROM rh.vacation_entitlements ve
    WHERE ve.employee_id = vacation_record.employee_id
      AND ve.data_inicio_periodo <= vacation_record.data_inicio
      AND ve.status IN ('ativo', 'parcialmente_gozado')
    ORDER BY ve.ano_aquisitivo DESC
    LIMIT 1;
  END IF;
  
  -- Se ainda não encontrou, usar o período mais recente disponível
  IF v_ano_aquisitivo IS NULL THEN
    SELECT ve.ano_aquisitivo, ve.dias_gozados
    INTO v_ano_aquisitivo, dias_gozados_atuais
    FROM rh.vacation_entitlements ve
    WHERE ve.employee_id = vacation_record.employee_id
      AND ve.status IN ('ativo', 'parcialmente_gozado')
    ORDER BY ve.ano_aquisitivo DESC
    LIMIT 1;
  END IF;
  
  IF v_ano_aquisitivo IS NULL THEN
    RAISE EXCEPTION 'Período aquisitivo não encontrado para o funcionário';
  END IF;
  
  -- Garantir que dias_gozados_atuais não seja NULL
  IF dias_gozados_atuais IS NULL THEN
    dias_gozados_atuais := 0;
  END IF;
  
  -- Calcular total de dias gozados (somando dias de férias de todos os períodos)
  SELECT COALESCE(SUM(dias_ferias), 0) INTO dias_gozados_calculados
  FROM rh.vacation_periods
  WHERE vacation_id = p_vacation_id;
  
  -- Verificar se há dias suficientes disponíveis
  IF dias_gozados_calculados > (30 - dias_gozados_atuais) THEN
    RAISE EXCEPTION 'Dias solicitados (%) excedem os dias disponíveis (%)', 
      dias_gozados_calculados, (30 - dias_gozados_atuais);
  END IF;
  
  -- Verificar se o profile existe para o usuário
  -- Como a tabela profiles não referencia auth.users diretamente,
  -- vamos verificar se existe algum mapeamento ou criar um profile se necessário
  SELECT id INTO v_profile_id
  FROM public.profiles
  WHERE id = p_aprovado_por
  LIMIT 1;
  
  -- Se não encontrou, tentar criar um profile básico
  IF v_profile_id IS NULL THEN
    BEGIN
      INSERT INTO public.profiles (id, nome, is_active)
      VALUES (p_aprovado_por, 'Usuário do Sistema', true)
      ON CONFLICT (id) DO NOTHING
      RETURNING id INTO v_profile_id;
    EXCEPTION WHEN OTHERS THEN
      -- Se falhar ao criar, usar o próprio UUID (assumindo que pode ser usado como ID)
      v_profile_id := p_aprovado_por;
    END;
  END IF;
  
  -- Atualizar status da férias
  UPDATE rh.vacations
  SET status = 'aprovado',
      aprovado_por = v_profile_id,
      aprovado_em = NOW()
  WHERE id = p_vacation_id;
  
  -- Atualizar entitlement (usando alias e variável renomeada para evitar ambiguidade)
  UPDATE rh.vacation_entitlements ve
  SET dias_gozados = dias_gozados_atuais + dias_gozados_calculados,
      status = CASE 
        WHEN (dias_gozados_atuais + dias_gozados_calculados) >= 30 THEN 'gozado'
        WHEN (dias_gozados_atuais + dias_gozados_calculados) > 0 THEN 'parcialmente_gozado'
        ELSE 'ativo'
      END,
      updated_at = NOW()
  WHERE ve.employee_id = vacation_record.employee_id
    AND ve.ano_aquisitivo = v_ano_aquisitivo
    AND ve.status IN ('ativo', 'parcialmente_gozado');
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir permissões
GRANT ALL ON FUNCTION rh.aprovar_ferias(UUID, UUID) TO authenticated;
GRANT ALL ON FUNCTION rh.aprovar_ferias(UUID, UUID) TO service_role;

