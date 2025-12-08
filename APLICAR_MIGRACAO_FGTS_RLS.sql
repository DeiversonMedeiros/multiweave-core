-- =====================================================
-- GARANTIR QUE AS POLITICAS RLS ESTAO CORRETAS PARA FGTS_CONFIG
-- =====================================================

-- Verificar se a tabela existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_schema = 'rh' AND table_name = 'fgts_config') THEN
        RAISE EXCEPTION 'Tabela rh.fgts_config nao existe';
    END IF;
END $$;

-- Remover politicas antigas se existirem
DROP POLICY IF EXISTS "Users can view fgts_config from their company" ON rh.fgts_config;
DROP POLICY IF EXISTS "Users can insert fgts_config in their company" ON rh.fgts_config;
DROP POLICY IF EXISTS "Users can update fgts_config from their company" ON rh.fgts_config;
DROP POLICY IF EXISTS "Users can delete fgts_config from their company" ON rh.fgts_config;

-- Criar politicas atualizadas que usam get_user_companies e check_access_permission
CREATE POLICY "Users can view fgts_config from their company" ON rh.fgts_config
    FOR SELECT USING (
        (company_id = ANY (get_user_companies())) 
        AND check_access_permission('rh'::text, 'fgts_config'::text, 'read'::text)
    );

CREATE POLICY "Users can insert fgts_config in their company" ON rh.fgts_config
    FOR INSERT WITH CHECK (
        (company_id = ANY (get_user_companies())) 
        AND check_access_permission('rh'::text, 'fgts_config'::text, 'create'::text)
    );

CREATE POLICY "Users can update fgts_config from their company" ON rh.fgts_config
    FOR UPDATE USING (
        (company_id = ANY (get_user_companies())) 
        AND check_access_permission('rh'::text, 'fgts_config'::text, 'edit'::text)
    );

CREATE POLICY "Users can delete fgts_config from their company" ON rh.fgts_config
    FOR DELETE USING (
        (company_id = ANY (get_user_companies())) 
        AND check_access_permission('rh'::text, 'fgts_config'::text, 'delete'::text)
    );

-- Garantir que RLS esta habilitado
ALTER TABLE rh.fgts_config ENABLE ROW LEVEL SECURITY;

-- Verificacao final
SELECT 
    'Politicas RLS aplicadas' as status,
    COUNT(*) as total_politicas
FROM pg_policies 
WHERE schemaname = 'rh' 
AND tablename = 'fgts_config';

-- Verificar dados
SELECT 
    'Dados disponiveis' as status,
    company_id,
    COUNT(*) as total_registros
FROM rh.fgts_config 
WHERE company_id IN (
    'dc060329-50cd-4114-922f-624a6ab036d6',
    'ce390408-1c18-47fc-bd7d-76379ec488b7',
    'ce92d32f-0503-43ca-b3cc-fb09a462b839',
    'f83704f6-3278-4d59-81ca-45925a1ab855'
)
GROUP BY company_id
ORDER BY company_id;

