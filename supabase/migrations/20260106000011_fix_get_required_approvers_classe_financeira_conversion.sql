-- =====================================================
-- CORREÇÃO: get_required_approvers - Converter classe_financeira VARCHAR para UUID
-- Data: 2026-01-06
-- Descrição: Corrige a função get_required_approvers para converter o nome da classe
--            financeira (VARCHAR) em ID (UUID) antes de comparar com o array UUID[]
--            na tabela configuracoes_aprovacao_unificada.
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_required_approvers(
    p_processo_tipo VARCHAR(50),
    p_processo_id UUID,
    p_company_id UUID
) RETURNS TABLE (
    nivel INTEGER,
    aprovador_id UUID,
    is_primary BOOLEAN,
    ordem INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    processo_valor DECIMAL(15,2) := 0;
    processo_centro_custo_id UUID;
    processo_classe_financeira VARCHAR(100);
    processo_classe_financeira_id UUID;  -- NOVO: ID da classe financeira
    processo_usuario_id UUID;
    config_record RECORD;
    aprovador_record RECORD;
BEGIN
    -- Log inicial
    RAISE NOTICE '=== get_required_approvers INÍCIO ===';
    RAISE NOTICE 'p_processo_tipo: %, p_processo_id: %, p_company_id: %', 
        p_processo_tipo, p_processo_id, p_company_id;
    
    -- Obter dados da solicitação baseado no tipo
    CASE p_processo_tipo
        WHEN 'conta_pagar' THEN
            SELECT valor_original, centro_custo_id, classe_financeira, created_by
            INTO processo_valor, processo_centro_custo_id, processo_classe_financeira, processo_usuario_id
            FROM financeiro.contas_pagar
            WHERE id = p_processo_id AND company_id = p_company_id;
            
            RAISE NOTICE 'Conta a pagar encontrada: valor=%, centro_custo_id=%, classe_financeira=%, usuario_id=%',
                processo_valor, processo_centro_custo_id, processo_classe_financeira, processo_usuario_id;
            
            -- CONVERSÃO: Buscar ID da classe financeira pelo nome
            IF processo_classe_financeira IS NOT NULL AND trim(processo_classe_financeira) != '' THEN
                SELECT id INTO processo_classe_financeira_id
                FROM financeiro.classes_financeiras
                WHERE company_id = p_company_id
                AND (nome = processo_classe_financeira OR codigo = processo_classe_financeira)
                AND is_active = true
                LIMIT 1;
                
                RAISE NOTICE 'Classe financeira "%" -> ID: %', 
                    processo_classe_financeira, processo_classe_financeira_id;
            ELSE
                processo_classe_financeira_id := NULL;
                RAISE NOTICE 'Classe financeira não informada ou vazia';
            END IF;
            
        WHEN 'requisicao_compra' THEN
            SELECT valor_total_estimado, centro_custo_id, solicitante_id
            INTO processo_valor, processo_centro_custo_id, processo_usuario_id
            FROM compras.requisicoes_compra
            WHERE id = p_processo_id AND company_id = p_company_id;
            
        WHEN 'cotacao_compra' THEN
            SELECT valor_total, centro_custo_id
            INTO processo_valor, processo_centro_custo_id
            FROM compras.cotacoes
            WHERE id = p_processo_id AND company_id = p_company_id;
            
        WHEN 'solicitacao_saida_material' THEN
            SELECT valor_total, centro_custo_id, funcionario_solicitante_id
            INTO processo_valor, processo_centro_custo_id, processo_usuario_id
            FROM public.solicitacoes_saida_materiais
            WHERE id = p_processo_id AND company_id = p_company_id;
            
        WHEN 'solicitacao_transferencia_material' THEN
            SELECT valor_total, centro_custo_id
            INTO processo_valor, processo_centro_custo_id
            FROM almoxarifado.transferencias
            WHERE id = p_processo_id AND company_id = p_company_id;
    END CASE;

    RAISE NOTICE 'Valores processados: valor=%, centro_custo_id=%, classe_financeira_id=%, usuario_id=%',
        processo_valor, processo_centro_custo_id, processo_classe_financeira_id, processo_usuario_id;

    -- Buscar configurações de aprovação que se aplicam
    -- CORREÇÃO: Comparar processo_classe_financeira_id (UUID) com classe_financeiras (UUID[])
    FOR config_record IN
        SELECT * FROM public.configuracoes_aprovacao_unificada
        WHERE company_id = p_company_id
        AND processo_tipo = p_processo_tipo
        AND ativo = true
        AND (valor_limite IS NULL OR valor_limite >= processo_valor)
        AND (centro_custo_id IS NULL OR centro_custo_id = processo_centro_custo_id)
        AND (
            classe_financeiras IS NULL 
            OR array_length(classe_financeiras, 1) IS NULL 
            OR processo_classe_financeira_id IS NULL
            OR processo_classe_financeira_id = ANY(classe_financeiras)
        )
        AND (usuario_id IS NULL OR usuario_id = processo_usuario_id)
        ORDER BY nivel_aprovacao, valor_limite DESC
    LOOP
        RAISE NOTICE 'Configuração encontrada: nivel=%, classe_financeiras=%', 
            config_record.nivel_aprovacao, config_record.classe_financeiras;
        
        -- Processar aprovadores do JSONB
        FOR aprovador_record IN
            SELECT 
                (aprovador->>'user_id')::UUID as user_id,
                COALESCE((aprovador->>'is_primary')::BOOLEAN, false) as is_primary,
                COALESCE((aprovador->>'ordem')::INTEGER, 0) as ordem
            FROM jsonb_array_elements(config_record.aprovadores) as aprovador
        LOOP
            nivel := config_record.nivel_aprovacao;
            aprovador_id := aprovador_record.user_id;
            is_primary := aprovador_record.is_primary;
            ordem := aprovador_record.ordem;
            RETURN NEXT;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE '=== get_required_approvers FIM ===';
END;
$$;

COMMENT ON FUNCTION public.get_required_approvers(VARCHAR, UUID, UUID) IS 
'Determina aprovadores necessários para um processo. 
Corrigida em 2026-01-06: 
- Converte classe_financeira (VARCHAR - nome) para UUID (ID) antes de comparar com classe_financeiras (UUID[])
- Adiciona logs detalhados para debug
- Corrige comparação de tipos incompatíveis (VARCHAR vs UUID[])';

