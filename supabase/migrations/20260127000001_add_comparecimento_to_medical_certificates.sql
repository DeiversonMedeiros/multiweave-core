-- =====================================================
-- ATESTADO DE COMPARECIMENTO EM MEDICAL_CERTIFICATES
-- =====================================================
-- Campos para atestado de comparecimento e quantidade de horas (decimal).
-- Serão usados posteriormente no cálculo do banco de horas.
-- =====================================================

ALTER TABLE rh.medical_certificates
ADD COLUMN IF NOT EXISTS atestado_comparecimento BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS horas_comparecimento NUMERIC(5,2);

COMMENT ON COLUMN rh.medical_certificates.atestado_comparecimento IS 'Indica se o atestado é de comparecimento (ex.: consulta)';
COMMENT ON COLUMN rh.medical_certificates.horas_comparecimento IS 'Quantidade de horas em decimal para atestado de comparecimento (uso no banco de horas)';

-- Constraint: horas_comparecimento só pode ser preenchido quando atestado_comparecimento = true
-- (opcional: validar no app; no banco permitimos NULL quando não for comparecimento)
-- CHECK (NOT atestado_comparecimento OR horas_comparecimento IS NOT NULL) -- exige horas quando comparecimento
-- Por simplicidade, não forçamos constraint; a regra de negócio pode exigir horas no frontend quando comparecimento = true
