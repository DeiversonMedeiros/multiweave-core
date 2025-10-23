-- =====================================================
-- CRIAÇÃO DA TABELA DE NOTIFICAÇÕES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'compensation_request', 
        'compensation_approved', 
        'compensation_rejected', 
        'compensation_reminder',
        'vacation_request',
        'vacation_approved',
        'vacation_rejected',
        'medical_certificate',
        'payroll_processed',
        'system_alert'
    )),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_company_id ON public.notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_company ON public.notifications(user_id, company_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_notifications_updated_at
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();

-- Habilitar RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (
        user_id = auth.uid() AND 
        company_id IN (
            SELECT company_id FROM user_companies 
            WHERE user_id = auth.uid() AND ativo = true
        )
    );

CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (
        user_id = auth.uid() AND 
        company_id IN (
            SELECT company_id FROM user_companies 
            WHERE user_id = auth.uid() AND ativo = true
        )
    );

CREATE POLICY "System can create notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

-- Comentários
COMMENT ON TABLE public.notifications IS 'Tabela de notificações do sistema';
COMMENT ON COLUMN public.notifications.type IS 'Tipo da notificação: compensation_request, compensation_approved, etc.';
COMMENT ON COLUMN public.notifications.data IS 'Dados adicionais da notificação em formato JSON';
COMMENT ON COLUMN public.notifications.is_read IS 'Indica se a notificação foi lida pelo usuário';
