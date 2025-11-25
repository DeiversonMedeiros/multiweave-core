-- =====================================================
-- ADICIONAR CAMPOS DE ALMOÇO E HORA EXTRA À TABELA DE CORREÇÕES
-- =====================================================
-- Data: 2025-01-20
-- Descrição: Adiciona campos para correção de almoço e hora extra

-- Adicionar colunas para almoço
ALTER TABLE rh.attendance_corrections
ADD COLUMN IF NOT EXISTS entrada_almoco_original TIME,
ADD COLUMN IF NOT EXISTS saida_almoco_original TIME,
ADD COLUMN IF NOT EXISTS entrada_almoco_corrigida TIME,
ADD COLUMN IF NOT EXISTS saida_almoco_corrigida TIME;

-- Adicionar colunas para hora extra
ALTER TABLE rh.attendance_corrections
ADD COLUMN IF NOT EXISTS entrada_extra1_original TIME,
ADD COLUMN IF NOT EXISTS saida_extra1_original TIME,
ADD COLUMN IF NOT EXISTS entrada_extra1_corrigida TIME,
ADD COLUMN IF NOT EXISTS saida_extra1_corrigida TIME;

-- Comentários
COMMENT ON COLUMN rh.attendance_corrections.entrada_almoco_original IS 'Horário original de entrada do almoço';
COMMENT ON COLUMN rh.attendance_corrections.saida_almoco_original IS 'Horário original de saída do almoço';
COMMENT ON COLUMN rh.attendance_corrections.entrada_almoco_corrigida IS 'Horário corrigido de entrada do almoço';
COMMENT ON COLUMN rh.attendance_corrections.saida_almoco_corrigida IS 'Horário corrigido de saída do almoço';
COMMENT ON COLUMN rh.attendance_corrections.entrada_extra1_original IS 'Horário original de entrada da hora extra';
COMMENT ON COLUMN rh.attendance_corrections.saida_extra1_original IS 'Horário original de saída da hora extra';
COMMENT ON COLUMN rh.attendance_corrections.entrada_extra1_corrigida IS 'Horário corrigido de entrada da hora extra';
COMMENT ON COLUMN rh.attendance_corrections.saida_extra1_corrigida IS 'Horário corrigido de saída da hora extra';

-- Atualizar função get_pending_attendance_corrections para incluir novos campos e filtrar por gestor
DROP FUNCTION IF EXISTS public.get_pending_attendance_corrections(UUID);
DROP FUNCTION IF EXISTS public.get_pending_attendance_corrections(UUID, UUID);

CREATE OR REPLACE FUNCTION public.get_pending_attendance_corrections(
    p_company_id UUID,
    p_user_id UUID
)
RETURNS TABLE (
    id UUID,
    employee_id UUID,
    company_id UUID,
    data_original DATE,
    entrada_original TIME,
    saida_original TIME,
    entrada_corrigida TIME,
    saida_corrigida TIME,
    entrada_almoco_original TIME,
    saida_almoco_original TIME,
    entrada_almoco_corrigida TIME,
    saida_almoco_corrigida TIME,
    entrada_extra1_original TIME,
    saida_extra1_original TIME,
    entrada_extra1_corrigida TIME,
    saida_extra1_corrigida TIME,
    justificativa TEXT,
    status VARCHAR(20),
    solicitado_por UUID,
    aprovado_por UUID,
    aprovado_em TIMESTAMP WITH TIME ZONE,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    funcionario_nome VARCHAR(255),
    funcionario_matricula VARCHAR(50)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ac.id,
        ac.employee_id,
        ac.company_id,
        ac.data_original,
        ac.entrada_original,
        ac.saida_original,
        ac.entrada_corrigida,
        ac.saida_corrigida,
        ac.entrada_almoco_original,
        ac.saida_almoco_original,
        ac.entrada_almoco_corrigida,
        ac.saida_almoco_corrigida,
        ac.entrada_extra1_original,
        ac.saida_extra1_original,
        ac.entrada_extra1_corrigida,
        ac.saida_extra1_corrigida,
        ac.justificativa,
        ac.status,
        ac.solicitado_por,
        ac.aprovado_por,
        ac.aprovado_em,
        ac.observacoes,
        ac.created_at,
        ac.updated_at,
        e.nome as funcionario_nome,
        e.matricula as funcionario_matricula
    FROM rh.attendance_corrections ac
    JOIN rh.employees e ON e.id = ac.employee_id
    WHERE ac.company_id = p_company_id
    AND ac.status = 'pendente'
    -- Filtrar apenas correções de funcionários onde o usuário é gestor
    AND (
        -- Caso 1: gestor_imediato_id é o user_id diretamente
        e.gestor_imediato_id = p_user_id
        OR
        -- Caso 2: gestor_imediato_id é um employee_id que tem o user_id correspondente
        EXISTS (
            SELECT 1 
            FROM rh.employees gestor_employee
            WHERE gestor_employee.id = e.gestor_imediato_id
            AND gestor_employee.user_id = p_user_id
        )
    )
    ORDER BY ac.created_at DESC;
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.get_pending_attendance_corrections(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_attendance_corrections(UUID, UUID) TO anon;

COMMENT ON FUNCTION public.get_pending_attendance_corrections(UUID, UUID) IS 
'Retorna correções de ponto pendentes dos funcionários do gestor com dados completos (incluindo almoço e hora extra). Filtra apenas correções de funcionários onde o usuário é gestor imediato. Usa SECURITY DEFINER para garantir acesso aos registros.';

