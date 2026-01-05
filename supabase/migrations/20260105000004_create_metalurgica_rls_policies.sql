-- =====================================================
-- MIGRAÇÃO: Políticas RLS (Row Level Security)
-- Data: 2025-01-05
-- Descrição: Políticas de segurança para o módulo metalúrgica
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE metalurgica.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE metalurgica.estrutura_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE metalurgica.maquinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE metalurgica.tipos_parada ENABLE ROW LEVEL SECURITY;
ALTER TABLE metalurgica.ordens_producao ENABLE ROW LEVEL SECURITY;
ALTER TABLE metalurgica.ordens_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE metalurgica.solicitacoes_materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE metalurgica.lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE metalurgica.paradas_producao ENABLE ROW LEVEL SECURITY;
ALTER TABLE metalurgica.galvanizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE metalurgica.galvanizacao_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE metalurgica.inspecoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE metalurgica.certificados_qualidade ENABLE ROW LEVEL SECURITY;
ALTER TABLE metalurgica.nao_conformidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE metalurgica.planejamento_producao ENABLE ROW LEVEL SECURITY;
ALTER TABLE metalurgica.planejamento_itens ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- FUNÇÃO AUXILIAR: Verificar acesso à empresa
-- =====================================================

CREATE OR REPLACE FUNCTION metalurgica.check_company_access(p_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.user_companies uc
        WHERE uc.user_id = auth.uid()
        AND uc.company_id = p_company_id
        AND uc.ativo = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- POLÍTICAS PARA PRODUTOS
-- =====================================================

CREATE POLICY "Usuários podem ver produtos da empresa"
    ON metalurgica.produtos FOR SELECT
    USING (metalurgica.check_company_access(company_id));

CREATE POLICY "Usuários podem criar produtos"
    ON metalurgica.produtos FOR INSERT
    WITH CHECK (metalurgica.check_company_access(company_id));

CREATE POLICY "Usuários podem atualizar produtos"
    ON metalurgica.produtos FOR UPDATE
    USING (metalurgica.check_company_access(company_id))
    WITH CHECK (metalurgica.check_company_access(company_id));

CREATE POLICY "Usuários podem deletar produtos"
    ON metalurgica.produtos FOR DELETE
    USING (metalurgica.check_company_access(company_id));

-- =====================================================
-- POLÍTICAS PARA ESTRUTURA DE PRODUTOS
-- =====================================================

CREATE POLICY "Usuários podem ver estrutura de produtos"
    ON metalurgica.estrutura_produtos FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM metalurgica.produtos p
            WHERE p.id = estrutura_produtos.produto_pai_id
            AND metalurgica.check_company_access(p.company_id)
        )
    );

CREATE POLICY "Usuários podem criar estrutura de produtos"
    ON metalurgica.estrutura_produtos FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM metalurgica.produtos p
            WHERE p.id = estrutura_produtos.produto_pai_id
            AND metalurgica.check_company_access(p.company_id)
        )
    );

CREATE POLICY "Usuários podem atualizar estrutura de produtos"
    ON metalurgica.estrutura_produtos FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM metalurgica.produtos p
            WHERE p.id = estrutura_produtos.produto_pai_id
            AND metalurgica.check_company_access(p.company_id)
        )
    );

CREATE POLICY "Usuários podem deletar estrutura de produtos"
    ON metalurgica.estrutura_produtos FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM metalurgica.produtos p
            WHERE p.id = estrutura_produtos.produto_pai_id
            AND metalurgica.check_company_access(p.company_id)
        )
    );

-- =====================================================
-- POLÍTICAS PARA MÁQUINAS
-- =====================================================

CREATE POLICY "Usuários podem ver máquinas da empresa"
    ON metalurgica.maquinas FOR SELECT
    USING (metalurgica.check_company_access(company_id));

CREATE POLICY "Usuários podem criar máquinas"
    ON metalurgica.maquinas FOR INSERT
    WITH CHECK (metalurgica.check_company_access(company_id));

CREATE POLICY "Usuários podem atualizar máquinas"
    ON metalurgica.maquinas FOR UPDATE
    USING (metalurgica.check_company_access(company_id))
    WITH CHECK (metalurgica.check_company_access(company_id));

CREATE POLICY "Usuários podem deletar máquinas"
    ON metalurgica.maquinas FOR DELETE
    USING (metalurgica.check_company_access(company_id));

-- =====================================================
-- POLÍTICAS PARA TIPOS DE PARADA
-- =====================================================

CREATE POLICY "Usuários podem ver tipos de parada da empresa"
    ON metalurgica.tipos_parada FOR SELECT
    USING (metalurgica.check_company_access(company_id));

CREATE POLICY "Usuários podem criar tipos de parada"
    ON metalurgica.tipos_parada FOR INSERT
    WITH CHECK (metalurgica.check_company_access(company_id));

CREATE POLICY "Usuários podem atualizar tipos de parada"
    ON metalurgica.tipos_parada FOR UPDATE
    USING (metalurgica.check_company_access(company_id))
    WITH CHECK (metalurgica.check_company_access(company_id));

CREATE POLICY "Usuários podem deletar tipos de parada"
    ON metalurgica.tipos_parada FOR DELETE
    USING (metalurgica.check_company_access(company_id));

-- =====================================================
-- POLÍTICAS PARA ORDENS DE PRODUÇÃO
-- =====================================================

CREATE POLICY "Usuários podem ver OP da empresa"
    ON metalurgica.ordens_producao FOR SELECT
    USING (metalurgica.check_company_access(company_id));

CREATE POLICY "Usuários podem criar OP"
    ON metalurgica.ordens_producao FOR INSERT
    WITH CHECK (metalurgica.check_company_access(company_id));

CREATE POLICY "Usuários podem atualizar OP"
    ON metalurgica.ordens_producao FOR UPDATE
    USING (metalurgica.check_company_access(company_id))
    WITH CHECK (metalurgica.check_company_access(company_id));

CREATE POLICY "Usuários podem deletar OP"
    ON metalurgica.ordens_producao FOR DELETE
    USING (metalurgica.check_company_access(company_id));

-- =====================================================
-- POLÍTICAS PARA ORDENS DE SERVIÇO
-- =====================================================

CREATE POLICY "Usuários podem ver OS da empresa"
    ON metalurgica.ordens_servico FOR SELECT
    USING (metalurgica.check_company_access(company_id));

CREATE POLICY "Usuários podem criar OS"
    ON metalurgica.ordens_servico FOR INSERT
    WITH CHECK (metalurgica.check_company_access(company_id));

CREATE POLICY "Usuários podem atualizar OS"
    ON metalurgica.ordens_servico FOR UPDATE
    USING (metalurgica.check_company_access(company_id))
    WITH CHECK (metalurgica.check_company_access(company_id));

CREATE POLICY "Usuários podem deletar OS"
    ON metalurgica.ordens_servico FOR DELETE
    USING (metalurgica.check_company_access(company_id));

-- =====================================================
-- POLÍTICAS PARA SOLICITAÇÕES DE MATERIAIS
-- =====================================================

CREATE POLICY "Usuários podem ver solicitações de materiais da empresa"
    ON metalurgica.solicitacoes_materiais FOR SELECT
    USING (metalurgica.check_company_access(company_id));

CREATE POLICY "Usuários podem criar solicitações de materiais"
    ON metalurgica.solicitacoes_materiais FOR INSERT
    WITH CHECK (metalurgica.check_company_access(company_id));

CREATE POLICY "Usuários podem atualizar solicitações de materiais"
    ON metalurgica.solicitacoes_materiais FOR UPDATE
    USING (metalurgica.check_company_access(company_id))
    WITH CHECK (metalurgica.check_company_access(company_id));

CREATE POLICY "Usuários podem deletar solicitações de materiais"
    ON metalurgica.solicitacoes_materiais FOR DELETE
    USING (metalurgica.check_company_access(company_id));

-- =====================================================
-- POLÍTICAS PARA LOTES
-- =====================================================

CREATE POLICY "Usuários podem ver lotes da empresa"
    ON metalurgica.lotes FOR SELECT
    USING (metalurgica.check_company_access(company_id));

CREATE POLICY "Usuários podem criar lotes"
    ON metalurgica.lotes FOR INSERT
    WITH CHECK (metalurgica.check_company_access(company_id));

CREATE POLICY "Usuários podem atualizar lotes"
    ON metalurgica.lotes FOR UPDATE
    USING (metalurgica.check_company_access(company_id))
    WITH CHECK (metalurgica.check_company_access(company_id));

CREATE POLICY "Usuários podem deletar lotes"
    ON metalurgica.lotes FOR DELETE
    USING (metalurgica.check_company_access(company_id));

-- =====================================================
-- POLÍTICAS PARA PARADAS DE PRODUÇÃO
-- =====================================================

CREATE POLICY "Usuários podem ver paradas da empresa"
    ON metalurgica.paradas_producao FOR SELECT
    USING (metalurgica.check_company_access(company_id));

CREATE POLICY "Usuários podem criar paradas"
    ON metalurgica.paradas_producao FOR INSERT
    WITH CHECK (metalurgica.check_company_access(company_id));

CREATE POLICY "Usuários podem atualizar paradas"
    ON metalurgica.paradas_producao FOR UPDATE
    USING (metalurgica.check_company_access(company_id))
    WITH CHECK (metalurgica.check_company_access(company_id));

CREATE POLICY "Usuários podem deletar paradas"
    ON metalurgica.paradas_producao FOR DELETE
    USING (metalurgica.check_company_access(company_id));

-- =====================================================
-- POLÍTICAS PARA GALVANIZAÇÕES
-- =====================================================

CREATE POLICY "Usuários podem ver galvanizações da empresa"
    ON metalurgica.galvanizacoes FOR SELECT
    USING (metalurgica.check_company_access(company_id));

CREATE POLICY "Usuários podem criar galvanizações"
    ON metalurgica.galvanizacoes FOR INSERT
    WITH CHECK (metalurgica.check_company_access(company_id));

CREATE POLICY "Usuários podem atualizar galvanizações"
    ON metalurgica.galvanizacoes FOR UPDATE
    USING (metalurgica.check_company_access(company_id))
    WITH CHECK (metalurgica.check_company_access(company_id));

CREATE POLICY "Usuários podem deletar galvanizações"
    ON metalurgica.galvanizacoes FOR DELETE
    USING (metalurgica.check_company_access(company_id));

-- =====================================================
-- POLÍTICAS PARA ITENS DE GALVANIZAÇÃO
-- =====================================================

CREATE POLICY "Usuários podem ver itens de galvanização"
    ON metalurgica.galvanizacao_itens FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM metalurgica.galvanizacoes g
            WHERE g.id = galvanizacao_itens.galvanizacao_id
            AND metalurgica.check_company_access(g.company_id)
        )
    );

CREATE POLICY "Usuários podem criar itens de galvanização"
    ON metalurgica.galvanizacao_itens FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM metalurgica.galvanizacoes g
            WHERE g.id = galvanizacao_itens.galvanizacao_id
            AND metalurgica.check_company_access(g.company_id)
        )
    );

CREATE POLICY "Usuários podem atualizar itens de galvanização"
    ON metalurgica.galvanizacao_itens FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM metalurgica.galvanizacoes g
            WHERE g.id = galvanizacao_itens.galvanizacao_id
            AND metalurgica.check_company_access(g.company_id)
        )
    );

CREATE POLICY "Usuários podem deletar itens de galvanização"
    ON metalurgica.galvanizacao_itens FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM metalurgica.galvanizacoes g
            WHERE g.id = galvanizacao_itens.galvanizacao_id
            AND metalurgica.check_company_access(g.company_id)
        )
    );

-- =====================================================
-- POLÍTICAS PARA INSPEÇÕES
-- =====================================================

CREATE POLICY "Usuários podem ver inspeções da empresa"
    ON metalurgica.inspecoes FOR SELECT
    USING (metalurgica.check_company_access(company_id));

CREATE POLICY "Usuários podem criar inspeções"
    ON metalurgica.inspecoes FOR INSERT
    WITH CHECK (metalurgica.check_company_access(company_id));

CREATE POLICY "Usuários podem atualizar inspeções"
    ON metalurgica.inspecoes FOR UPDATE
    USING (metalurgica.check_company_access(company_id))
    WITH CHECK (metalurgica.check_company_access(company_id));

CREATE POLICY "Usuários podem deletar inspeções"
    ON metalurgica.inspecoes FOR DELETE
    USING (metalurgica.check_company_access(company_id));

-- =====================================================
-- POLÍTICAS PARA CERTIFICADOS DE QUALIDADE
-- =====================================================

CREATE POLICY "Usuários podem ver certificados da empresa"
    ON metalurgica.certificados_qualidade FOR SELECT
    USING (metalurgica.check_company_access(company_id));

CREATE POLICY "Usuários podem criar certificados"
    ON metalurgica.certificados_qualidade FOR INSERT
    WITH CHECK (metalurgica.check_company_access(company_id));

CREATE POLICY "Usuários podem atualizar certificados"
    ON metalurgica.certificados_qualidade FOR UPDATE
    USING (metalurgica.check_company_access(company_id))
    WITH CHECK (metalurgica.check_company_access(company_id));

CREATE POLICY "Usuários podem deletar certificados"
    ON metalurgica.certificados_qualidade FOR DELETE
    USING (metalurgica.check_company_access(company_id));

-- =====================================================
-- POLÍTICAS PARA NÃO CONFORMIDADES
-- =====================================================

CREATE POLICY "Usuários podem ver não conformidades da empresa"
    ON metalurgica.nao_conformidades FOR SELECT
    USING (metalurgica.check_company_access(company_id));

CREATE POLICY "Usuários podem criar não conformidades"
    ON metalurgica.nao_conformidades FOR INSERT
    WITH CHECK (metalurgica.check_company_access(company_id));

CREATE POLICY "Usuários podem atualizar não conformidades"
    ON metalurgica.nao_conformidades FOR UPDATE
    USING (metalurgica.check_company_access(company_id))
    WITH CHECK (metalurgica.check_company_access(company_id));

CREATE POLICY "Usuários podem deletar não conformidades"
    ON metalurgica.nao_conformidades FOR DELETE
    USING (metalurgica.check_company_access(company_id));

-- =====================================================
-- POLÍTICAS PARA PLANEJAMENTO DE PRODUÇÃO
-- =====================================================

CREATE POLICY "Usuários podem ver planejamento da empresa"
    ON metalurgica.planejamento_producao FOR SELECT
    USING (metalurgica.check_company_access(company_id));

CREATE POLICY "Usuários podem criar planejamento"
    ON metalurgica.planejamento_producao FOR INSERT
    WITH CHECK (metalurgica.check_company_access(company_id));

CREATE POLICY "Usuários podem atualizar planejamento"
    ON metalurgica.planejamento_producao FOR UPDATE
    USING (metalurgica.check_company_access(company_id))
    WITH CHECK (metalurgica.check_company_access(company_id));

CREATE POLICY "Usuários podem deletar planejamento"
    ON metalurgica.planejamento_producao FOR DELETE
    USING (metalurgica.check_company_access(company_id));

-- =====================================================
-- POLÍTICAS PARA ITENS DO PLANEJAMENTO
-- =====================================================

CREATE POLICY "Usuários podem ver itens do planejamento"
    ON metalurgica.planejamento_itens FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM metalurgica.planejamento_producao pp
            WHERE pp.id = planejamento_itens.planejamento_id
            AND metalurgica.check_company_access(pp.company_id)
        )
    );

CREATE POLICY "Usuários podem criar itens do planejamento"
    ON metalurgica.planejamento_itens FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM metalurgica.planejamento_producao pp
            WHERE pp.id = planejamento_itens.planejamento_id
            AND metalurgica.check_company_access(pp.company_id)
        )
    );

CREATE POLICY "Usuários podem atualizar itens do planejamento"
    ON metalurgica.planejamento_itens FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM metalurgica.planejamento_producao pp
            WHERE pp.id = planejamento_itens.planejamento_id
            AND metalurgica.check_company_access(pp.company_id)
        )
    );

CREATE POLICY "Usuários podem deletar itens do planejamento"
    ON metalurgica.planejamento_itens FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM metalurgica.planejamento_producao pp
            WHERE pp.id = planejamento_itens.planejamento_id
            AND metalurgica.check_company_access(pp.company_id)
        )
    );

