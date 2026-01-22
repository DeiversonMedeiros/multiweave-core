-- =====================================================
-- TRIGGER: Marcar automaticamente como concluído quando percentual >= 100
-- =====================================================

CREATE OR REPLACE FUNCTION rh.auto_mark_training_progress_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Se o percentual chegou a 100% ou mais, marcar como concluído
    IF NEW.percentual_concluido >= 100 AND (OLD.percentual_concluido IS NULL OR OLD.percentual_concluido < 100) THEN
        NEW.concluido := true;
        NEW.status := 'concluido';
        IF NEW.data_conclusao IS NULL THEN
            NEW.data_conclusao := NOW();
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS trigger_auto_mark_training_progress_completed ON rh.training_progress;

-- Criar trigger
CREATE TRIGGER trigger_auto_mark_training_progress_completed
    BEFORE UPDATE ON rh.training_progress
    FOR EACH ROW
    EXECUTE FUNCTION rh.auto_mark_training_progress_completed();
