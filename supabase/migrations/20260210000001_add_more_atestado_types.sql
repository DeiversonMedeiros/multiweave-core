-- Permitir mais tipos de atestado em rh.medical_certificates (óbito, forças militares, poder judiciário, etc.)
-- O nome da constraint no PostgreSQL costuma ser: medical_certificates_tipo_atestado_check
ALTER TABLE rh.medical_certificates
  DROP CONSTRAINT IF EXISTS medical_certificates_tipo_atestado_check;

ALTER TABLE rh.medical_certificates
  ADD CONSTRAINT medical_certificates_tipo_atestado_check
  CHECK (tipo_atestado IN (
    'medico',
    'odontologico',
    'psicologico',
    'obito',
    'forcas_militares',
    'poder_judiciario',
    'servico_publico',
    'outros'
  ));

COMMENT ON COLUMN rh.medical_certificates.tipo_atestado IS 'Tipo do atestado: medico, odontologico, psicologico, obito, forcas_militares, poder_judiciario, servico_publico, outros';
