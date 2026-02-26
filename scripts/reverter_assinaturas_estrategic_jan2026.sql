-- =====================================================
-- Reverter assinaturas de ponto - ESTRATEGIC - Janeiro/2026
-- =====================================================
-- Desfaz o script gerar_assinaturas_estrategic_jan2026.sql:
-- Coloca de volta em "pendente" as assinaturas de jan/2026 da empresa Estrategic
-- que foram assinadas por aquele script (limpa signature_timestamp e signature_data).
-- =====================================================

UPDATE rh.time_record_signatures trs
SET
    signature_timestamp = NULL,
    signature_data = NULL,
    status = 'pending',
    updated_at = now()
FROM companies c
WHERE trs.company_id = c.id
  AND c.nome_fantasia = 'ESTRATEGIC'
  AND trs.month_year = '2026-01'
  AND trs.status = 'signed';

-- Conferência: quantidade que voltou a pendente
-- SELECT COUNT(*) FROM rh.time_record_signatures trs
-- JOIN companies c ON c.id = trs.company_id
-- WHERE c.nome_fantasia = 'ESTRATEGIC' AND trs.month_year = '2026-01' AND trs.status = 'pending';
