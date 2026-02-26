-- =====================================================
-- MIGRAÇÃO: Ajustar compras.verificar_estoque_minimo para estoque_atual
-- Data: 2026-02-24
-- Descrição:
--   - A função compras.verificar_estoque_minimo estava assumindo
--     colunas como NEW.material_id e NEW.tipo_movimentacao,
--     o que faz sentido para movimentações de estoque, mas
--     o trigger atual está associado à tabela almoxarifado.estoque_atual.
--   - Isso causa erros como:
--       record "new" has no field "tipo_movimentacao"
--     ao inserir/atualizar almoxarifado.estoque_atual.
--   - Esta migração ajusta a função para trabalhar diretamente
--     com o schema real de almoxarifado.estoque_atual
--     (material_equipamento_id, quantidade_atual, etc.),
--     mantendo a lógica de gerar requisições automáticas
--     quando o estoque fica abaixo do mínimo.
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
    -- Esta função agora assume que o trigger está em almoxarifado.estoque_atual
    -- e usa as colunas reais da tabela:
    --   material_equipamento_id, quantidade_atual, almoxarifado_id, company_id.

    -- 1) Determinar o contexto da operação
    IF TG_OP = 'UPDATE' THEN
        -- Só reagir quando houver redução do estoque
        IF COALESCE(OLD.quantidade_atual, 0) <= COALESCE(NEW.quantidade_atual, 0) THEN
            RETURN COALESCE(NEW, OLD);
        END IF;

        v_material_id := NEW.material_equipamento_id;
        v_quantidade_atual := NEW.quantidade_atual;
        v_almoxarifado_id := NEW.almoxarifado_id;
        v_company_id := NEW.company_id;
    ELSIF TG_OP = 'INSERT' THEN
        -- Para INSERT em estoque_atual (primeiro registro de estoque),
        -- considerar a quantidade_atual inserida.
        v_material_id := NEW.material_equipamento_id;
        v_quantidade_atual := NEW.quantidade_atual;
        v_almoxarifado_id := NEW.almoxarifado_id;
        v_company_id := NEW.company_id;
    ELSE
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- 2) Buscar configuração de estoque mínimo do material
    --    A tabela almoxarifado.materiais_equipamentos usa a coluna estoque_minimo.
    --    Os campos centro_custo_id/projeto/prioridade/observacoes não existem mais nessa tabela
    --    no schema atual do banco remoto, então usamos apenas estoque_minimo e
    --    preenchemos os demais com defaults seguros.
    SELECT 
        me.estoque_minimo
    INTO 
        v_quantidade_minima
    FROM almoxarifado.materiais_equipamentos me
    WHERE me.id = v_material_id
      AND me.company_id = v_company_id
      AND me.estoque_minimo IS NOT NULL
      AND me.estoque_minimo > 0;

    -- Defaults para campos auxiliares de geração da requisição
    v_centro_custo_id := NULL;
    v_projeto_id := NULL;
    v_prioridade := 'normal';
    v_observacoes := 'Requisição automática - Estoque mínimo atingido';

    -- Se não há configuração de mínimo, não fazer nada
    IF NOT FOUND OR v_quantidade_minima IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- 3) Verificar se estoque atual está abaixo ou igual ao mínimo
    IF v_quantidade_atual <= v_quantidade_minima THEN
        -- Verificar se já existe requisição pendente para este material/almoxarifado
        IF NOT EXISTS (
            SELECT 1 
            FROM compras.requisicoes_compra rc
            JOIN compras.requisicao_itens ri ON ri.requisicao_id = rc.id
            WHERE ri.material_id = v_material_id
              AND rc.company_id = v_company_id
              AND rc.status IN ('rascunho', 'pendente_aprovacao', 'aprovada', 'em_cotacao')
              AND ri.almoxarifado_id = v_almoxarifado_id
        ) THEN
            -- 3.1) Criar requisição automática
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

            -- 3.2) Adicionar item na requisição
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

            -- 3.3) Atualizar valor total estimado da requisição
            UPDATE compras.requisicoes_compra
            SET valor_total_estimado = (
                SELECT SUM(valor_total_estimado) 
                FROM compras.requisicao_itens 
                WHERE requisicao_id = v_requisicao_id
            )
            WHERE id = v_requisicao_id;

            -- 3.4) Registrar log em rh.audit_logs
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

