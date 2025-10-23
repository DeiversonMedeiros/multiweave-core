-- Create training settings table
CREATE TABLE IF NOT EXISTS rh.training_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Notificações
    notification_enabled BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT false,
    reminder_days_before INTEGER DEFAULT 3,
    reminder_days_after INTEGER DEFAULT 1,
    
    -- Políticas de Treinamento
    auto_enrollment BOOLEAN DEFAULT false,
    require_approval BOOLEAN DEFAULT true,
    max_participants INTEGER DEFAULT 50,
    min_attendance_percentage INTEGER DEFAULT 80,
    certificate_auto_generate BOOLEAN DEFAULT true,
    certificate_validity_days INTEGER DEFAULT 365,
    
    -- Configurações do Sistema
    training_duration_default DECIMAL(4,2) DEFAULT 8.0, -- em horas
    evaluation_required BOOLEAN DEFAULT true,
    feedback_required BOOLEAN DEFAULT true,
    auto_archive_days INTEGER DEFAULT 90,
    
    -- Configurações de Acesso
    allow_self_enrollment BOOLEAN DEFAULT true,
    allow_cancellation BOOLEAN DEFAULT true,
    cancellation_deadline_hours INTEGER DEFAULT 24,
    
    -- Metadados
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_training_settings_company_id ON rh.training_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_training_settings_active ON rh.training_settings(is_active);

-- Create unique constraint for one settings per company
CREATE UNIQUE INDEX IF NOT EXISTS idx_training_settings_company_unique 
ON rh.training_settings(company_id) 
WHERE is_active = true;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION rh.update_training_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_training_settings_updated_at
    BEFORE UPDATE ON rh.training_settings
    FOR EACH ROW
    EXECUTE FUNCTION rh.update_training_settings_updated_at();

-- Enable RLS
ALTER TABLE rh.training_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view training settings for their company" ON rh.training_settings
    FOR SELECT USING (
        company_id IN (
            SELECT id FROM public.companies 
            WHERE id IN (
                SELECT company_id FROM public.user_companies 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert training settings for their company" ON rh.training_settings
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT id FROM public.companies 
            WHERE id IN (
                SELECT company_id FROM public.user_companies 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update training settings for their company" ON rh.training_settings
    FOR UPDATE USING (
        company_id IN (
            SELECT id FROM public.companies 
            WHERE id IN (
                SELECT company_id FROM public.user_companies 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can delete training settings for their company" ON rh.training_settings
    FOR DELETE USING (
        company_id IN (
            SELECT id FROM public.companies 
            WHERE id IN (
                SELECT company_id FROM public.user_companies 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Create RPC function to get training settings
CREATE OR REPLACE FUNCTION rh.get_training_settings(p_company_id UUID)
RETURNS TABLE (
    id UUID,
    company_id UUID,
    notification_enabled BOOLEAN,
    email_notifications BOOLEAN,
    push_notifications BOOLEAN,
    reminder_days_before INTEGER,
    reminder_days_after INTEGER,
    auto_enrollment BOOLEAN,
    require_approval BOOLEAN,
    max_participants INTEGER,
    min_attendance_percentage INTEGER,
    certificate_auto_generate BOOLEAN,
    certificate_validity_days INTEGER,
    training_duration_default DECIMAL(4,2),
    evaluation_required BOOLEAN,
    feedback_required BOOLEAN,
    auto_archive_days INTEGER,
    allow_self_enrollment BOOLEAN,
    allow_cancellation BOOLEAN,
    cancellation_deadline_hours INTEGER,
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ts.id,
        ts.company_id,
        ts.notification_enabled,
        ts.email_notifications,
        ts.push_notifications,
        ts.reminder_days_before,
        ts.reminder_days_after,
        ts.auto_enrollment,
        ts.require_approval,
        ts.max_participants,
        ts.min_attendance_percentage,
        ts.certificate_auto_generate,
        ts.certificate_validity_days,
        ts.training_duration_default,
        ts.evaluation_required,
        ts.feedback_required,
        ts.auto_archive_days,
        ts.allow_self_enrollment,
        ts.allow_cancellation,
        ts.cancellation_deadline_hours,
        ts.is_active,
        ts.created_at,
        ts.updated_at
    FROM rh.training_settings ts
    WHERE ts.company_id = p_company_id
    AND ts.is_active = true
    ORDER BY ts.updated_at DESC
    LIMIT 1;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION rh.get_training_settings(UUID) TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON rh.training_settings TO authenticated;

-- Insert default settings for existing companies
INSERT INTO rh.training_settings (company_id)
SELECT id FROM public.companies
WHERE id NOT IN (SELECT company_id FROM rh.training_settings WHERE is_active = true)
ON CONFLICT (company_id) WHERE is_active = true DO NOTHING;
