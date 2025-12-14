-- Executar cópia e verificação completa
\set ON_ERROR_STOP on

-- Primeiro, executar a cópia (conteúdo do copy_company_data_fixed.sql)
\i copy_company_data_fixed.sql

-- Depois verificar
SELECT 'VERIFICAÇÃO FINAL' as etapa;

-- Verificar Empresa 1
SELECT 
    'Empresa 1' as empresa,
    tabela,
    referencia_count as ref,
    destino_count as dest,
    faltando,
    status
FROM public.get_copy_status(
    'dc060329-50cd-4114-922f-624a6ab036d6'::UUID,
    'ce390408-1c18-47fc-bd7d-76379ec488b7'::UUID
);

-- Verificar Empresa 2
SELECT 
    'Empresa 2' as empresa,
    tabela,
    referencia_count as ref,
    destino_count as dest,
    faltando,
    status
FROM public.get_copy_status(
    'dc060329-50cd-4114-922f-624a6ab036d6'::UUID,
    'ce92d32f-0503-43ca-b3cc-fb09a462b839'::UUID
);

-- Verificar Empresa 3
SELECT 
    'Empresa 3' as empresa,
    tabela,
    referencia_count as ref,
    destino_count as dest,
    faltando,
    status
FROM public.get_copy_status(
    'dc060329-50cd-4114-922f-624a6ab036d6'::UUID,
    'f83704f6-3278-4d59-81ca-45925a1ab855'::UUID
);














