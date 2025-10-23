-- =====================================================
-- TRIGGER DE ESTOQUE MÍNIMO - MÓDULO COMPRAS
-- =====================================================
-- Data: 2025-01-15
-- Descrição: Cria trigger para gerar requisições automáticas quando estoque atinge nível mínimo
-- =====================================================

-- =====================================================
-- FUNÇÃO: VERIFICAR ESTOQUE MÍNIMO
-- =====================================================

CREATE OR REPLACE FUNCTION compras.verificar_estoque_minimo()
RETURNS TRIGGER AS $$
DECLARE
    v_material_id UUID;
    v_quantidade_atual DECIMAL(10,3);
    v_quantidade_minima DECIMAL(10,3);
    v_almoxarifado_id UUID;
    v_company_id UUID;
    v_requisicao_id UUID;
    v_item_id UUID;
    v_centro_custo_id UUID;
    v_projeto_id UUID;
    v_prioridade compras.prioridade;
    v_observacoes TEXT;
BEGIN
    -- Verificar se é uma operação de saída (redução do estoque)
    IF TG_OP = 'UPDATE' AND OLD.quantidade_atual > NEW.quantidade_atual THEN
        v_material_id := NEW.material_id;
        v_quantidade_atual := NEW.quantidade_atual;
        v_almoxarifado_id := NEW.almoxarifado_id;
        v_company_id := NEW.company_id;
    ELSIF TG_OP = 'INSERT' AND NEW.tipo_movimentacao = 'saida' THEN
        v_material_id := NEW.material_id;
        v_quantidade_atual := NEW.quantidade_atual;
        v_almoxarifado_id := NEW.almoxarifado_id;
        v_company_id := NEW.company_id;
    ELSE
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Buscar quantidade mínima do material
    SELECT 
        me.quantidade_minima,
        me.centro_custo_id,
        me.projeto_id,
        me.prioridade_requisicao,
        me.observacoes_requisicao
    INTO 
        v_quantidade_minima,
        v_centro_custo_id,
        v_projeto_id,
        v_prioridade,
        v_observacoes
    FROM almoxarifado.materiais_equipamentos me
    WHERE me.id = v_material_id
    AND me.company_id = v_company_id
    AND me.quantidade_minima IS NOT NULL
    AND me.quantidade_minima > 0;

    -- Se não encontrou configuração de estoque mínimo, não faz nada
    IF NOT FOUND OR v_quantidade_minima IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Verificar se estoque está abaixo do mínimo
    IF v_quantidade_atual <= v_quantidade_minima THEN
        -- Verificar se já existe requisição pendente para este material
        IF NOT EXISTS (
            SELECT 1 
            FROM compras.requisicoes_compra rc
            JOIN compras.requisicao_itens ri ON ri.requisicao_id = rc.id
            WHERE ri.material_id = v_material_id
            AND rc.company_id = v_company_id
            AND rc.status IN ('rascunho', 'pendente_aprovacao', 'aprovada', 'em_cotacao')
            AND ri.almoxarifado_id = v_almoxarifado_id
        ) THEN
            -- Criar requisição automática
            INSERT INTO compras.requisicoes_compra (
                id, company_id, solicitante_id, centro_custo_id, projeto_id,
                numero_requisicao, data_solicitacao, data_necessidade,
                status, prioridade, valor_total_estimado, observacoes,
                justificativa, created_by
            ) VALUES (
                gen_random_uuid(), v_company_id, 
                (SELECT id FROM public.users WHERE company_id = v_company_id LIMIT 1),
                v_centro_custo_id, v_projeto_id,
                compras.gerar_numero_requisicao(v_company_id),
                CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days',
                'rascunho', COALESCE(v_prioridade, 'normal'),
                0, COALESCE(v_observacoes, 'Requisição automática - Estoque mínimo atingido'),
                'Requisição gerada automaticamente pelo sistema devido ao estoque mínimo',
                (SELECT id FROM public.users WHERE company_id = v_company_id LIMIT 1)
            ) RETURNING id INTO v_requisicao_id;

            -- Adicionar item à requisição
            INSERT INTO compras.requisicao_itens (
                id, requisicao_id, material_id, almoxarifado_id,
                quantidade, unidade_medida, valor_unitario_estimado,
                valor_total_estimado, especificacao_tecnica, observacoes, status
            ) VALUES (
                gen_random_uuid(), v_requisicao_id, v_material_id, v_almoxarifado_id,
                v_quantidade_minima * 2, -- Solicitar 2x a quantidade mínima
                (SELECT unidade_medida FROM almoxarifado.materiais_equipamentos WHERE id = v_material_id),
                (SELECT valor_unitario_estimado FROM almoxarifado.materiais_equipamentos WHERE id = v_material_id),
                (v_quantidade_minima * 2) * COALESCE(
                    (SELECT valor_unitario_estimado FROM almoxarifado.materiais_equipamentos WHERE id = v_material_id), 
                    0
                ),
                'Recomposição automática de estoque',
                'Item adicionado automaticamente devido ao estoque mínimo',
                'pendente'
            ) RETURNING id INTO v_item_id;

            -- Atualizar valor total da requisição
            UPDATE compras.requisicoes_compra
            SET valor_total_estimado = (
                SELECT SUM(valor_total_estimado) 
                FROM compras.requisicao_itens 
                WHERE requisicao_id = v_requisicao_id
            )
            WHERE id = v_requisicao_id;

            -- Log da ação
            INSERT INTO rh.audit_logs (
                table_name, operation_type, new_data, user_id, company_id, created_at
            ) VALUES (
                'compras.requisicoes_compra', 'AUTO_CREATE',
                json_build_object(
                    'requisicao_id', v_requisicao_id,
                    'material_id', v_material_id,
                    'quantidade_atual', v_quantidade_atual,
                    'quantidade_minima', v_quantidade_minima,
                    'almoxarifado_id', v_almoxarifado_id,
                    'motivo', 'estoque_minimo'
                ),
                (SELECT id FROM public.users WHERE company_id = v_company_id LIMIT 1),
                v_company_id,
                NOW()
            );
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION compras.verificar_estoque_minimo IS 'Verifica estoque mínimo e cria requisições automáticas';

-- =====================================================
-- TRIGGER NO ALMOXARIFADO
-- =====================================================

-- Dropar trigger existente se houver
DROP TRIGGER IF EXISTS trigger_verificar_estoque_minimo ON almoxarifado.estoque_atual;

-- Criar trigger
CREATE TRIGGER trigger_verificar_estoque_minimo
    AFTER INSERT OR UPDATE ON almoxarifado.estoque_atual
    FOR EACH ROW EXECUTE FUNCTION compras.verificar_estoque_minimo();

-- =====================================================
-- FUNÇÃO: CONFIGURAR ESTOQUE MÍNIMO
-- =====================================================

CREATE OR REPLACE FUNCTION compras.configurar_estoque_minimo(
    p_material_id UUID,
    p_company_id UUID,
    p_quantidade_minima DECIMAL(10,3),
    p_centro_custo_id UUID DEFAULT NULL,
    p_projeto_id UUID DEFAULT NULL,
    p_prioridade compras.prioridade DEFAULT 'normal',
    p_observacoes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    -- Atualizar configuração no material
    UPDATE almoxarifado.materiais_equipamentos
    SET 
        quantidade_minima = p_quantidade_minima,
        centro_custo_id = p_centro_custo_id,
        projeto_id = p_projeto_id,
        prioridade_requisicao = p_prioridade,
        observacoes_requisicao = p_observacoes,
        updated_at = NOW()
    WHERE id = p_material_id AND company_id = p_company_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Material não encontrado';
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION compras.configurar_estoque_minimo IS 'Configura estoque mínimo para um material';

-- =====================================================
-- FUNÇÃO: VERIFICAR TODOS OS ESTOQUES
-- =====================================================

CREATE OR REPLACE FUNCTION compras.verificar_todos_estoques_minimos(
    p_company_id UUID DEFAULT NULL
) RETURNS TABLE (
    material_id UUID,
    material_nome TEXT,
    almoxarifado_id UUID,
    almoxarifado_nome TEXT,
    quantidade_atual DECIMAL(10,3),
    quantidade_minima DECIMAL(10,3),
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ea.material_id,
        me.nome as material_nome,
        ea.almoxarifado_id,
        a.nome as almoxarifado_nome,
        ea.quantidade_atual,
        me.quantidade_minima,
        CASE 
            WHEN ea.quantidade_atual <= me.quantidade_minima THEN 'CRÍTICO'
            WHEN ea.quantidade_atual <= (me.quantidade_minima * 1.5) THEN 'ATENÇÃO'
            ELSE 'NORMAL'
        END as status
    FROM almoxarifado.estoque_atual ea
    JOIN almoxarifado.materiais_equipamentos me ON me.id = ea.material_id
    JOIN almoxarifado.almoxarifados a ON a.id = ea.almoxarifado_id
    WHERE (p_company_id IS NULL OR ea.company_id = p_company_id)
    AND me.quantidade_minima IS NOT NULL
    AND me.quantidade_minima > 0
    ORDER BY 
        CASE 
            WHEN ea.quantidade_atual <= me.quantidade_minima THEN 1
            WHEN ea.quantidade_atual <= (me.quantidade_minima * 1.5) THEN 2
            ELSE 3
        END,
        ea.quantidade_atual / me.quantidade_minima;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION compras.verificar_todos_estoques_minimos IS 'Verifica todos os estoques que estão abaixo do mínimo';

-- =====================================================
-- VIEW: DASHBOARD DE ESTOQUE MÍNIMO
-- =====================================================

CREATE VIEW compras.dashboard_estoque_minimo AS
SELECT 
    company_id,
    COUNT(CASE WHEN status = 'CRÍTICO' THEN 1 END) as estoques_criticos,
    COUNT(CASE WHEN status = 'ATENÇÃO' THEN 1 END) as estoques_atencao,
    COUNT(CASE WHEN status = 'NORMAL' THEN 1 END) as estoques_normais,
    COUNT(*) as total_materiais_monitorados,
    AVG(CASE 
        WHEN quantidade_minima > 0 THEN quantidade_atual / quantidade_minima 
        ELSE 1 
    END) as media_estoque_vs_minimo
FROM compras.verificar_todos_estoques_minimos()
GROUP BY company_id;

COMMENT ON VIEW compras.dashboard_estoque_minimo IS 'Dashboard de monitoramento de estoque mínimo';

-- =====================================================
-- COMENTÁRIOS FINAIS
-- =====================================================

COMMENT ON SCHEMA compras IS 'Módulo de Compras com trigger de estoque mínimo implementado';
