-- =====================================================
-- MIGRAÇÃO: ADICIONAR CAMPOS DE URGÊNCIA E RLS
-- =====================================================
-- Data: 2025-12-12
-- Descrição: Adiciona campos de urgência em contas_pagar e cria políticas RLS
--            para todas as novas tabelas criadas
-- Autor: Sistema MultiWeave Core
-- Módulo: M2 - Contas a Pagar

-- =====================================================
-- 1. ADICIONAR CAMPOS DE URGÊNCIA EM CONTAS_PAGAR
-- =====================================================

ALTER TABLE financeiro.contas_pagar
ADD COLUMN IF NOT EXISTS is_urgente BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS motivo_urgencia TEXT;

-- Constraint: se is_urgente = true, motivo_urgencia é obrigatório
ALTER TABLE financeiro.contas_pagar
ADD CONSTRAINT contas_pagar_urgencia_check 
CHECK (
    (is_urgente = false) OR 
    (is_urgente = true AND motivo_urgencia IS NOT NULL AND LENGTH(TRIM(motivo_urgencia)) > 0)
);

COMMENT ON COLUMN financeiro.contas_pagar.is_urgente IS 'Flag obrigatória indicando se o pagamento é urgente';
COMMENT ON COLUMN financeiro.contas_pagar.motivo_urgencia IS 'Campo obrigatório com motivo da urgência (usado no módulo de Governança M7)';

-- =====================================================
-- 2. POLÍTICAS RLS - RETENÇÕES NA FONTE
-- =====================================================

ALTER TABLE financeiro.retencoes_fonte ENABLE ROW LEVEL SECURITY;

-- Política de SELECT
CREATE POLICY "Users can view retencoes_fonte of their companies"
ON financeiro.retencoes_fonte
FOR SELECT
USING (
    company_id IN (
        SELECT company_id FROM public.user_companies
        WHERE user_id = auth.uid()
    )
);

-- Política de INSERT
CREATE POLICY "Users can create retencoes_fonte in their companies"
ON financeiro.retencoes_fonte
FOR INSERT
WITH CHECK (
    company_id IN (
        SELECT company_id FROM public.user_companies
        WHERE user_id = auth.uid()
    )
);

-- Política de UPDATE
CREATE POLICY "Users can update retencoes_fonte in their companies"
ON financeiro.retencoes_fonte
FOR UPDATE
USING (
    company_id IN (
        SELECT company_id FROM public.user_companies
        WHERE user_id = auth.uid()
    )
);

-- Política de DELETE
CREATE POLICY "Users can delete retencoes_fonte in their companies"
ON financeiro.retencoes_fonte
FOR DELETE
USING (
    company_id IN (
        SELECT company_id FROM public.user_companies
        WHERE user_id = auth.uid()
    )
);

-- =====================================================
-- 3. POLÍTICAS RLS - LOTES DE PAGAMENTO
-- =====================================================

ALTER TABLE financeiro.lotes_pagamento ENABLE ROW LEVEL SECURITY;

-- Política de SELECT
CREATE POLICY "Users can view lotes_pagamento of their companies"
ON financeiro.lotes_pagamento
FOR SELECT
USING (
    company_id IN (
        SELECT company_id FROM public.user_companies
        WHERE user_id = auth.uid()
    )
);

-- Política de INSERT
CREATE POLICY "Users can create lotes_pagamento in their companies"
ON financeiro.lotes_pagamento
FOR INSERT
WITH CHECK (
    company_id IN (
        SELECT company_id FROM public.user_companies
        WHERE user_id = auth.uid()
    )
);

-- Política de UPDATE
CREATE POLICY "Users can update lotes_pagamento in their companies"
ON financeiro.lotes_pagamento
FOR UPDATE
USING (
    company_id IN (
        SELECT company_id FROM public.user_companies
        WHERE user_id = auth.uid()
    )
);

-- Política de DELETE
CREATE POLICY "Users can delete lotes_pagamento in their companies"
ON financeiro.lotes_pagamento
FOR DELETE
USING (
    company_id IN (
        SELECT company_id FROM public.user_companies
        WHERE user_id = auth.uid()
    )
);

-- =====================================================
-- 4. POLÍTICAS RLS - ITENS DE LOTE
-- =====================================================

ALTER TABLE financeiro.lote_pagamento_itens ENABLE ROW LEVEL SECURITY;

-- Política de SELECT
CREATE POLICY "Users can view lote_pagamento_itens of their companies"
ON financeiro.lote_pagamento_itens
FOR SELECT
USING (
    company_id IN (
        SELECT company_id FROM public.user_companies
        WHERE user_id = auth.uid()
    )
);

-- Política de INSERT
CREATE POLICY "Users can create lote_pagamento_itens in their companies"
ON financeiro.lote_pagamento_itens
FOR INSERT
WITH CHECK (
    company_id IN (
        SELECT company_id FROM public.user_companies
        WHERE user_id = auth.uid()
    )
);

-- Política de UPDATE
CREATE POLICY "Users can update lote_pagamento_itens in their companies"
ON financeiro.lote_pagamento_itens
FOR UPDATE
USING (
    company_id IN (
        SELECT company_id FROM public.user_companies
        WHERE user_id = auth.uid()
    )
);

-- Política de DELETE
CREATE POLICY "Users can delete lote_pagamento_itens in their companies"
ON financeiro.lote_pagamento_itens
FOR DELETE
USING (
    company_id IN (
        SELECT company_id FROM public.user_companies
        WHERE user_id = auth.uid()
    )
);

-- =====================================================
-- 5. POLÍTICAS RLS - MOVIMENTAÇÕES BANCÁRIAS
-- =====================================================

ALTER TABLE financeiro.movimentacoes_bancarias ENABLE ROW LEVEL SECURITY;

-- Política de SELECT
CREATE POLICY "Users can view movimentacoes_bancarias of their companies"
ON financeiro.movimentacoes_bancarias
FOR SELECT
USING (
    company_id IN (
        SELECT company_id FROM public.user_companies
        WHERE user_id = auth.uid()
    )
);

-- Política de INSERT
CREATE POLICY "Users can create movimentacoes_bancarias in their companies"
ON financeiro.movimentacoes_bancarias
FOR INSERT
WITH CHECK (
    company_id IN (
        SELECT company_id FROM public.user_companies
        WHERE user_id = auth.uid()
    )
);

-- Política de UPDATE
CREATE POLICY "Users can update movimentacoes_bancarias in their companies"
ON financeiro.movimentacoes_bancarias
FOR UPDATE
USING (
    company_id IN (
        SELECT company_id FROM public.user_companies
        WHERE user_id = auth.uid()
    )
);

-- Política de DELETE
CREATE POLICY "Users can delete movimentacoes_bancarias in their companies"
ON financeiro.movimentacoes_bancarias
FOR DELETE
USING (
    company_id IN (
        SELECT company_id FROM public.user_companies
        WHERE user_id = auth.uid()
    )
);

-- =====================================================
-- 6. POLÍTICAS RLS - CONCILIAÇÕES
-- =====================================================

ALTER TABLE financeiro.conciliacoes_movimentacoes ENABLE ROW LEVEL SECURITY;

-- Política de SELECT
CREATE POLICY "Users can view conciliacoes_movimentacoes of their companies"
ON financeiro.conciliacoes_movimentacoes
FOR SELECT
USING (
    company_id IN (
        SELECT company_id FROM public.user_companies
        WHERE user_id = auth.uid()
    )
);

-- Política de INSERT
CREATE POLICY "Users can create conciliacoes_movimentacoes in their companies"
ON financeiro.conciliacoes_movimentacoes
FOR INSERT
WITH CHECK (
    company_id IN (
        SELECT company_id FROM public.user_companies
        WHERE user_id = auth.uid()
    )
);

-- Política de UPDATE
CREATE POLICY "Users can update conciliacoes_movimentacoes in their companies"
ON financeiro.conciliacoes_movimentacoes
FOR UPDATE
USING (
    company_id IN (
        SELECT company_id FROM public.user_companies
        WHERE user_id = auth.uid()
    )
);

-- Política de DELETE
CREATE POLICY "Users can delete conciliacoes_movimentacoes in their companies"
ON financeiro.conciliacoes_movimentacoes
FOR DELETE
USING (
    company_id IN (
        SELECT company_id FROM public.user_companies
        WHERE user_id = auth.uid()
    )
);

-- =====================================================
-- 7. POLÍTICAS RLS - PENDÊNCIAS
-- =====================================================

ALTER TABLE financeiro.conciliacoes_pendencias ENABLE ROW LEVEL SECURITY;

-- Política de SELECT
CREATE POLICY "Users can view conciliacoes_pendencias of their companies"
ON financeiro.conciliacoes_pendencias
FOR SELECT
USING (
    company_id IN (
        SELECT company_id FROM public.user_companies
        WHERE user_id = auth.uid()
    )
);

-- Política de INSERT
CREATE POLICY "Users can create conciliacoes_pendencias in their companies"
ON financeiro.conciliacoes_pendencias
FOR INSERT
WITH CHECK (
    company_id IN (
        SELECT company_id FROM public.user_companies
        WHERE user_id = auth.uid()
    )
);

-- Política de UPDATE
CREATE POLICY "Users can update conciliacoes_pendencias in their companies"
ON financeiro.conciliacoes_pendencias
FOR UPDATE
USING (
    company_id IN (
        SELECT company_id FROM public.user_companies
        WHERE user_id = auth.uid()
    )
);

-- Política de DELETE
CREATE POLICY "Users can delete conciliacoes_pendencias in their companies"
ON financeiro.conciliacoes_pendencias
FOR DELETE
USING (
    company_id IN (
        SELECT company_id FROM public.user_companies
        WHERE user_id = auth.uid()
    )
);

-- =====================================================
-- 8. POLÍTICAS RLS - SCHEMA TRIBUTÁRIO
-- =====================================================

ALTER TABLE tributario.iss_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE tributario.icms_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE tributario.ipi_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE tributario.pis_cofins_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE tributario.inss_rat_fap_config ENABLE ROW LEVEL SECURITY;

-- Função auxiliar para políticas RLS do schema tributario
CREATE OR REPLACE FUNCTION tributario.check_company_access(p_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_companies
        WHERE user_id = auth.uid()
        AND company_id = p_company_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas para todas as tabelas do schema tributario
DO $$
DECLARE
    v_table_name TEXT;
BEGIN
    FOR v_table_name IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'tributario'
    LOOP
        -- SELECT
        EXECUTE format('
            CREATE POLICY "Users can view %I of their companies"
            ON tributario.%I
            FOR SELECT
            USING (tributario.check_company_access(company_id))
        ', v_table_name, v_table_name);
        
        -- INSERT
        EXECUTE format('
            CREATE POLICY "Users can create %I in their companies"
            ON tributario.%I
            FOR INSERT
            WITH CHECK (tributario.check_company_access(company_id))
        ', v_table_name, v_table_name);
        
        -- UPDATE
        EXECUTE format('
            CREATE POLICY "Users can update %I in their companies"
            ON tributario.%I
            FOR UPDATE
            USING (tributario.check_company_access(company_id))
        ', v_table_name, v_table_name);
        
        -- DELETE
        EXECUTE format('
            CREATE POLICY "Users can delete %I in their companies"
            ON tributario.%I
            FOR DELETE
            USING (tributario.check_company_access(company_id))
        ', v_table_name, v_table_name);
    END LOOP;
END $$;

-- =====================================================
-- 9. GRANTS PARA SCHEMA TRIBUTÁRIO
-- =====================================================

GRANT USAGE ON SCHEMA tributario TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA tributario TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA tributario TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA tributario TO authenticated;

-- =====================================================
-- 10. COMENTÁRIOS FINAIS
-- =====================================================

COMMENT ON CONSTRAINT contas_pagar_urgencia_check ON financeiro.contas_pagar IS 
'Garante que se is_urgente = true, motivo_urgencia é obrigatório e não vazio';

