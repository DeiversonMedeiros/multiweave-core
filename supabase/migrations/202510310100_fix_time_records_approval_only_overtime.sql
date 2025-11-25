-- =====================================================
-- CORREÇÃO: APROVAÇÃO DE REGISTROS DE PONTO APENAS COM HORA EXTRA
-- =====================================================
-- Data: 2025-10-31
-- Descrição: 
--   - Ajusta para que apenas registros de ponto com hora extra exijam aprovação
--   - Registros sem hora extra são aprovados automaticamente
--   - Mantém aprovação obrigatória para correções de ponto e assinaturas
-- =====================================================

-- 1. ATUALIZAR FUNÇÃO DE RECÁLCULO DE HORAS PARA DEFINIR STATUS AUTOMATICAMENTE
-- =====================================================
CREATE OR REPLACE FUNCTION rh.recalculate_time_record_hours(p_time_record_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_employee_id uuid;
  v_company_id uuid;
  v_date date;
  v_entrada time;
  v_saida time;
  v_entrada_almoco time;
  v_saida_almoco time;
  v_entrada_extra1 time;
  v_saida_extra1 time;
  v_horas_trabalhadas numeric(4,2) := 0;
  v_horas_extras numeric(4,2) := 0;
  v_horas_faltas numeric(4,2);
  v_last_event_at timestamptz;
  v_new_status varchar(20);
  v_current_status varchar(20);
BEGIN
  SELECT employee_id, company_id, data_registro, horas_faltas, status
  INTO v_employee_id, v_company_id, v_date, v_horas_faltas, v_current_status
  FROM rh.time_records
  WHERE id = p_time_record_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Map each event_type to the first occurrence of the day
  SELECT (event_at AT TIME ZONE 'UTC')::time
  INTO v_entrada
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id AND event_type = 'entrada'
  ORDER BY event_at ASC
  LIMIT 1;

  SELECT (event_at AT TIME ZONE 'UTC')::time
  INTO v_saida
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id AND event_type = 'saida'
  ORDER BY event_at DESC
  LIMIT 1;

  SELECT (event_at AT TIME ZONE 'UTC')::time
  INTO v_entrada_almoco
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id AND event_type = 'entrada_almoco'
  ORDER BY event_at ASC
  LIMIT 1;

  SELECT (event_at AT TIME ZONE 'UTC')::time
  INTO v_saida_almoco
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id AND event_type = 'saida_almoco'
  ORDER BY event_at DESC
  LIMIT 1;

  SELECT (event_at AT TIME ZONE 'UTC')::time
  INTO v_entrada_extra1
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id AND event_type = 'extra_inicio'
  ORDER BY event_at ASC
  LIMIT 1;

  SELECT (event_at AT TIME ZONE 'UTC')::time
  INTO v_saida_extra1
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id AND event_type = 'extra_fim'
  ORDER BY event_at DESC
  LIMIT 1;

  -- Calculate hours worked = (saida-entrada) - (saida_almoco-entrada_almoco)
  IF v_entrada IS NOT NULL AND v_saida IS NOT NULL THEN
    v_horas_trabalhadas := round(
      EXTRACT(EPOCH FROM ((v_date + v_saida) - (v_date + v_entrada))) / 3600
      - COALESCE(EXTRACT(EPOCH FROM (
          CASE WHEN v_entrada_almoco IS NOT NULL AND v_saida_almoco IS NOT NULL
               THEN ((v_date + v_saida_almoco) - (v_date + v_entrada_almoco))
               ELSE INTERVAL '0 minute' END
        )) / 3600, 0), 2
    );
  ELSE
    v_horas_trabalhadas := 0;
  END IF;

  -- Calculate extra hours (first extra window only for now)
  IF v_entrada_extra1 IS NOT NULL AND v_saida_extra1 IS NOT NULL THEN
    v_horas_extras := round(
      EXTRACT(EPOCH FROM ((v_date + v_saida_extra1) - (v_date + v_entrada_extra1))) / 3600
    , 2);
  ELSE
    v_horas_extras := 0;
  END IF;

  -- Keep faltas as-is if previously set; if NULL, default to 0
  v_horas_faltas := COALESCE(v_horas_faltas, 0);

  -- Usar o event_at mais recente como referência para updated_at
  SELECT MAX(event_at) INTO v_last_event_at
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id;
  
  -- Se não houver eventos, usar NOW() como fallback
  IF v_last_event_at IS NULL THEN
    v_last_event_at := now();
  END IF;

  -- Definir status automaticamente baseado em hora extra
  -- Se não houver hora extra e o status atual for 'pendente', aprovar automaticamente
  -- Se já foi aprovado ou rejeitado manualmente, manter o status
  -- Se houver hora extra e estiver pendente, manter pendente para aprovação
  IF v_current_status IN ('aprovado', 'rejeitado') THEN
    v_new_status := v_current_status;
  -- Se não houver hora extra, aprovar automaticamente
  ELSIF v_horas_extras <= 0 THEN
    v_new_status := 'aprovado';
  -- Se houver hora extra, manter ou definir como pendente
  ELSE
    -- Se estiver pendente, manter pendente. Se for novo registro, definir como pendente
    v_new_status := COALESCE(v_current_status, 'pendente');
    -- Garantir que está pendente se for null ou outro status inválido
    IF v_new_status NOT IN ('pendente', 'aprovado', 'rejeitado', 'corrigido') THEN
      v_new_status := 'pendente';
    END IF;
  END IF;

  UPDATE rh.time_records
  SET 
    entrada = v_entrada,
    saida = v_saida,
    entrada_almoco = v_entrada_almoco,
    saida_almoco = v_saida_almoco,
    entrada_extra1 = v_entrada_extra1,
    saida_extra1 = v_saida_extra1,
    horas_trabalhadas = v_horas_trabalhadas,
    horas_extras = v_horas_extras,
    horas_faltas = v_horas_faltas,
    status = v_new_status,
    updated_at = v_last_event_at  -- Usar event_at do último evento ao invés de now()
  WHERE id = p_time_record_id;
END;
$$;

COMMENT ON FUNCTION rh.recalculate_time_record_hours(uuid) IS 
'Recalcula horas trabalhadas e extras de um registro de ponto. Aprova automaticamente se não houver hora extra. Exige aprovação apenas se houver hora extra.';

-- 2. ATUALIZAR STATUS DE REGISTROS EXISTENTES SEM HORA EXTRA
-- =====================================================
-- Aprovar automaticamente todos os registros que não têm hora extra e estão pendentes
UPDATE rh.time_records
SET 
  status = 'aprovado',
  updated_at = COALESCE(updated_at, created_at, NOW())
WHERE status = 'pendente'
  AND (horas_extras IS NULL OR horas_extras <= 0);

-- 3. ATUALIZAR FUNÇÃO DE APROVAÇÕES PENDENTES PARA INCLUIR REGISTROS DE PONTO COM HORA EXTRA
-- =====================================================
CREATE OR REPLACE FUNCTION get_pending_approvals_for_user(
    p_user_id UUID,
    p_company_id UUID
)
RETURNS TABLE (
    id UUID,
    tipo VARCHAR(50),
    funcionario_nome VARCHAR(255),
    funcionario_matricula VARCHAR(50),
    data_solicitacao TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20),
    descricao TEXT,
    dias INTEGER,
    horas INTEGER,
    valor DECIMAL(10,2),
    observacoes TEXT
) AS $$
BEGIN
    RETURN QUERY
    (
        -- Registros de ponto com hora extra pendentes
        SELECT 
            tr.id,
            'registro_ponto'::VARCHAR(50) as tipo,
            e.nome as funcionario_nome,
            e.matricula as funcionario_matricula,
            tr.created_at as data_solicitacao,
            tr.status,
            CONCAT('Registro de ponto com ', tr.horas_extras, 'h de hora extra em ', tr.data_registro) as descricao,
            NULL::INTEGER as dias,
            tr.horas_extras::INTEGER as horas,
            NULL::DECIMAL(10,2) as valor,
            tr.observacoes
        FROM rh.time_records tr
        JOIN rh.employees e ON e.id = tr.employee_id
        WHERE tr.company_id = p_company_id
        AND tr.status = 'pendente'
        AND tr.horas_extras > 0
        -- Verificar se o gestor é responsável pelo funcionário
        -- (assumindo que há uma tabela de relacionamento gestor-funcionário)
        -- Por enquanto, retorna todos os registros pendentes com hora extra da empresa
        -- TODO: Filtrar apenas para funcionários que o gestor gerencia
        
        UNION ALL
        
        -- Férias pendentes
        SELECT 
            v.id,
            'ferias'::VARCHAR(50) as tipo,
            e.nome as funcionario_nome,
            e.matricula as funcionario_matricula,
            v.created_at as data_solicitacao,
            v.status,
            CONCAT('Solicitação de férias de ', v.dias_solicitados, ' dias') as descricao,
            v.dias_solicitados as dias,
            NULL::INTEGER as horas,
            NULL::DECIMAL(10,2) as valor,
            v.observacoes
        FROM rh.vacations v
        JOIN rh.employees e ON e.id = v.employee_id
        WHERE v.company_id = p_company_id
        AND v.status = 'pendente'
        
        UNION ALL
        
        -- Compensações pendentes
        SELECT 
            cr.id,
            'compensacao'::VARCHAR(50) as tipo,
            e.nome as funcionario_nome,
            e.matricula as funcionario_matricula,
            cr.created_at as data_solicitacao,
            cr.status,
            CONCAT('Solicitação de compensação de ', cr.quantidade_horas, ' horas') as descricao,
            NULL::INTEGER as dias,
            cr.quantidade_horas as horas,
            NULL::DECIMAL(10,2) as valor,
            cr.observacoes
        FROM rh.compensation_requests cr
        JOIN rh.employees e ON e.id = cr.employee_id
        WHERE cr.company_id = p_company_id
        AND cr.status = 'pendente'
        
        UNION ALL
        
        -- Atestados pendentes
        SELECT 
            mc.id,
            'atestado'::VARCHAR(50) as tipo,
            e.nome as funcionario_nome,
            e.matricula as funcionario_matricula,
            mc.created_at as data_solicitacao,
            mc.status,
            CONCAT('Atestado médico de ', mc.dias_afastamento, ' dias') as descricao,
            mc.dias_afastamento as dias,
            NULL::INTEGER as horas,
            NULL::DECIMAL(10,2) as valor,
            mc.observacoes
        FROM rh.medical_certificates mc
        JOIN rh.employees e ON e.id = mc.employee_id
        WHERE mc.company_id = p_company_id
        AND mc.status = 'pendente'
        
        UNION ALL
        
        -- Reembolsos pendentes
        SELECT 
            rr.id,
            'reembolso'::VARCHAR(50) as tipo,
            e.nome as funcionario_nome,
            e.matricula as funcionario_matricula,
            rr.created_at as data_solicitacao,
            rr.status,
            CONCAT('Solicitação de reembolso de R$ ', rr.valor_solicitado) as descricao,
            NULL::INTEGER as dias,
            NULL::INTEGER as horas,
            rr.valor_solicitado as valor,
            rr.observacoes
        FROM rh.reimbursement_requests rr
        JOIN rh.employees e ON e.id = rr.employee_id
        WHERE rr.company_id = p_company_id
        AND rr.status = 'pendente'
        
        UNION ALL
        
        -- Equipamentos pendentes
        SELECT 
            era.id,
            'equipamento'::VARCHAR(50) as tipo,
            e.nome as funcionario_nome,
            e.matricula as funcionario_matricula,
            era.created_at as data_solicitacao,
            era.status,
            CONCAT('Solicitação de equipamento: ', era.tipo_equipamento) as descricao,
            NULL::INTEGER as dias,
            NULL::INTEGER as horas,
            NULL::DECIMAL(10,2) as valor,
            era.observacoes
        FROM rh.equipment_rental_approvals era
        JOIN rh.employees e ON e.id = era.employee_id
        WHERE era.company_id = p_company_id
        AND era.status = 'pendente'
        
        UNION ALL
        
        -- Correções de ponto pendentes (sempre exigem aprovação)
        SELECT 
            ac.id,
            'correcao_ponto'::VARCHAR(50) as tipo,
            e.nome as funcionario_nome,
            e.matricula as funcionario_matricula,
            ac.created_at as data_solicitacao,
            ac.status,
            CONCAT('Correção de ponto para ', ac.data_original) as descricao,
            NULL::INTEGER as dias,
            NULL::INTEGER as horas,
            NULL::DECIMAL(10,2) as valor,
            ac.observacoes
        FROM rh.attendance_corrections ac
        JOIN rh.employees e ON e.id = ac.employee_id
        WHERE ac.company_id = p_company_id
        AND ac.status = 'pendente'
        
        UNION ALL
        
        -- Assinaturas de ponto pendentes de aprovação do gestor (após o funcionário assinar)
        SELECT 
            trs.id,
            'assinatura_ponto'::VARCHAR(50) as tipo,
            e.nome as funcionario_nome,
            e.matricula as funcionario_matricula,
            trs.signature_timestamp as data_solicitacao,
            trs.status,
            CONCAT('Assinatura de ponto de ', trs.month_year, ' aguardando aprovação') as descricao,
            NULL::INTEGER as dias,
            NULL::INTEGER as horas,
            NULL::DECIMAL(10,2) as valor,
            NULL::TEXT as observacoes
        FROM rh.time_record_signatures trs
        JOIN rh.employees e ON e.id = trs.employee_id
        WHERE trs.company_id = p_company_id
        AND trs.status = 'signed'  -- Assinado pelo funcionário
        AND trs.manager_approval_required = true
        AND trs.manager_approved_by IS NULL  -- Ainda não aprovado pelo gestor
    )
    ORDER BY data_solicitacao DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_pending_approvals_for_user(UUID, UUID) IS 
'Retorna aprovações pendentes incluindo registros de ponto com hora extra, correções de ponto e assinaturas que precisam de aprovação do gestor';

-- 4. ADICIONAR FUNÇÕES DE APROVAÇÃO/REJEIÇÃO PARA REGISTROS DE PONTO
-- =====================================================
CREATE OR REPLACE FUNCTION approve_time_record(
    p_time_record_id UUID,
    p_approved_by UUID,
    p_observacoes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE rh.time_records
    SET 
        status = 'aprovado',
        aprovado_por = p_approved_by,
        aprovado_em = NOW(),
        observacoes = COALESCE(p_observacoes, observacoes),
        updated_at = NOW()
    WHERE id = p_time_record_id
    AND status = 'pendente'
    AND horas_extras > 0;  -- Apenas aprovar se houver hora extra
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION reject_time_record(
    p_time_record_id UUID,
    p_rejected_by UUID,
    p_observacoes TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE rh.time_records
    SET 
        status = 'rejeitado',
        aprovado_por = p_rejected_by,
        aprovado_em = NOW(),
        observacoes = COALESCE(p_observacoes, observacoes),
        updated_at = NOW()
    WHERE id = p_time_record_id
    AND status = 'pendente'
    AND horas_extras > 0;  -- Apenas rejeitar se houver hora extra
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION approve_time_record(UUID, UUID, TEXT) IS 
'Aprova um registro de ponto que possui hora extra';
COMMENT ON FUNCTION reject_time_record(UUID, UUID, TEXT) IS 
'Rejeita um registro de ponto que possui hora extra';

-- 5. ADICIONAR FUNÇÃO DE APROVAÇÃO DE ASSINATURA DE PONTO
-- =====================================================
CREATE OR REPLACE FUNCTION approve_time_record_signature(
    p_signature_id UUID,
    p_approved_by UUID,
    p_observacoes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE rh.time_record_signatures
    SET 
        status = 'approved',
        manager_approved_by = p_approved_by,
        manager_approved_at = NOW(),
        updated_at = NOW()
    WHERE id = p_signature_id
    AND status = 'signed'
    AND manager_approval_required = true
    AND manager_approved_by IS NULL;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION reject_time_record_signature(
    p_signature_id UUID,
    p_rejected_by UUID,
    p_rejection_reason TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE rh.time_record_signatures
    SET 
        status = 'rejected',
        manager_approved_by = p_rejected_by,
        manager_approved_at = NOW(),
        rejection_reason = p_rejection_reason,
        updated_at = NOW()
    WHERE id = p_signature_id
    AND status = 'signed'
    AND manager_approval_required = true;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION approve_time_record_signature(UUID, UUID, TEXT) IS 
'Aprova uma assinatura de ponto após o funcionário ter assinado';
COMMENT ON FUNCTION reject_time_record_signature(UUID, UUID, TEXT) IS 
'Rejeita uma assinatura de ponto com justificativa';

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================

