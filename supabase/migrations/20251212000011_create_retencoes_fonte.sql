-- =====================================================
-- MIGRAÇÃO: CRIAR TABELA DE RETENÇÕES NA FONTE
-- =====================================================
-- Data: 2025-12-12
-- Descrição: Cria tabela para registro de retenções na fonte por título a pagar
--            (INSS, IRRF, PIS, COFINS, CSLL, ISS-RF, outros)
-- Autor: Sistema MultiWeave Core
-- Módulo: M2 - Contas a Pagar

-- =====================================================
-- 1. TABELA: RETENÇÕES NA FONTE
-- =====================================================

CREATE TABLE IF NOT EXISTS financeiro.retencoes_fonte (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Vinculação com conta a pagar
    conta_pagar_id UUID NOT NULL REFERENCES financeiro.contas_pagar(id) ON DELETE CASCADE,
    
    -- Tipo de retenção
    tipo_retencao VARCHAR(50) NOT NULL CHECK (tipo_retencao IN (
        'INSS',
        'IRRF',
        'PIS',
        'COFINS',
        'CSLL',
        'ISS_RF', -- ISS Retido na Fonte
        'IRRF_SERVICOS', -- IRRF sobre serviços
        'IRRF_ALUGUEL', -- IRRF sobre aluguel
        'IRRF_DIVIDENDOS', -- IRRF sobre dividendos
        'OUTROS'
    )),
    
    -- Valores
    base_calculo DECIMAL(15,2) NOT NULL CHECK (base_calculo >= 0),
    aliquota DECIMAL(5,4) NOT NULL CHECK (aliquota >= 0 AND aliquota <= 1),
    valor_retencao DECIMAL(15,2) NOT NULL CHECK (valor_retencao >= 0),
    
    -- Informações complementares
    codigo_receita VARCHAR(20), -- Código de receita para DARF (quando aplicável)
    data_recolhimento DATE, -- Data prevista para recolhimento
    data_recolhimento_real DATE, -- Data real de recolhimento
    
    -- Status
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'recolhido', 'cancelado')),
    
    -- Observações
    observacoes TEXT,
    
    -- Metadados
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint: não permitir retenção duplicada do mesmo tipo na mesma conta
    CONSTRAINT retencoes_fonte_unique UNIQUE (conta_pagar_id, tipo_retencao)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_retencoes_fonte_company_id ON financeiro.retencoes_fonte(company_id);
CREATE INDEX IF NOT EXISTS idx_retencoes_fonte_conta_pagar ON financeiro.retencoes_fonte(conta_pagar_id);
CREATE INDEX IF NOT EXISTS idx_retencoes_fonte_tipo ON financeiro.retencoes_fonte(tipo_retencao);
CREATE INDEX IF NOT EXISTS idx_retencoes_fonte_status ON financeiro.retencoes_fonte(status);
CREATE INDEX IF NOT EXISTS idx_retencoes_fonte_data_recolhimento ON financeiro.retencoes_fonte(data_recolhimento);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_retencoes_fonte_updated_at
    BEFORE UPDATE ON financeiro.retencoes_fonte
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- 2. FUNÇÃO: CALCULAR TOTAL DE RETENÇÕES DE UMA CONTA
-- =====================================================

CREATE OR REPLACE FUNCTION financeiro.calcular_total_retencoes(
    p_conta_pagar_id UUID
)
RETURNS DECIMAL(15,2) AS $$
DECLARE
    v_total DECIMAL(15,2);
BEGIN
    SELECT COALESCE(SUM(valor_retencao), 0)
    INTO v_total
    FROM financeiro.retencoes_fonte
    WHERE conta_pagar_id = p_conta_pagar_id
    AND status != 'cancelado';
    
    RETURN v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION financeiro.calcular_total_retencoes(UUID) IS 'Calcula o total de retenções na fonte de uma conta a pagar';

-- =====================================================
-- 3. FUNÇÃO: OBTER RETENÇÕES POR TIPO
-- =====================================================

CREATE OR REPLACE FUNCTION financeiro.obter_retencoes_por_tipo(
    p_conta_pagar_id UUID,
    p_tipo_retencao VARCHAR(50)
)
RETURNS TABLE (
    id UUID,
    tipo_retencao VARCHAR(50),
    base_calculo DECIMAL(15,2),
    aliquota DECIMAL(5,4),
    valor_retencao DECIMAL(15,2),
    status VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.tipo_retencao,
        r.base_calculo,
        r.aliquota,
        r.valor_retencao,
        r.status
    FROM financeiro.retencoes_fonte r
    WHERE r.conta_pagar_id = p_conta_pagar_id
    AND r.tipo_retencao = p_tipo_retencao
    AND r.status != 'cancelado';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION financeiro.obter_retencoes_por_tipo(UUID, VARCHAR) IS 'Retorna retenções de um tipo específico para uma conta a pagar';

-- =====================================================
-- 4. VIEW: RESUMO DE RETENÇÕES POR CONTA A PAGAR
-- =====================================================

CREATE OR REPLACE VIEW financeiro.view_retencoes_resumo AS
SELECT 
    cp.id as conta_pagar_id,
    cp.numero_titulo,
    cp.company_id,
    COUNT(r.id) as total_retencoes,
    COUNT(CASE WHEN r.status = 'pendente' THEN 1 END) as retencoes_pendentes,
    COUNT(CASE WHEN r.status = 'recolhido' THEN 1 END) as retencoes_recolhidas,
    COALESCE(SUM(r.valor_retencao), 0) as valor_total_retencoes,
    COALESCE(SUM(CASE WHEN r.status = 'pendente' THEN r.valor_retencao ELSE 0 END), 0) as valor_pendente,
    COALESCE(SUM(CASE WHEN r.status = 'recolhido' THEN r.valor_retencao ELSE 0 END), 0) as valor_recolhido
FROM financeiro.contas_pagar cp
LEFT JOIN financeiro.retencoes_fonte r ON r.conta_pagar_id = cp.id AND r.status != 'cancelado'
GROUP BY cp.id, cp.numero_titulo, cp.company_id;

COMMENT ON VIEW financeiro.view_retencoes_resumo IS 'Resumo de retenções na fonte por conta a pagar';

-- =====================================================
-- 5. COMENTÁRIOS
-- =====================================================

COMMENT ON TABLE financeiro.retencoes_fonte IS 'Registro de retenções na fonte por título a pagar (INSS, IRRF, PIS, COFINS, CSLL, ISS-RF, outros)';
COMMENT ON COLUMN financeiro.retencoes_fonte.tipo_retencao IS 'Tipo de retenção: INSS, IRRF, PIS, COFINS, CSLL, ISS_RF, IRRF_SERVICOS, IRRF_ALUGUEL, IRRF_DIVIDENDOS, OUTROS';
COMMENT ON COLUMN financeiro.retencoes_fonte.base_calculo IS 'Base de cálculo da retenção';
COMMENT ON COLUMN financeiro.retencoes_fonte.aliquota IS 'Alíquota aplicada (ex: 0.11 = 11%)';
COMMENT ON COLUMN financeiro.retencoes_fonte.valor_retencao IS 'Valor da retenção calculado (base_calculo * aliquota)';
COMMENT ON COLUMN financeiro.retencoes_fonte.codigo_receita IS 'Código de receita para DARF (quando aplicável)';
COMMENT ON COLUMN financeiro.retencoes_fonte.status IS 'Status: pendente (não recolhido), recolhido (já recolhido), cancelado';

