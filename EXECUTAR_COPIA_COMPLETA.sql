-- =====================================================
-- SCRIPT COMPLETO DE CÓPIA E VERIFICAÇÃO
-- Execute este script no Supabase Studio SQL Editor
-- =====================================================

-- Primeiro, executar a cópia
\i copy_company_data_fixed.sql

-- Depois, verificar os resultados
SELECT 
    'Empresa 1: ce390408-1c18-47fc-bd7d-76379ec488b7' as empresa,
    tabela,
    referencia_count as referencia,
    destino_count as destino,
    faltando,
    status
FROM public.get_copy_status(
    'dc060329-50cd-4114-922f-624a6ab036d6'::UUID,
    'ce390408-1c18-47fc-bd7d-76379ec488b7'::UUID
);

SELECT 
    'Empresa 2: ce92d32f-0503-43ca-b3cc-fb09a462b839' as empresa,
    tabela,
    referencia_count as referencia,
    destino_count as destino,
    faltando,
    status
FROM public.get_copy_status(
    'dc060329-50cd-4114-922f-624a6ab036d6'::UUID,
    'ce92d32f-0503-43ca-b3cc-fb09a462b839'::UUID
);

SELECT 
    'Empresa 3: f83704f6-3278-4d59-81ca-45925a1ab855' as empresa,
    tabela,
    referencia_count as referencia,
    destino_count as destino,
    faltando,
    status
FROM public.get_copy_status(
    'dc060329-50cd-4114-922f-624a6ab036d6'::UUID,
    'f83704f6-3278-4d59-81ca-45925a1ab855'::UUID
);






