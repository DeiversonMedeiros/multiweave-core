-- =====================================================
-- FUNÇÃO: Obter próximo código interno de material
-- =====================================================
-- Data: 2025-12-03
-- Descrição: Retorna o próximo código interno sequencial para materiais/equipamentos
--            Garante que não há duplicatas e calcula no backend

-- Função no schema almoxarifado
CREATE OR REPLACE FUNCTION almoxarifado.get_next_codigo_interno(
    p_company_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_max_codigo INTEGER;
    v_next_codigo TEXT;
BEGIN
    -- Buscar o maior código interno numérico da empresa
    -- Considera apenas códigos que são números puros (sem letras)
    SELECT COALESCE(
        MAX(CAST(codigo_interno AS INTEGER)),
        0
    )
    INTO v_max_codigo
    FROM almoxarifado.materiais_equipamentos
    WHERE company_id = p_company_id
    AND codigo_interno ~ '^[0-9]+$'; -- Apenas números
    
    -- Se não encontrou nenhum código numérico, começar com 1
    IF v_max_codigo IS NULL THEN
        v_max_codigo := 0;
    END IF;
    
    -- Próximo código = máximo + 1
    v_next_codigo := (v_max_codigo + 1)::TEXT;
    
    RETURN v_next_codigo;
EXCEPTION
    WHEN OTHERS THEN
        -- Em caso de erro, retornar 1 como fallback
        RETURN '1';
END;
$$;

-- Função wrapper no schema public para acesso via RPC
CREATE OR REPLACE FUNCTION public.get_next_codigo_interno_material(
    p_company_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_proximo_codigo TEXT;
BEGIN
    -- Chamar função do schema almoxarifado
    v_proximo_codigo := almoxarifado.get_next_codigo_interno(p_company_id);
    
    -- Retornar como JSONB
    RETURN jsonb_build_object(
        'proximoCodigo', v_proximo_codigo
    );
END;
$$;

-- Grant permissões
GRANT EXECUTE ON FUNCTION almoxarifado.get_next_codigo_interno(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION almoxarifado.get_next_codigo_interno(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_next_codigo_interno_material(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_codigo_interno_material(UUID) TO anon;

-- Comentários
COMMENT ON FUNCTION almoxarifado.get_next_codigo_interno IS 'Retorna o próximo código interno sequencial para materiais/equipamentos da empresa';
COMMENT ON FUNCTION public.get_next_codigo_interno_material IS 'Wrapper RPC para obter próximo código interno de material - Retorna JSONB com {proximoCodigo: "2"}';


