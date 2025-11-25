-- =====================================================
-- TABELA: PARCELAS DE CONTAS A PAGAR
-- Data: 2025-11-15
-- Descrição: Armazena parcelas de contas a pagar
-- =====================================================

-- Tabela de parcelas
CREATE TABLE IF NOT EXISTS financeiro.contas_pagar_parcelas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conta_pagar_id UUID NOT NULL REFERENCES financeiro.contas_pagar(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    numero_parcela INTEGER NOT NULL,
    valor_parcela DECIMAL(15,2) NOT NULL,
    valor_original DECIMAL(15,2) NOT NULL,
    valor_atual DECIMAL(15,2) NOT NULL,
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    valor_desconto DECIMAL(15,2) DEFAULT 0,
    valor_juros DECIMAL(15,2) DEFAULT 0,
    valor_multa DECIMAL(15,2) DEFAULT 0,
    valor_pago DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'pago', 'vencido', 'cancelado')),
    numero_titulo VARCHAR(50),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT contas_pagar_parcelas_unique UNIQUE (conta_pagar_id, numero_parcela)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_contas_pagar_parcelas_conta_pagar_id ON financeiro.contas_pagar_parcelas(conta_pagar_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_parcelas_company_id ON financeiro.contas_pagar_parcelas(company_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_parcelas_data_vencimento ON financeiro.contas_pagar_parcelas(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_parcelas_status ON financeiro.contas_pagar_parcelas(status);

-- Adicionar campo para indicar se a conta é parcelada
ALTER TABLE financeiro.contas_pagar 
ADD COLUMN IF NOT EXISTS is_parcelada BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS numero_parcelas INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS intervalo_parcelas VARCHAR(20) DEFAULT 'mensal' CHECK (intervalo_parcelas IN ('diario', 'semanal', 'quinzenal', 'mensal', 'bimestral', 'trimestral', 'semestral', 'anual')),
ADD COLUMN IF NOT EXISTS conta_pagar_principal_id UUID REFERENCES financeiro.contas_pagar(id);

-- Comentários
COMMENT ON TABLE financeiro.contas_pagar_parcelas IS 'Parcelas de contas a pagar';
COMMENT ON COLUMN financeiro.contas_pagar.is_parcelada IS 'Indica se a conta é parcelada';
COMMENT ON COLUMN financeiro.contas_pagar.numero_parcelas IS 'Número total de parcelas';
COMMENT ON COLUMN financeiro.contas_pagar.intervalo_parcelas IS 'Intervalo entre parcelas';
COMMENT ON COLUMN financeiro.contas_pagar.conta_pagar_principal_id IS 'ID da conta principal (se for parcela)';

-- Trigger para atualizar updated_at
CREATE TRIGGER update_contas_pagar_parcelas_updated_at
    BEFORE UPDATE ON financeiro.contas_pagar_parcelas
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- Função para gerar número de título para parcela
CREATE OR REPLACE FUNCTION financeiro.generate_titulo_number_parcela(
    p_conta_pagar_id UUID,
    p_numero_parcela INTEGER
)
RETURNS VARCHAR(50)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_numero_titulo_base VARCHAR(50);
    v_numero_titulo VARCHAR(50);
BEGIN
    -- Buscar número do título base da conta principal
    SELECT numero_titulo INTO v_numero_titulo_base
    FROM financeiro.contas_pagar
    WHERE id = p_conta_pagar_id;
    
    -- Formatar número do título da parcela
    v_numero_titulo := v_numero_titulo_base || '/P' || LPAD(p_numero_parcela::TEXT, 2, '0');
    
    RETURN v_numero_titulo;
END;
$$;

-- Função wrapper no schema public para acesso via RPC
CREATE OR REPLACE FUNCTION public.generate_titulo_number_parcela(
    p_conta_pagar_id UUID,
    p_numero_parcela INTEGER
)
RETURNS VARCHAR(50)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN financeiro.generate_titulo_number_parcela(p_conta_pagar_id, p_numero_parcela);
END;
$$;

-- Grant permissões
GRANT ALL ON TABLE financeiro.contas_pagar_parcelas TO authenticated;
GRANT EXECUTE ON FUNCTION financeiro.generate_titulo_number_parcela(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_titulo_number_parcela(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_titulo_number_parcela(UUID, INTEGER) TO anon;

