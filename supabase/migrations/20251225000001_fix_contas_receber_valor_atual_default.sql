-- =====================================================
-- FIX: Preencher valor_atual automaticamente em contas_receber
-- =====================================================
-- Data: 2025-12-25
-- Descrição: Garante que valor_atual seja preenchido com valor_original
--            quando uma conta a receber é criada sem valor_atual
-- =====================================================

-- Função para preencher valor_atual antes de inserir
CREATE OR REPLACE FUNCTION financeiro.set_contas_receber_valor_atual()
RETURNS TRIGGER AS $$
BEGIN
    -- Se valor_atual não foi fornecido ou é NULL, usar valor_original
    IF NEW.valor_atual IS NULL THEN
        NEW.valor_atual := NEW.valor_original;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para executar antes de inserir
DROP TRIGGER IF EXISTS trigger_set_contas_receber_valor_atual ON financeiro.contas_receber;
CREATE TRIGGER trigger_set_contas_receber_valor_atual
    BEFORE INSERT ON financeiro.contas_receber
    FOR EACH ROW
    EXECUTE FUNCTION financeiro.set_contas_receber_valor_atual();

-- Comentário
COMMENT ON FUNCTION financeiro.set_contas_receber_valor_atual() IS 
'Função trigger que garante que valor_atual seja preenchido com valor_original quando NULL na inserção de contas a receber.';

