-- =====================================================
-- FUNÇÃO PARA BUSCAR ATESTADOS MÉDICOS DO GESTOR
-- Retorna apenas atestados de funcionários gerenciados pelo gestor
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_medical_certificates_for_manager(
    p_company_id UUID,
    p_user_id UUID
)
RETURNS TABLE (
    id UUID,
    employee_id UUID,
    funcionario_nome TEXT,
    funcionario_matricula TEXT,
    data_inicio DATE,
    data_fim DATE,
    dias_afastamento INTEGER,
    tipo_atestado VARCHAR(50),
    numero_atestado VARCHAR(100),
    medico_nome VARCHAR(255),
    crm_crmo VARCHAR(50),
    cid_codigo VARCHAR(20),
    cid_descricao TEXT,
    observacoes TEXT,
    anexo_url TEXT,
    status VARCHAR(50),
    aprovado_por UUID,
    aprovado_em TIMESTAMP WITH TIME ZONE,
    data_aprovacao TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, rh
AS $$
BEGIN
    -- Access check: current user must belong to the company
    IF NOT EXISTS (
        SELECT 1 FROM public.user_companies uc
        WHERE uc.user_id = auth.uid()
          AND uc.company_id = p_company_id
          AND uc.ativo = true
    ) THEN
        RAISE EXCEPTION 'Usuário não tem acesso a esta empresa' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT 
        mc.id,
        mc.employee_id,
        e.nome::TEXT as funcionario_nome,
        e.matricula::TEXT as funcionario_matricula,
        mc.data_inicio,
        mc.data_fim,
        mc.dias_afastamento,
        mc.tipo_atestado,
        mc.numero_atestado,
        mc.medico_nome,
        mc.crm_crmo,
        mc.cid_codigo,
        mc.cid_descricao,
        mc.observacoes,
        mc.anexo_url,
        mc.status,
        mc.aprovado_por,
        mc.aprovado_em,
        mc.data_aprovacao,
        mc.created_at,
        mc.updated_at
    FROM rh.medical_certificates mc
    INNER JOIN rh.employees e ON mc.employee_id = e.id
    WHERE mc.company_id = p_company_id
    -- Filtrar apenas atestados de funcionários onde o usuário é gestor
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
    ORDER BY mc.created_at DESC;
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.get_medical_certificates_for_manager(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_medical_certificates_for_manager(UUID, UUID) TO anon;

COMMENT ON FUNCTION public.get_medical_certificates_for_manager(UUID, UUID) IS 
'Retorna atestados médicos apenas dos funcionários gerenciados pelo gestor. Filtra apenas atestados de funcionários onde o usuário é gestor imediato. Usa SECURITY DEFINER para garantir acesso aos registros.';

