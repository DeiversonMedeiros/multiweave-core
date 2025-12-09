-- Verificação simples - comparar contagens
SELECT 
    'Centros de Custo' as tabela,
    (SELECT COUNT(*) FROM public.cost_centers WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6') as referencia,
    (SELECT COUNT(*) FROM public.cost_centers WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7') as empresa_1,
    (SELECT COUNT(*) FROM public.cost_centers WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839') as empresa_2,
    (SELECT COUNT(*) FROM public.cost_centers WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855') as empresa_3
UNION ALL
SELECT 
    'Cargos',
    (SELECT COUNT(*) FROM rh.positions WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'),
    (SELECT COUNT(*) FROM rh.positions WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'),
    (SELECT COUNT(*) FROM rh.positions WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'),
    (SELECT COUNT(*) FROM rh.positions WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855')
UNION ALL
SELECT 
    'Escalas de Trabalho',
    (SELECT COUNT(*) FROM rh.work_shifts WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'),
    (SELECT COUNT(*) FROM rh.work_shifts WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'),
    (SELECT COUNT(*) FROM rh.work_shifts WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'),
    (SELECT COUNT(*) FROM rh.work_shifts WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855')
UNION ALL
SELECT 
    'Zonas de Localização',
    (SELECT COUNT(*) FROM rh.location_zones WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'),
    (SELECT COUNT(*) FROM rh.location_zones WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'),
    (SELECT COUNT(*) FROM rh.location_zones WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'),
    (SELECT COUNT(*) FROM rh.location_zones WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855')
UNION ALL
SELECT 
    'Rubricas',
    (SELECT COUNT(*) FROM rh.rubricas WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'),
    (SELECT COUNT(*) FROM rh.rubricas WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'),
    (SELECT COUNT(*) FROM rh.rubricas WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'),
    (SELECT COUNT(*) FROM rh.rubricas WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855')
UNION ALL
SELECT 
    'Faixas INSS',
    (SELECT COUNT(*) FROM rh.inss_brackets WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'),
    (SELECT COUNT(*) FROM rh.inss_brackets WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'),
    (SELECT COUNT(*) FROM rh.inss_brackets WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'),
    (SELECT COUNT(*) FROM rh.inss_brackets WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855')
UNION ALL
SELECT 
    'Faixas IRRF',
    (SELECT COUNT(*) FROM rh.irrf_brackets WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'),
    (SELECT COUNT(*) FROM rh.irrf_brackets WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'),
    (SELECT COUNT(*) FROM rh.irrf_brackets WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'),
    (SELECT COUNT(*) FROM rh.irrf_brackets WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855')
UNION ALL
SELECT 
    'Configurações FGTS',
    (SELECT COUNT(*) FROM rh.fgts_config WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'),
    (SELECT COUNT(*) FROM rh.fgts_config WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'),
    (SELECT COUNT(*) FROM rh.fgts_config WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'),
    (SELECT COUNT(*) FROM rh.fgts_config WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855');






