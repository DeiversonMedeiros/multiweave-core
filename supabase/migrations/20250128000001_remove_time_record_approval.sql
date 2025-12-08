-- =====================================================
-- REMOVER APROVAÇÃO DE REGISTRO DE PONTO
-- =====================================================
-- Data: 2025-01-28
-- Descrição: 
--   - Remove a necessidade de aprovação de registros de ponto
--   - Todos os registros são aprovados automaticamente
--   - Ajusta banco de horas para não depender de status de aprovação
--   - Remove registros de ponto da central de aprovações
-- =====================================================

-- 1. ATUALIZAR FUNÇÃO DE RECÁLCULO PARA SEMPRE APROVAR AUTOMATICAMENTE
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
BEGIN
  SELECT employee_id, company_id, data_registro, horas_faltas
  INTO v_employee_id, v_company_id, v_date, v_horas_faltas
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

  -- Sempre aprovar automaticamente (removida a lógica de pendente)
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
    status = 'aprovado',  -- Sempre aprovar automaticamente
    updated_at = v_last_event_at
  WHERE id = p_time_record_id;
END;
$$;

COMMENT ON FUNCTION rh.recalculate_time_record_hours(uuid) IS 
'Recalcula horas trabalhadas e extras de um registro de ponto. Aprova automaticamente todos os registros.';

-- 2. APROVAR AUTOMATICAMENTE TODOS OS REGISTROS PENDENTES
-- =====================================================
UPDATE rh.time_records
SET 
  status = 'aprovado',
  updated_at = COALESCE(updated_at, created_at, NOW())
WHERE status = 'pendente' OR status IS NULL;

-- 3. REMOVER REGISTROS DE PONTO DA FUNÇÃO DE APROVAÇÕES PENDENTES
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
'Retorna aprovações pendentes (correções de ponto e assinaturas ainda exigem aprovação do gestor). Registros de ponto são aprovados automaticamente.';

-- 4. AJUSTAR BANCO DE HORAS PARA NÃO DEPENDER DE STATUS DE APROVAÇÃO
-- =====================================================
-- A função calculate_and_accumulate_bank_hours já filtra por status = 'aprovado'
-- Como agora todos os registros são aprovados automaticamente, isso não é mais necessário
-- Mas vamos manter o filtro para garantir que apenas registros válidos sejam considerados
-- (caso algum registro seja rejeitado manualmente no futuro)

-- A função já está correta, apenas documentamos que todos os registros são aprovados automaticamente

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================

