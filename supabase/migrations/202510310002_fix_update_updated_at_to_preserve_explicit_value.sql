-- =====================================================
-- Fix update_updated_at_column para preservar valor explícito
-- Se updated_at já foi definido explicitamente (diferente de OLD), não sobrescrever com NOW()
-- =====================================================

CREATE OR REPLACE FUNCTION rh.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    -- Se updated_at é NULL, usar NOW()
    -- Se updated_at foi alterado (diferente de OLD.updated_at), preservar valor explícito
    -- Se updated_at não foi alterado (igual a OLD.updated_at), atualizar com NOW()
    IF NEW.updated_at IS NULL THEN
        NEW.updated_at = NOW();
    ELSIF NEW.updated_at = OLD.updated_at THEN
        -- Valor não foi alterado explicitamente, atualizar com NOW()
        NEW.updated_at = NOW();
    -- ELSE: NEW.updated_at != OLD.updated_at, então foi passado explicitamente - preservar
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

