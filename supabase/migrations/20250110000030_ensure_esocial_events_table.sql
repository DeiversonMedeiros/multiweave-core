-- =====================================================
-- MIGRAÇÃO: GARANTIR TABELA DE EVENTOS eSOCIAL COMPLETA
-- =====================================================
-- Data: 2025-01-10
-- Descrição: Garante que a tabela de eventos eSocial tenha todas as colunas necessárias

-- Verificar se a tabela existe, se não, criar
CREATE TABLE IF NOT EXISTS rh.esocial_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES rh.esocial_batches(id),
    tipo_evento VARCHAR(10) NOT NULL,
    codigo_evento VARCHAR(50),
    numero_recibo VARCHAR(100),
    descricao TEXT,
    employee_id UUID REFERENCES rh.employees(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'accepted', 'rejected', 'error')),
    xml_content TEXT,
    xml_response TEXT,
    protocol_number VARCHAR(100),
    data_envio TIMESTAMP WITH TIME ZONE,
    data_processamento TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Adicionar colunas que podem estar faltando
DO $$ 
BEGIN
    -- Adicionar coluna batch_id se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'rh' 
                   AND table_name = 'esocial_events' 
                   AND column_name = 'batch_id') THEN
        ALTER TABLE rh.esocial_events ADD COLUMN batch_id UUID REFERENCES rh.esocial_batches(id);
    END IF;

    -- Adicionar coluna employee_id se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'rh' 
                   AND table_name = 'esocial_events' 
                   AND column_name = 'employee_id') THEN
        ALTER TABLE rh.esocial_events ADD COLUMN employee_id UUID REFERENCES rh.employees(id) ON DELETE CASCADE;
    END IF;

    -- Adicionar coluna numero_recibo se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'rh' 
                   AND table_name = 'esocial_events' 
                   AND column_name = 'numero_recibo') THEN
        ALTER TABLE rh.esocial_events ADD COLUMN numero_recibo VARCHAR(100);
    END IF;

    -- Adicionar coluna protocol_number se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'rh' 
                   AND table_name = 'esocial_events' 
                   AND column_name = 'protocol_number') THEN
        ALTER TABLE rh.esocial_events ADD COLUMN protocol_number VARCHAR(100);
    END IF;

    -- Adicionar coluna data_processamento se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'rh' 
                   AND table_name = 'esocial_events' 
                   AND column_name = 'data_processamento') THEN
        ALTER TABLE rh.esocial_events ADD COLUMN data_processamento TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Adicionar coluna error_message se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'rh' 
                   AND table_name = 'esocial_events' 
                   AND column_name = 'error_message') THEN
        ALTER TABLE rh.esocial_events ADD COLUMN error_message TEXT;
    END IF;

    -- Adicionar coluna observacoes se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'rh' 
                   AND table_name = 'esocial_events' 
                   AND column_name = 'observacoes') THEN
        ALTER TABLE rh.esocial_events ADD COLUMN observacoes TEXT;
    END IF;

    -- Adicionar coluna created_by se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'rh' 
                   AND table_name = 'esocial_events' 
                   AND column_name = 'created_by') THEN
        ALTER TABLE rh.esocial_events ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;

    -- Adicionar coluna updated_by se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'rh' 
                   AND table_name = 'esocial_events' 
                   AND column_name = 'updated_by') THEN
        ALTER TABLE rh.esocial_events ADD COLUMN updated_by UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Comentários da tabela
COMMENT ON TABLE rh.esocial_events IS 'Tabela para gerenciar eventos do eSocial';
COMMENT ON COLUMN rh.esocial_events.batch_id IS 'ID do lote ao qual o evento pertence';
COMMENT ON COLUMN rh.esocial_events.tipo_evento IS 'Tipo do evento eSocial (ex: S-1000, S-1200)';
COMMENT ON COLUMN rh.esocial_events.codigo_evento IS 'Código específico do evento';
COMMENT ON COLUMN rh.esocial_events.numero_recibo IS 'Número do recibo de envio';
COMMENT ON COLUMN rh.esocial_events.descricao IS 'Descrição do evento';
COMMENT ON COLUMN rh.esocial_events.employee_id IS 'ID do funcionário relacionado ao evento';
COMMENT ON COLUMN rh.esocial_events.status IS 'Status do evento: pending, sending, sent, accepted, rejected, error';
COMMENT ON COLUMN rh.esocial_events.xml_content IS 'Conteúdo XML do evento';
COMMENT ON COLUMN rh.esocial_events.xml_response IS 'Resposta XML do eSocial';
COMMENT ON COLUMN rh.esocial_events.protocol_number IS 'Número do protocolo de envio';
COMMENT ON COLUMN rh.esocial_events.data_envio IS 'Data e hora do envio';
COMMENT ON COLUMN rh.esocial_events.data_processamento IS 'Data e hora do processamento';
COMMENT ON COLUMN rh.esocial_events.error_message IS 'Mensagem de erro, se houver';
COMMENT ON COLUMN rh.esocial_events.observacoes IS 'Observações adicionais sobre o evento';

-- Criar índices se não existirem
CREATE INDEX IF NOT EXISTS idx_esocial_events_company_id ON rh.esocial_events(company_id);
CREATE INDEX IF NOT EXISTS idx_esocial_events_batch_id ON rh.esocial_events(batch_id);
CREATE INDEX IF NOT EXISTS idx_esocial_events_tipo_evento ON rh.esocial_events(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_esocial_events_status ON rh.esocial_events(status);
CREATE INDEX IF NOT EXISTS idx_esocial_events_employee_id ON rh.esocial_events(employee_id);
CREATE INDEX IF NOT EXISTS idx_esocial_events_created_at ON rh.esocial_events(created_at);
CREATE INDEX IF NOT EXISTS idx_esocial_events_data_envio ON rh.esocial_events(data_envio);

-- Criar trigger para updated_at se não existir
CREATE OR REPLACE FUNCTION rh.update_esocial_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verificar se o trigger já existe antes de criar
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_esocial_events_updated_at') THEN
        CREATE TRIGGER trigger_update_esocial_events_updated_at
            BEFORE UPDATE ON rh.esocial_events
            FOR EACH ROW
            EXECUTE FUNCTION rh.update_esocial_events_updated_at();
    END IF;
END $$;

-- Habilitar RLS se não estiver habilitado
ALTER TABLE rh.esocial_events ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS se não existirem
DO $$ 
BEGIN
    -- Política de SELECT
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'esocial_events' AND policyname = 'Users can view esocial_events from their company') THEN
        CREATE POLICY "Users can view esocial_events from their company" ON rh.esocial_events
            FOR SELECT USING (
                company_id IN (
                    SELECT id FROM public.companies 
                    WHERE id IN (
                        SELECT company_id FROM public.user_companies 
                        WHERE user_id = auth.uid()
                    )
                )
            );
    END IF;

    -- Política de INSERT
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'esocial_events' AND policyname = 'Users can insert esocial_events in their company') THEN
        CREATE POLICY "Users can insert esocial_events in their company" ON rh.esocial_events
            FOR INSERT WITH CHECK (
                company_id IN (
                    SELECT id FROM public.companies 
                    WHERE id IN (
                        SELECT company_id FROM public.user_companies 
                        WHERE user_id = auth.uid()
                    )
                )
            );
    END IF;

    -- Política de UPDATE
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'esocial_events' AND policyname = 'Users can update esocial_events in their company') THEN
        CREATE POLICY "Users can update esocial_events in their company" ON rh.esocial_events
            FOR UPDATE USING (
                company_id IN (
                    SELECT id FROM public.companies 
                    WHERE id IN (
                        SELECT company_id FROM public.user_companies 
                        WHERE user_id = auth.uid()
                    )
                )
            );
    END IF;

    -- Política de DELETE
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'esocial_events' AND policyname = 'Users can delete esocial_events in their company') THEN
        CREATE POLICY "Users can delete esocial_events in their company" ON rh.esocial_events
            FOR DELETE USING (
                company_id IN (
                    SELECT id FROM public.companies 
                    WHERE id IN (
                        SELECT company_id FROM public.user_companies 
                        WHERE user_id = auth.uid()
                    )
                )
            );
    END IF;
END $$;
