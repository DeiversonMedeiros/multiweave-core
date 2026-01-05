-- =====================================================
-- MIGRAÇÃO: Funções RPC, Triggers e Lógica de Negócio
-- Data: 2025-01-05
-- Descrição: Funções para automatizar processos do módulo metalúrgica
-- =====================================================

-- =====================================================
-- FUNÇÕES DE NUMERAÇÃO
-- =====================================================

-- Função para gerar número de OP
CREATE OR REPLACE FUNCTION metalurgica.gerar_numero_op(p_company_id UUID)
RETURNS VARCHAR(100) AS $$
DECLARE
    v_sequencia INTEGER;
    v_ano INTEGER;
    v_numero VARCHAR(100);
BEGIN
    v_ano := EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Buscar último número do ano
    SELECT COALESCE(MAX(CAST(SUBSTRING(numero_op FROM '(\d+)$') AS INTEGER)), 0) + 1
    INTO v_sequencia
    FROM metalurgica.ordens_producao
    WHERE company_id = p_company_id
    AND numero_op LIKE 'OP-' || v_ano || '-%';
    
    v_numero := 'OP-' || v_ano || '-' || LPAD(v_sequencia::TEXT, 6, '0');
    
    RETURN v_numero;
END;
$$ LANGUAGE plpgsql;

-- Função para gerar número de OS
CREATE OR REPLACE FUNCTION metalurgica.gerar_numero_os(p_company_id UUID)
RETURNS VARCHAR(100) AS $$
DECLARE
    v_sequencia INTEGER;
    v_ano INTEGER;
    v_numero VARCHAR(100);
BEGIN
    v_ano := EXTRACT(YEAR FROM CURRENT_DATE);
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(numero_os FROM '(\d+)$') AS INTEGER)), 0) + 1
    INTO v_sequencia
    FROM metalurgica.ordens_servico
    WHERE company_id = p_company_id
    AND numero_os LIKE 'OS-' || v_ano || '-%';
    
    v_numero := 'OS-' || v_ano || '-' || LPAD(v_sequencia::TEXT, 6, '0');
    
    RETURN v_numero;
END;
$$ LANGUAGE plpgsql;

-- Função para gerar número de lote
CREATE OR REPLACE FUNCTION metalurgica.gerar_numero_lote(p_company_id UUID)
RETURNS VARCHAR(100) AS $$
DECLARE
    v_sequencia INTEGER;
    v_ano INTEGER;
    v_numero VARCHAR(100);
BEGIN
    v_ano := EXTRACT(YEAR FROM CURRENT_DATE);
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(numero_lote FROM '(\d+)$') AS INTEGER)), 0) + 1
    INTO v_sequencia
    FROM metalurgica.lotes
    WHERE company_id = p_company_id
    AND numero_lote LIKE 'LOTE-' || v_ano || '-%';
    
    v_numero := 'LOTE-' || v_ano || '-' || LPAD(v_sequencia::TEXT, 6, '0');
    
    RETURN v_numero;
END;
$$ LANGUAGE plpgsql;

-- Função para gerar número de certificado
CREATE OR REPLACE FUNCTION metalurgica.gerar_numero_certificado(p_company_id UUID)
RETURNS VARCHAR(100) AS $$
DECLARE
    v_sequencia INTEGER;
    v_ano INTEGER;
    v_numero VARCHAR(100);
BEGIN
    v_ano := EXTRACT(YEAR FROM CURRENT_DATE);
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(numero_certificado FROM '(\d+)$') AS INTEGER)), 0) + 1
    INTO v_sequencia
    FROM metalurgica.certificados_qualidade
    WHERE company_id = p_company_id
    AND numero_certificado LIKE 'CQ-' || v_ano || '-%';
    
    v_numero := 'CQ-' || v_ano || '-' || LPAD(v_sequencia::TEXT, 6, '0');
    
    RETURN v_numero;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNÇÕES DE CÁLCULO DE MATERIAIS NECESSÁRIOS
-- =====================================================

-- Função para calcular materiais necessários para uma OP/OS
CREATE OR REPLACE FUNCTION metalurgica.calcular_materiais_necessarios(
    p_produto_id UUID,
    p_quantidade DECIMAL
)
RETURNS TABLE (
    material_id UUID,
    quantidade_necessaria DECIMAL,
    unidade_medida VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE estrutura_completa AS (
        -- Base: componentes diretos do produto
        SELECT 
            ep.produto_filho_id,
            ep.quantidade_necessaria * p_quantidade as quantidade_total,
            ep.unidade_medida,
            1 as nivel
        FROM metalurgica.estrutura_produtos ep
        WHERE ep.produto_pai_id = p_produto_id
        
        UNION ALL
        
        -- Recursivo: componentes dos componentes
        SELECT 
            ep2.produto_filho_id,
            ec.quantidade_total * ep2.quantidade_necessaria,
            ep2.unidade_medida,
            ec.nivel + 1
        FROM estrutura_completa ec
        JOIN metalurgica.estrutura_produtos ep2 ON ep2.produto_pai_id = ec.produto_filho_id
        WHERE ec.nivel < 10 -- Limite de profundidade
    )
    SELECT 
        ec.produto_filho_id as material_id,
        SUM(ec.quantidade_total) as quantidade_necessaria,
        MAX(ec.unidade_medida) as unidade_medida
    FROM estrutura_completa ec
    GROUP BY ec.produto_filho_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNÇÕES DE RESERVA DE MATERIAIS
-- =====================================================

-- Função para criar solicitações de materiais automaticamente
CREATE OR REPLACE FUNCTION metalurgica.criar_solicitacoes_materiais_op()
RETURNS TRIGGER AS $$
DECLARE
    v_material RECORD;
    v_estoque_disponivel DECIMAL;
    v_almoxarifado_id UUID;
BEGIN
    -- Só processa quando OP é aprovada
    IF NEW.status = 'aprovada' AND (OLD.status IS NULL OR OLD.status != 'aprovada') THEN
        -- Buscar almoxarifado padrão (primeiro ativo da empresa)
        SELECT id INTO v_almoxarifado_id
        FROM almoxarifado.almoxarifados
        WHERE company_id = NEW.company_id
        AND ativo = true
        LIMIT 1;
        
        -- Se não encontrou almoxarifado, não cria solicitações
        IF v_almoxarifado_id IS NULL THEN
            RETURN NEW;
        END IF;
        
        -- Para cada material necessário
        FOR v_material IN 
            SELECT * FROM metalurgica.calcular_materiais_necessarios(NEW.produto_id, NEW.quantidade_solicitada)
        LOOP
            -- Verificar estoque disponível
            SELECT COALESCE(quantidade_disponivel, 0) INTO v_estoque_disponivel
            FROM almoxarifado.estoque_atual
            WHERE material_equipamento_id = v_material.material_id
            AND almoxarifado_id = v_almoxarifado_id;
            
            -- Criar solicitação de material
            INSERT INTO metalurgica.solicitacoes_materiais (
                op_id,
                company_id,
                material_id,
                almoxarifado_id,
                quantidade_necessaria,
                status
            ) VALUES (
                NEW.id,
                NEW.company_id,
                v_material.material_id,
                v_almoxarifado_id,
                v_material.quantidade_necessaria,
                CASE 
                    WHEN COALESCE(v_estoque_disponivel, 0) >= v_material.quantidade_necessaria THEN 'atendida'
                    ELSE 'pendente'
                END
            );
            
            -- Se não tem estoque suficiente, criar requisição de compra
            IF COALESCE(v_estoque_disponivel, 0) < v_material.quantidade_necessaria THEN
                -- Verificar se já existe requisição pendente
                IF NOT EXISTS (
                    SELECT 1 
                    FROM compras.requisicoes_compra rc
                    JOIN compras.requisicao_itens ri ON ri.requisicao_id = rc.id
                    WHERE ri.material_id = v_material.material_id
                    AND rc.company_id = NEW.company_id
                    AND rc.status IN ('rascunho', 'pendente_aprovacao', 'aprovada', 'em_cotacao')
                ) THEN
                    -- Criar requisição de compra (se schema compras existir)
                    -- Esta parte pode ser implementada quando necessário
                END IF;
            END IF;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para criar solicitações de materiais ao aprovar OP
CREATE TRIGGER trigger_criar_solicitacoes_materiais_op
    AFTER INSERT OR UPDATE OF status ON metalurgica.ordens_producao
    FOR EACH ROW
    EXECUTE FUNCTION metalurgica.criar_solicitacoes_materiais_op();

-- Função similar para OS
CREATE OR REPLACE FUNCTION metalurgica.criar_solicitacoes_materiais_os()
RETURNS TRIGGER AS $$
DECLARE
    v_material RECORD;
    v_estoque_disponivel DECIMAL;
    v_almoxarifado_id UUID;
BEGIN
    IF NEW.status = 'aprovada' AND (OLD.status IS NULL OR OLD.status != 'aprovada') THEN
        SELECT id INTO v_almoxarifado_id
        FROM almoxarifado.almoxarifados
        WHERE company_id = NEW.company_id
        AND ativo = true
        LIMIT 1;
        
        IF v_almoxarifado_id IS NULL THEN
            RETURN NEW;
        END IF;
        
        FOR v_material IN 
            SELECT * FROM metalurgica.calcular_materiais_necessarios(NEW.produto_id, NEW.quantidade_solicitada)
        LOOP
            SELECT COALESCE(quantidade_disponivel, 0) INTO v_estoque_disponivel
            FROM almoxarifado.estoque_atual
            WHERE material_equipamento_id = v_material.material_id
            AND almoxarifado_id = v_almoxarifado_id;
            
            INSERT INTO metalurgica.solicitacoes_materiais (
                os_id,
                company_id,
                material_id,
                almoxarifado_id,
                quantidade_necessaria,
                status
            ) VALUES (
                NEW.id,
                NEW.company_id,
                v_material.material_id,
                v_almoxarifado_id,
                v_material.quantidade_necessaria,
                CASE 
                    WHEN COALESCE(v_estoque_disponivel, 0) >= v_material.quantidade_necessaria THEN 'atendida'
                    ELSE 'pendente'
                END
            );
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_criar_solicitacoes_materiais_os
    AFTER INSERT OR UPDATE OF status ON metalurgica.ordens_servico
    FOR EACH ROW
    EXECUTE FUNCTION metalurgica.criar_solicitacoes_materiais_os();

-- =====================================================
-- FUNÇÕES DE RESERVA DE ESTOQUE
-- =====================================================

-- Função para reservar materiais no estoque
CREATE OR REPLACE FUNCTION metalurgica.reservar_materiais_estoque()
RETURNS TRIGGER AS $$
DECLARE
    v_estoque RECORD;
    v_quantidade_reservar DECIMAL;
BEGIN
    -- Quando solicitação é atendida, reservar no estoque
    IF NEW.status = 'atendida' AND (OLD.status IS NULL OR OLD.status != 'atendida') THEN
        -- Buscar estoque atual
        SELECT * INTO v_estoque
        FROM almoxarifado.estoque_atual
        WHERE material_equipamento_id = NEW.material_id
        AND almoxarifado_id = NEW.almoxarifado_id;
        
        IF FOUND THEN
            v_quantidade_reservar := NEW.quantidade_necessaria - COALESCE(NEW.quantidade_reservada, 0);
            
            -- Atualizar quantidade reservada
            UPDATE almoxarifado.estoque_atual
            SET quantidade_reservada = quantidade_reservada + v_quantidade_reservar,
                updated_at = NOW()
            WHERE id = v_estoque.id;
            
            -- Atualizar solicitação
            NEW.quantidade_reservada := NEW.quantidade_necessaria;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reservar_materiais_estoque
    BEFORE UPDATE OF status ON metalurgica.solicitacoes_materiais
    FOR EACH ROW
    EXECUTE FUNCTION metalurgica.reservar_materiais_estoque();

-- =====================================================
-- FUNÇÕES DE GERAÇÃO DE CERTIFICADO
-- =====================================================

-- Função para gerar certificado automaticamente após inspeção final aprovada
CREATE OR REPLACE FUNCTION metalurgica.gerar_certificado_qualidade()
RETURNS TRIGGER AS $$
DECLARE
    v_lote RECORD;
    v_produto RECORD;
    v_numero_certificado VARCHAR(100);
    v_certificado_id UUID;
BEGIN
    -- Quando inspeção final é aprovada, gerar certificado
    IF NEW.tipo = 'inspecao_final' 
       AND NEW.status = 'aprovada' 
       AND (OLD.status IS NULL OR OLD.status != 'aprovada') THEN
        
        -- Buscar dados do lote
        SELECT l.*, p.id as produto_id, p.peso_unitario_kg
        INTO v_lote
        FROM metalurgica.lotes l
        JOIN metalurgica.produtos p ON p.id = l.produto_id
        WHERE l.id = NEW.lote_id;
        
        IF FOUND THEN
            -- Gerar número do certificado
            v_numero_certificado := metalurgica.gerar_numero_certificado(v_lote.company_id);
            
            -- Criar certificado
            INSERT INTO metalurgica.certificados_qualidade (
                company_id,
                numero_certificado,
                lote_id,
                inspecao_id,
                produto_id,
                quantidade_certificada,
                peso_total_kg,
                data_emissao,
                emitido_por
            ) VALUES (
                v_lote.company_id,
                v_numero_certificado,
                NEW.lote_id,
                NEW.id,
                v_lote.produto_id,
                NEW.quantidade_aprovada,
                v_lote.peso_total_kg,
                CURRENT_DATE,
                NEW.inspetor_id
            )
            RETURNING id INTO v_certificado_id;
            
            -- Atualizar status do lote
            UPDATE metalurgica.lotes
            SET status = 'aprovado',
                updated_at = NOW()
            WHERE id = NEW.lote_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_gerar_certificado_qualidade
    AFTER INSERT OR UPDATE OF status ON metalurgica.inspecoes
    FOR EACH ROW
    EXECUTE FUNCTION metalurgica.gerar_certificado_qualidade();

-- =====================================================
-- FUNÇÕES DE CÁLCULO DE INDICADORES (OEE, MTBF, MTTR)
-- =====================================================

-- Função para calcular OEE (Overall Equipment Effectiveness)
CREATE OR REPLACE FUNCTION metalurgica.calcular_oee(
    p_maquina_id UUID,
    p_data_inicio DATE,
    p_data_fim DATE
)
RETURNS TABLE (
    disponibilidade DECIMAL,
    performance DECIMAL,
    qualidade DECIMAL,
    oee DECIMAL
) AS $$
DECLARE
    v_tempo_total_minutos DECIMAL;
    v_tempo_parado_minutos DECIMAL;
    v_tempo_producao_minutos DECIMAL;
    v_producao_real DECIMAL;
    v_producao_ideal DECIMAL;
    v_producao_aprovada DECIMAL;
    v_disponibilidade DECIMAL;
    v_performance DECIMAL;
    v_qualidade DECIMAL;
    v_oee DECIMAL;
BEGIN
    -- Calcular tempo total (em minutos)
    v_tempo_total_minutos := EXTRACT(EPOCH FROM (p_data_fim - p_data_inicio + INTERVAL '1 day')) / 60;
    
    -- Calcular tempo parado (paradas que afetam OEE)
    SELECT COALESCE(SUM(duracao_minutos), 0)
    INTO v_tempo_parado_minutos
    FROM metalurgica.paradas_producao
    WHERE maquina_id = p_maquina_id
    AND data_hora_inicio::DATE BETWEEN p_data_inicio AND p_data_fim
    AND data_hora_termino IS NOT NULL
    AND EXISTS (
        SELECT 1 FROM metalurgica.tipos_parada tp
        WHERE tp.id = tipo_parada_id
        AND tp.afeta_oee = true
    );
    
    -- Tempo de produção = tempo total - tempo parado
    v_tempo_producao_minutos := v_tempo_total_minutos - v_tempo_parado_minutos;
    
    -- Disponibilidade = (tempo produção / tempo total) * 100
    v_disponibilidade := CASE 
        WHEN v_tempo_total_minutos > 0 
        THEN (v_tempo_producao_minutos / v_tempo_total_minutos) * 100
        ELSE 0
    END;
    
    -- Performance = (produção real / produção ideal) * 100
    -- Buscar capacidade da máquina
    SELECT capacidade_producao_hora INTO v_producao_ideal
    FROM metalurgica.maquinas
    WHERE id = p_maquina_id;
    
    -- Produção ideal = capacidade * tempo produção (em horas)
    v_producao_ideal := COALESCE(v_producao_ideal, 0) * (v_tempo_producao_minutos / 60);
    
    -- Produção real (quantidade produzida)
    SELECT COALESCE(SUM(quantidade_produzida), 0)
    INTO v_producao_real
    FROM metalurgica.lotes
    WHERE maquina_id = p_maquina_id
    AND data_producao BETWEEN p_data_inicio AND p_data_fim;
    
    v_performance := CASE
        WHEN v_producao_ideal > 0
        THEN (v_producao_real / v_producao_ideal) * 100
        ELSE 0
    END;
    
    -- Qualidade = (produção aprovada / produção total) * 100
    SELECT 
        COALESCE(SUM(CASE WHEN i.status = 'aprovada' THEN i.quantidade_aprovada ELSE 0 END), 0),
        COALESCE(SUM(i.quantidade_inspecionada), 0)
    INTO v_producao_aprovada, v_producao_real
    FROM metalurgica.inspecoes i
    JOIN metalurgica.lotes l ON l.id = i.lote_id
    WHERE l.maquina_id = p_maquina_id
    AND l.data_producao BETWEEN p_data_inicio AND p_data_fim;
    
    v_qualidade := CASE
        WHEN v_producao_real > 0
        THEN (v_producao_aprovada / v_producao_real) * 100
        ELSE 0
    END;
    
    -- OEE = Disponibilidade * Performance * Qualidade / 10000
    v_oee := (v_disponibilidade * v_performance * v_qualidade) / 10000;
    
    RETURN QUERY SELECT 
        ROUND(v_disponibilidade, 2),
        ROUND(v_performance, 2),
        ROUND(v_qualidade, 2),
        ROUND(v_oee, 2);
END;
$$ LANGUAGE plpgsql;

-- Função para calcular MTBF (Mean Time Between Failures)
CREATE OR REPLACE FUNCTION metalurgica.calcular_mtbf(
    p_maquina_id UUID,
    p_data_inicio DATE,
    p_data_fim DATE
)
RETURNS DECIMAL AS $$
DECLARE
    v_tempo_total_minutos DECIMAL;
    v_numero_falhas INTEGER;
    v_mtbf DECIMAL;
BEGIN
    -- Contar falhas (paradas do tipo quebra_maquina)
    SELECT COUNT(*)
    INTO v_numero_falhas
    FROM metalurgica.paradas_producao pp
    JOIN metalurgica.tipos_parada tp ON tp.id = pp.tipo_parada_id
    WHERE pp.maquina_id = p_maquina_id
    AND pp.data_hora_inicio::DATE BETWEEN p_data_inicio AND p_data_fim
    AND tp.tipo = 'quebra_maquina'
    AND pp.data_hora_termino IS NOT NULL;
    
    -- Tempo total em minutos
    v_tempo_total_minutos := EXTRACT(EPOCH FROM (p_data_fim - p_data_inicio + INTERVAL '1 day')) / 60;
    
    -- MTBF = tempo total / número de falhas (em horas)
    v_mtbf := CASE
        WHEN v_numero_falhas > 0
        THEN (v_tempo_total_minutos / v_numero_falhas) / 60
        ELSE NULL
    END;
    
    RETURN v_mtbf;
END;
$$ LANGUAGE plpgsql;

-- Função para calcular MTTR (Mean Time To Repair)
CREATE OR REPLACE FUNCTION metalurgica.calcular_mttr(
    p_maquina_id UUID,
    p_data_inicio DATE,
    p_data_fim DATE
)
RETURNS DECIMAL AS $$
DECLARE
    v_tempo_total_reparo_minutos DECIMAL;
    v_numero_reparos INTEGER;
    v_mttr DECIMAL;
BEGIN
    -- Somar tempo de reparo (paradas do tipo quebra_maquina)
    SELECT 
        COALESCE(SUM(duracao_minutos), 0),
        COUNT(*)
    INTO v_tempo_total_reparo_minutos, v_numero_reparos
    FROM metalurgica.paradas_producao pp
    JOIN metalurgica.tipos_parada tp ON tp.id = pp.tipo_parada_id
    WHERE pp.maquina_id = p_maquina_id
    AND pp.data_hora_inicio::DATE BETWEEN p_data_inicio AND p_data_fim
    AND tp.tipo = 'quebra_maquina'
    AND pp.data_hora_termino IS NOT NULL;
    
    -- MTTR = tempo total reparo / número de reparos (em horas)
    v_mttr := CASE
        WHEN v_numero_reparos > 0
        THEN (v_tempo_total_reparo_minutos / v_numero_reparos) / 60
        ELSE NULL
    END;
    
    RETURN v_mttr;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS DE ATUALIZAÇÃO AUTOMÁTICA
-- =====================================================

-- Trigger para atualizar quantidade produzida na OP quando lote é concluído
CREATE OR REPLACE FUNCTION metalurgica.atualizar_op_quantidade_produzida()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'concluido' AND (OLD.status IS NULL OR OLD.status != 'concluido') THEN
        IF NEW.op_id IS NOT NULL THEN
            UPDATE metalurgica.ordens_producao
            SET quantidade_produzida = quantidade_produzida + NEW.quantidade_produzida,
                updated_at = NOW()
            WHERE id = NEW.op_id;
            
            -- Verificar se OP foi concluída
            UPDATE metalurgica.ordens_producao
            SET status = 'concluida',
                data_termino_producao = NOW(),
                updated_at = NOW()
            WHERE id = NEW.op_id
            AND quantidade_produzida >= quantidade_solicitada;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_op_quantidade_produzida
    AFTER UPDATE OF status ON metalurgica.lotes
    FOR EACH ROW
    EXECUTE FUNCTION metalurgica.atualizar_op_quantidade_produzida();

-- Trigger similar para OS
CREATE OR REPLACE FUNCTION metalurgica.atualizar_os_quantidade_produzida()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'concluido' AND (OLD.status IS NULL OR OLD.status != 'concluido') THEN
        IF NEW.os_id IS NOT NULL THEN
            UPDATE metalurgica.ordens_servico
            SET quantidade_produzida = quantidade_produzida + NEW.quantidade_produzida,
                updated_at = NOW()
            WHERE id = NEW.os_id;
            
            UPDATE metalurgica.ordens_servico
            SET status = 'concluida',
                data_termino_producao = NOW(),
                updated_at = NOW()
            WHERE id = NEW.os_id
            AND quantidade_produzida >= quantidade_solicitada;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_os_quantidade_produzida
    AFTER UPDATE OF status ON metalurgica.lotes
    FOR EACH ROW
    EXECUTE FUNCTION metalurgica.atualizar_os_quantidade_produzida();

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION metalurgica.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger de updated_at nas tabelas principais
CREATE TRIGGER update_produtos_updated_at
    BEFORE UPDATE ON metalurgica.produtos
    FOR EACH ROW
    EXECUTE FUNCTION metalurgica.update_updated_at_column();

CREATE TRIGGER update_ordens_producao_updated_at
    BEFORE UPDATE ON metalurgica.ordens_producao
    FOR EACH ROW
    EXECUTE FUNCTION metalurgica.update_updated_at_column();

CREATE TRIGGER update_ordens_servico_updated_at
    BEFORE UPDATE ON metalurgica.ordens_servico
    FOR EACH ROW
    EXECUTE FUNCTION metalurgica.update_updated_at_column();

CREATE TRIGGER update_lotes_updated_at
    BEFORE UPDATE ON metalurgica.lotes
    FOR EACH ROW
    EXECUTE FUNCTION metalurgica.update_updated_at_column();

CREATE TRIGGER update_galvanizacoes_updated_at
    BEFORE UPDATE ON metalurgica.galvanizacoes
    FOR EACH ROW
    EXECUTE FUNCTION metalurgica.update_updated_at_column();

CREATE TRIGGER update_inspecoes_updated_at
    BEFORE UPDATE ON metalurgica.inspecoes
    FOR EACH ROW
    EXECUTE FUNCTION metalurgica.update_updated_at_column();

CREATE TRIGGER update_certificados_qualidade_updated_at
    BEFORE UPDATE ON metalurgica.certificados_qualidade
    FOR EACH ROW
    EXECUTE FUNCTION metalurgica.update_updated_at_column();

CREATE TRIGGER update_nao_conformidades_updated_at
    BEFORE UPDATE ON metalurgica.nao_conformidades
    FOR EACH ROW
    EXECUTE FUNCTION metalurgica.update_updated_at_column();

CREATE TRIGGER update_planejamento_producao_updated_at
    BEFORE UPDATE ON metalurgica.planejamento_producao
    FOR EACH ROW
    EXECUTE FUNCTION metalurgica.update_updated_at_column();

