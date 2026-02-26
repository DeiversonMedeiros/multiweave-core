-- =====================================================
-- Corrige aprovado_por em rh.vacations: de profiles(id) para users(id)
-- =====================================================
-- O frontend envia user.id (auth / public.users). A coluna referenciava
-- public.profiles(id), causando violação de FK para usuários como nina.gomes
-- que não têm perfil em profiles. Alinha com rh.medical_certificates.
-- =====================================================

-- 1) Remover a FK antiga que referencia profiles
ALTER TABLE rh.vacations
DROP CONSTRAINT IF EXISTS vacations_aprovado_por_fkey;

-- 2) Migrar dados existentes: converter profile_id para user_id
--    (quando aprovado_por é profile_id, buscar user_id via user_companies)
UPDATE rh.vacations v
SET aprovado_por = (
    SELECT uc.user_id
    FROM public.user_companies uc
    WHERE uc.profile_id = v.aprovado_por
      AND uc.ativo = true
    LIMIT 1
)
WHERE v.aprovado_por IS NOT NULL
  AND EXISTS (
      SELECT 1
      FROM public.user_companies uc
      WHERE uc.profile_id = v.aprovado_por
  )
  AND NOT EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = v.aprovado_por
  );

-- Valores que continuam como profile_id (sem correspondência em users) -> NULL
UPDATE rh.vacations
SET aprovado_por = NULL
WHERE aprovado_por IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = aprovado_por
  );

-- 3) Nova FK referenciando public.users(id)
ALTER TABLE rh.vacations
ADD CONSTRAINT vacations_aprovado_por_fkey
FOREIGN KEY (aprovado_por)
REFERENCES public.users(id)
ON DELETE SET NULL;

COMMENT ON COLUMN rh.vacations.aprovado_por IS 'ID do usuário que aprovou/rejeitou (public.users.id)';

-- 4) Atualizar rh.aprovar_ferias: usar p_aprovado_por diretamente (sem lookup em profiles)
CREATE OR REPLACE FUNCTION rh.aprovar_ferias(p_vacation_id uuid, p_aprovado_por uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, rh
AS $$
DECLARE
  vacation_record RECORD;
  dias_gozados_calculados INTEGER := 0;
  dias_gozados_atuais INTEGER := 0;
  v_ano_aquisitivo INTEGER;
BEGIN
  SELECT * INTO vacation_record
  FROM rh.vacations
  WHERE id = p_vacation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Férias não encontrada';
  END IF;

  IF vacation_record.status != 'pendente' THEN
    RAISE EXCEPTION 'Férias já foi processada';
  END IF;

  -- Período aquisitivo
  SELECT ve.ano_aquisitivo, ve.dias_gozados
  INTO v_ano_aquisitivo, dias_gozados_atuais
  FROM rh.vacation_entitlements ve
  WHERE ve.employee_id = vacation_record.employee_id
    AND ve.data_inicio_periodo <= vacation_record.data_inicio
    AND ve.data_fim_periodo >= vacation_record.data_inicio
    AND ve.status IN ('ativo', 'parcialmente_gozado')
  ORDER BY ve.ano_aquisitivo DESC
  LIMIT 1;

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

  IF dias_gozados_atuais IS NULL THEN
    dias_gozados_atuais := 0;
  END IF;

  SELECT COALESCE(SUM(dias_ferias), 0) INTO dias_gozados_calculados
  FROM rh.vacation_periods
  WHERE vacation_id = p_vacation_id;

  IF dias_gozados_calculados > (30 - dias_gozados_atuais) THEN
    RAISE EXCEPTION 'Dias solicitados (%) excedem os dias disponíveis (%)',
      dias_gozados_calculados, (30 - dias_gozados_atuais);
  END IF;

  -- Atualizar férias usando user id diretamente (public.users.id)
  UPDATE rh.vacations
  SET status = 'aprovado',
      aprovado_por = p_aprovado_por,
      aprovado_em = NOW()
  WHERE id = p_vacation_id;

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
$$;

COMMENT ON FUNCTION rh.aprovar_ferias(uuid, uuid) IS
'Aprova férias e atualiza dias gozados. aprovado_por é public.users.id (mesmo id do auth quando usuário tem registro em users).';
