-- =====================================================
-- CORRIGIR CÁLCULO DE DIAS EM rh.medical_certificates
-- =====================================================
-- Ajusta a função/trigger para evitar EXTRACT em integer

CREATE OR REPLACE FUNCTION calculate_medical_certificate_days()
RETURNS TRIGGER AS $$
BEGIN
  -- Para datas (date), a subtração retorna integer (dias). Some +1 para incluir o dia inicial
  NEW.dias_afastamento = (NEW.data_fim - NEW.data_inicio) + 1;

  -- Atualizar data_aprovacao quando status for aprovado
  IF TG_OP = 'UPDATE' AND NEW.status = 'aprovado' AND COALESCE(OLD.status, '') <> 'aprovado' THEN
    NEW.data_aprovacao = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Garantir trigger apontando para a função corrigida
DROP TRIGGER IF EXISTS trigger_calculate_medical_certificate_days ON rh.medical_certificates;
CREATE TRIGGER trigger_calculate_medical_certificate_days
  BEFORE INSERT OR UPDATE ON rh.medical_certificates
  FOR EACH ROW
  EXECUTE FUNCTION calculate_medical_certificate_days();


