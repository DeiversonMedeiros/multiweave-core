-- =====================================================
-- Gerar assinaturas de ponto - ESTRATEGIC - Janeiro/2026
-- =====================================================
-- Atualiza apenas as folhas ainda pendentes de jan/2026 da empresa Estrategic
-- (as que já estão assinadas permanecem inalteradas).
-- definindo data/hora de assinatura aleatória entre 05/02/2026 e 10/02/2026,
-- com horários entre 08:00 e 20:00.
-- Colunas atualizadas: signature_timestamp, signature_data, status = 'signed'
-- =====================================================

-- Data: aleatória entre 05/02/2026 e 10/02/2026 (inclusive)
-- Hora: aleatória entre 08:00 e 20:00
-- random() gera valor diferente por linha

UPDATE rh.time_record_signatures trs
SET
    signature_timestamp = (
        (
            (date '2026-02-05' + (floor(random() * 6)::int))
            + (time '08:00' + (random() * interval '12 hours'))
        )::timestamp AT TIME ZONE 'UTC'
    ),
    signature_data = jsonb_build_object(
        'source', 'script',
        'generated_at', now(),
        'note', 'Assinatura gerada por script - jan/2026 Estrategic'
    ),
    status = 'signed',
    updated_at = now()
FROM companies c
WHERE trs.company_id = c.id
  AND c.nome_fantasia = 'ESTRATEGIC'
  AND trs.month_year = '2026-01'
  AND trs.status = 'pending';

-- Conferência: quantidade atualizada
-- SELECT COUNT(*) FROM rh.time_record_signatures trs
-- JOIN companies c ON c.id = trs.company_id
-- WHERE c.nome_fantasia = 'ESTRATEGIC' AND trs.month_year = '2026-01' AND trs.status = 'signed';
