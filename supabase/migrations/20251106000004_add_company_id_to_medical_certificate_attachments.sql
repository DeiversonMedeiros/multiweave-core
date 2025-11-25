-- =====================================================
-- Add company_id to rh.medical_certificate_attachments
-- =====================================================

-- Adicionar coluna company_id para compatibilidade com create_entity_data
ALTER TABLE rh.medical_certificate_attachments
ADD COLUMN IF NOT EXISTS company_id UUID;

-- Vincular à tabela companies (se existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_schema = 'rh'
      AND constraint_name = 'fk_med_cert_attachments_company_id'
  ) THEN
    ALTER TABLE rh.medical_certificate_attachments
    ADD CONSTRAINT fk_med_cert_attachments_company_id
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Popular company_id a partir do certificado, quando possível
UPDATE rh.medical_certificate_attachments a
SET company_id = c.company_id
FROM rh.medical_certificates c
WHERE a.company_id IS NULL
  AND a.certificate_id = c.id;

-- Tornar NOT NULL se não houver linhas sem valor (idempotente)
DO $$
DECLARE
  missing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing_count
  FROM rh.medical_certificate_attachments
  WHERE company_id IS NULL;

  IF missing_count = 0 THEN
    ALTER TABLE rh.medical_certificate_attachments
    ALTER COLUMN company_id SET NOT NULL;
  END IF;
END $$;

-- Índice para company_id
CREATE INDEX IF NOT EXISTS idx_med_cert_attachments_company_id
ON rh.medical_certificate_attachments(company_id);


