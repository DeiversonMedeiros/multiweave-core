-- =====================================================
-- MIGRAÇÃO: Adicionar campos de condições de pagamento em cotacao_fornecedores
-- Data: 2026-01-21
-- Descrição: Adiciona campos estruturados para condições de pagamento
-- =====================================================

ALTER TABLE compras.cotacao_fornecedores
ADD COLUMN IF NOT EXISTS forma_pagamento VARCHAR(50),
ADD COLUMN IF NOT EXISTS is_parcelada BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS numero_parcelas INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS intervalo_parcelas VARCHAR(20) DEFAULT '30';

-- Comentários
COMMENT ON COLUMN compras.cotacao_fornecedores.forma_pagamento IS 'Forma de pagamento: PIX, Cartão de Crédito, Cartão de Débito, À Vista, Transferência Bancária';
COMMENT ON COLUMN compras.cotacao_fornecedores.is_parcelada IS 'Indica se o pagamento é parcelado';
COMMENT ON COLUMN compras.cotacao_fornecedores.numero_parcelas IS 'Número de parcelas (padrão: 1)';
COMMENT ON COLUMN compras.cotacao_fornecedores.intervalo_parcelas IS 'Intervalo entre parcelas em dias: 30, 60, 90, 120, 150, 180';

-- Criar índice para melhor performance em consultas
CREATE INDEX IF NOT EXISTS idx_cotacao_fornecedores_forma_pagamento 
ON compras.cotacao_fornecedores(forma_pagamento);

-- Validação: Se is_parcelada = false, numero_parcelas deve ser 1
CREATE OR REPLACE FUNCTION compras.validate_cotacao_fornecedor_pagamento()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_parcelada = false AND NEW.numero_parcelas != 1 THEN
        RAISE EXCEPTION 'Se is_parcelada é false, numero_parcelas deve ser 1';
    END IF;
    
    IF NEW.is_parcelada = true AND NEW.numero_parcelas < 2 THEN
        RAISE EXCEPTION 'Se is_parcelada é true, numero_parcelas deve ser >= 2';
    END IF;
    
    IF NEW.intervalo_parcelas NOT IN ('30', '60', '90', '120', '150', '180') THEN
        RAISE EXCEPTION 'intervalo_parcelas deve ser um dos valores: 30, 60, 90, 120, 150, 180';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validação
DROP TRIGGER IF EXISTS trigger_validate_cotacao_fornecedor_pagamento ON compras.cotacao_fornecedores;
CREATE TRIGGER trigger_validate_cotacao_fornecedor_pagamento
    BEFORE INSERT OR UPDATE ON compras.cotacao_fornecedores
    FOR EACH ROW
    EXECUTE FUNCTION compras.validate_cotacao_fornecedor_pagamento();
