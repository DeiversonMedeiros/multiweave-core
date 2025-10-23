-- =====================================================
-- MELHORIAS NA TABELA MEDICAL_CERTIFICATES
-- =====================================================

-- Adicionar campos faltantes na tabela medical_certificates
ALTER TABLE rh.medical_certificates 
ADD COLUMN IF NOT EXISTS medico_nome VARCHAR(255),
ADD COLUMN IF NOT EXISTS crm_crmo VARCHAR(50),
ADD COLUMN IF NOT EXISTS especialidade VARCHAR(255),
ADD COLUMN IF NOT EXISTS tipo_atestado VARCHAR(50) DEFAULT 'medico' 
  CHECK (tipo_atestado IN ('medico', 'odontologico', 'psicologico')),
ADD COLUMN IF NOT EXISTS valor_beneficio DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS data_aprovacao TIMESTAMP WITH TIME ZONE;

-- Atualizar constraint de status para incluir novos status
ALTER TABLE rh.medical_certificates 
DROP CONSTRAINT IF EXISTS medical_certificates_status_check;

ALTER TABLE rh.medical_certificates 
ADD CONSTRAINT medical_certificates_status_check 
CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'em_andamento', 'concluido'));

-- Adicionar trigger para calcular dias_afastamento automaticamente
CREATE OR REPLACE FUNCTION calculate_medical_certificate_days()
RETURNS TRIGGER AS $$
BEGIN
  -- Calcular dias de afastamento automaticamente
  NEW.dias_afastamento = EXTRACT(DAY FROM (NEW.data_fim - NEW.data_inicio)) + 1;
  
  -- Atualizar data_aprovacao quando status for aprovado
  IF NEW.status = 'aprovado' AND OLD.status != 'aprovado' THEN
    NEW.data_aprovacao = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para cálculo automático
DROP TRIGGER IF EXISTS trigger_calculate_medical_certificate_days ON rh.medical_certificates;
CREATE TRIGGER trigger_calculate_medical_certificate_days
  BEFORE INSERT OR UPDATE ON rh.medical_certificates
  FOR EACH ROW
  EXECUTE FUNCTION calculate_medical_certificate_days();

-- Criar tabela de anexos de atestados médicos
CREATE TABLE IF NOT EXISTS rh.medical_certificate_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID NOT NULL REFERENCES rh.medical_certificates(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50),
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_medical_certificates_employee_id ON rh.medical_certificates(employee_id);
CREATE INDEX IF NOT EXISTS idx_medical_certificates_company_id ON rh.medical_certificates(company_id);
CREATE INDEX IF NOT EXISTS idx_medical_certificates_status ON rh.medical_certificates(status);
CREATE INDEX IF NOT EXISTS idx_medical_certificates_data_inicio ON rh.medical_certificates(data_inicio);
CREATE INDEX IF NOT EXISTS idx_medical_certificates_tipo_atestado ON rh.medical_certificates(tipo_atestado);
CREATE INDEX IF NOT EXISTS idx_medical_certificate_attachments_certificate_id ON rh.medical_certificate_attachments(certificate_id);

-- Habilitar RLS na tabela de anexos
ALTER TABLE rh.medical_certificate_attachments ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para anexos
CREATE POLICY "Users can view medical certificate attachments from their company" 
ON rh.medical_certificate_attachments FOR SELECT 
USING (
  certificate_id IN (
    SELECT id FROM rh.medical_certificates 
    WHERE user_has_company_access(company_id)
  )
);

CREATE POLICY "Users can insert medical certificate attachments in their company" 
ON rh.medical_certificate_attachments FOR INSERT 
WITH CHECK (
  certificate_id IN (
    SELECT id FROM rh.medical_certificates 
    WHERE user_has_company_access(company_id)
  )
);

CREATE POLICY "Users can update medical certificate attachments from their company" 
ON rh.medical_certificate_attachments FOR UPDATE 
USING (
  certificate_id IN (
    SELECT id FROM rh.medical_certificates 
    WHERE user_has_company_access(company_id)
  )
);

CREATE POLICY "Users can delete medical certificate attachments from their company" 
ON rh.medical_certificate_attachments FOR DELETE 
USING (
  certificate_id IN (
    SELECT id FROM rh.medical_certificates 
    WHERE user_has_company_access(company_id)
  )
);

-- Comentários na tabela
COMMENT ON TABLE rh.medical_certificates IS 'Tabela de atestados médicos dos funcionários';
COMMENT ON COLUMN rh.medical_certificates.medico_nome IS 'Nome do médico que emitiu o atestado';
COMMENT ON COLUMN rh.medical_certificates.crm_crmo IS 'CRM/CRMO do médico';
COMMENT ON COLUMN rh.medical_certificates.especialidade IS 'Especialidade médica';
COMMENT ON COLUMN rh.medical_certificates.tipo_atestado IS 'Tipo do atestado: medico, odontologico, psicologico';
COMMENT ON COLUMN rh.medical_certificates.valor_beneficio IS 'Valor do benefício a ser pago';
COMMENT ON COLUMN rh.medical_certificates.data_aprovacao IS 'Data de aprovação do atestado';

COMMENT ON TABLE rh.medical_certificate_attachments IS 'Anexos dos atestados médicos';
COMMENT ON COLUMN rh.medical_certificate_attachments.certificate_id IS 'ID do atestado médico';
COMMENT ON COLUMN rh.medical_certificate_attachments.file_name IS 'Nome do arquivo anexado';
COMMENT ON COLUMN rh.medical_certificate_attachments.file_url IS 'URL do arquivo no storage';
COMMENT ON COLUMN rh.medical_certificate_attachments.file_type IS 'Tipo do arquivo (PDF, JPG, etc.)';
COMMENT ON COLUMN rh.medical_certificate_attachments.file_size IS 'Tamanho do arquivo em bytes';
