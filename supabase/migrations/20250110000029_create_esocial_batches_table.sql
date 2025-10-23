-- =====================================================
-- MIGRAÇÃO: CRIAR TABELA DE LOTES eSOCIAL
-- =====================================================
-- Data: 2025-01-10
-- Descrição: Cria tabela para gerenciar lotes de envio do eSocial

-- Criar tabela de lotes eSocial
CREATE TABLE IF NOT EXISTS rh.esocial_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    batch_number VARCHAR(50) NOT NULL,
    period VARCHAR(7) NOT NULL, -- Formato: YYYY-MM
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'accepted', 'rejected', 'error')),
    total_events INTEGER NOT NULL DEFAULT 0,
    sent_events INTEGER NOT NULL DEFAULT 0,
    accepted_events INTEGER NOT NULL DEFAULT 0,
    rejected_events INTEGER NOT NULL DEFAULT 0,
    error_events INTEGER NOT NULL DEFAULT 0,
    xml_content TEXT,
    xml_response TEXT,
    protocol_number VARCHAR(100),
    sent_at TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Comentários da tabela
COMMENT ON TABLE rh.esocial_batches IS 'Tabela para gerenciar lotes de envio do eSocial';
COMMENT ON COLUMN rh.esocial_batches.batch_number IS 'Número único do lote';
COMMENT ON COLUMN rh.esocial_batches.period IS 'Período de referência no formato YYYY-MM';
COMMENT ON COLUMN rh.esocial_batches.status IS 'Status do lote: pending, sending, sent, accepted, rejected, error';
COMMENT ON COLUMN rh.esocial_batches.total_events IS 'Total de eventos no lote';
COMMENT ON COLUMN rh.esocial_batches.sent_events IS 'Eventos enviados com sucesso';
COMMENT ON COLUMN rh.esocial_batches.accepted_events IS 'Eventos aceitos pelo eSocial';
COMMENT ON COLUMN rh.esocial_batches.rejected_events IS 'Eventos rejeitados pelo eSocial';
COMMENT ON COLUMN rh.esocial_batches.error_events IS 'Eventos com erro';
COMMENT ON COLUMN rh.esocial_batches.xml_content IS 'Conteúdo XML do lote';
COMMENT ON COLUMN rh.esocial_batches.xml_response IS 'Resposta XML do eSocial';
COMMENT ON COLUMN rh.esocial_batches.protocol_number IS 'Número do protocolo de envio';
COMMENT ON COLUMN rh.esocial_batches.sent_at IS 'Data e hora do envio';
COMMENT ON COLUMN rh.esocial_batches.processed_at IS 'Data e hora do processamento';
COMMENT ON COLUMN rh.esocial_batches.error_message IS 'Mensagem de erro, se houver';

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_esocial_batches_company_id ON rh.esocial_batches(company_id);
CREATE INDEX IF NOT EXISTS idx_esocial_batches_batch_number ON rh.esocial_batches(batch_number);
CREATE INDEX IF NOT EXISTS idx_esocial_batches_period ON rh.esocial_batches(period);
CREATE INDEX IF NOT EXISTS idx_esocial_batches_status ON rh.esocial_batches(status);
CREATE INDEX IF NOT EXISTS idx_esocial_batches_created_at ON rh.esocial_batches(created_at);
CREATE INDEX IF NOT EXISTS idx_esocial_batches_sent_at ON rh.esocial_batches(sent_at);

-- Criar trigger para updated_at
CREATE OR REPLACE FUNCTION rh.update_esocial_batches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_esocial_batches_updated_at
    BEFORE UPDATE ON rh.esocial_batches
    FOR EACH ROW
    EXECUTE FUNCTION rh.update_esocial_batches_updated_at();

-- Habilitar RLS
ALTER TABLE rh.esocial_batches ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Users can view esocial_batches from their company" ON rh.esocial_batches
    FOR SELECT USING (
        company_id IN (
            SELECT id FROM public.companies 
            WHERE id IN (
                SELECT company_id FROM public.user_companies 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert esocial_batches in their company" ON rh.esocial_batches
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT id FROM public.companies 
            WHERE id IN (
                SELECT company_id FROM public.user_companies 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update esocial_batches in their company" ON rh.esocial_batches
    FOR UPDATE USING (
        company_id IN (
            SELECT id FROM public.companies 
            WHERE id IN (
                SELECT company_id FROM public.user_companies 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can delete esocial_batches in their company" ON rh.esocial_batches
    FOR DELETE USING (
        company_id IN (
            SELECT id FROM public.companies 
            WHERE id IN (
                SELECT company_id FROM public.user_companies 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Inserir dados de exemplo (opcional)
INSERT INTO rh.esocial_batches (company_id, batch_number, period, status, total_events, sent_events, accepted_events, rejected_events, error_events, created_at)
SELECT 
    c.id,
    'LOTE-2024-12-001',
    '2024-12',
    'pending',
    0,
    0,
    0,
    0,
    0,
    NOW()
FROM public.companies c
WHERE c.id IN (
    SELECT company_id FROM public.user_companies 
    WHERE user_id = auth.uid()
)
LIMIT 1
ON CONFLICT DO NOTHING;
