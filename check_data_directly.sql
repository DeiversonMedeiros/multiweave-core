-- Verificação direta dos dados
-- Empresa de Referência
SELECT '=== EMPRESA DE REFERÊNCIA ===' as info;
SELECT 'Centros de Custo' as tabela, COUNT(*) as total FROM public.cost_centers WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
UNION ALL SELECT 'Cargos', COUNT(*) FROM rh.positions WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
UNION ALL SELECT 'Escalas de Trabalho', COUNT(*) FROM rh.work_shifts WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
UNION ALL SELECT 'Zonas de Localização', COUNT(*) FROM rh.location_zones WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
UNION ALL SELECT 'Rubricas', COUNT(*) FROM rh.rubricas WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
UNION ALL SELECT 'Faixas INSS', COUNT(*) FROM rh.inss_brackets WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
UNION ALL SELECT 'Faixas IRRF', COUNT(*) FROM rh.irrf_brackets WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
UNION ALL SELECT 'Configurações FGTS', COUNT(*) FROM rh.fgts_config WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6';

-- Empresa 1
SELECT '=== EMPRESA 1 ===' as info;
SELECT 'Centros de Custo' as tabela, COUNT(*) as total FROM public.cost_centers WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL SELECT 'Cargos', COUNT(*) FROM rh.positions WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL SELECT 'Escalas de Trabalho', COUNT(*) FROM rh.work_shifts WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL SELECT 'Zonas de Localização', COUNT(*) FROM rh.location_zones WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL SELECT 'Rubricas', COUNT(*) FROM rh.rubricas WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL SELECT 'Faixas INSS', COUNT(*) FROM rh.inss_brackets WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL SELECT 'Faixas IRRF', COUNT(*) FROM rh.irrf_brackets WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL SELECT 'Configurações FGTS', COUNT(*) FROM rh.fgts_config WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7';

-- Empresa 2
SELECT '=== EMPRESA 2 ===' as info;
SELECT 'Centros de Custo' as tabela, COUNT(*) as total FROM public.cost_centers WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL SELECT 'Cargos', COUNT(*) FROM rh.positions WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL SELECT 'Escalas de Trabalho', COUNT(*) FROM rh.work_shifts WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL SELECT 'Zonas de Localização', COUNT(*) FROM rh.location_zones WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL SELECT 'Rubricas', COUNT(*) FROM rh.rubricas WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL SELECT 'Faixas INSS', COUNT(*) FROM rh.inss_brackets WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL SELECT 'Faixas IRRF', COUNT(*) FROM rh.irrf_brackets WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL SELECT 'Configurações FGTS', COUNT(*) FROM rh.fgts_config WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839';

-- Empresa 3
SELECT '=== EMPRESA 3 ===' as info;
SELECT 'Centros de Custo' as tabela, COUNT(*) as total FROM public.cost_centers WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855'
UNION ALL SELECT 'Cargos', COUNT(*) FROM rh.positions WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855'
UNION ALL SELECT 'Escalas de Trabalho', COUNT(*) FROM rh.work_shifts WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855'
UNION ALL SELECT 'Zonas de Localização', COUNT(*) FROM rh.location_zones WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855'
UNION ALL SELECT 'Rubricas', COUNT(*) FROM rh.rubricas WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855'
UNION ALL SELECT 'Faixas INSS', COUNT(*) FROM rh.inss_brackets WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855'
UNION ALL SELECT 'Faixas IRRF', COUNT(*) FROM rh.irrf_brackets WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855'
UNION ALL SELECT 'Configurações FGTS', COUNT(*) FROM rh.fgts_config WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855';







