-- Verificar resultados da cópia em formato de tabela
WITH reference_data AS (
    SELECT 
        'Centros de Custo' as tabela,
        COUNT(*) as total
    FROM public.cost_centers 
    WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
    
    UNION ALL
    
    SELECT 
        'Cargos' as tabela,
        COUNT(*) as total
    FROM rh.positions 
    WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
    
    UNION ALL
    
    SELECT 
        'Escalas de Trabalho' as tabela,
        COUNT(*) as total
    FROM rh.work_shifts 
    WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
    
    UNION ALL
    
    SELECT 
        'Zonas de Localização' as tabela,
        COUNT(*) as total
    FROM rh.location_zones 
    WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
    
    UNION ALL
    
    SELECT 
        'Rubricas' as tabela,
        COUNT(*) as total
    FROM rh.rubricas 
    WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
    
    UNION ALL
    
    SELECT 
        'Faixas INSS' as tabela,
        COUNT(*) as total
    FROM rh.inss_brackets 
    WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
    
    UNION ALL
    
    SELECT 
        'Faixas IRRF' as tabela,
        COUNT(*) as total
    FROM rh.irrf_brackets 
    WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
    
    UNION ALL
    
    SELECT 
        'Configurações FGTS' as tabela,
        COUNT(*) as total
    FROM rh.fgts_config 
    WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
),
target_data AS (
    SELECT 
        'ce390408-1c18-47fc-bd7d-76379ec488b7'::UUID as company_id,
        'Centros de Custo' as tabela,
        COUNT(*) as total
    FROM public.cost_centers 
    WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
    
    UNION ALL
    
    SELECT 
        'ce390408-1c18-47fc-bd7d-76379ec488b7'::UUID as company_id,
        'Cargos' as tabela,
        COUNT(*) as total
    FROM rh.positions 
    WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
    
    UNION ALL
    
    SELECT 
        'ce390408-1c18-47fc-bd7d-76379ec488b7'::UUID as company_id,
        'Escalas de Trabalho' as tabela,
        COUNT(*) as total
    FROM rh.work_shifts 
    WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
    
    UNION ALL
    
    SELECT 
        'ce390408-1c18-47fc-bd7d-76379ec488b7'::UUID as company_id,
        'Zonas de Localização' as tabela,
        COUNT(*) as total
    FROM rh.location_zones 
    WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
    
    UNION ALL
    
    SELECT 
        'ce390408-1c18-47fc-bd7d-76379ec488b7'::UUID as company_id,
        'Rubricas' as tabela,
        COUNT(*) as total
    FROM rh.rubricas 
    WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
    
    UNION ALL
    
    SELECT 
        'ce390408-1c18-47fc-bd7d-76379ec488b7'::UUID as company_id,
        'Faixas INSS' as tabela,
        COUNT(*) as total
    FROM rh.inss_brackets 
    WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
    
    UNION ALL
    
    SELECT 
        'ce390408-1c18-47fc-bd7d-76379ec488b7'::UUID as company_id,
        'Faixas IRRF' as tabela,
        COUNT(*) as total
    FROM rh.irrf_brackets 
    WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
    
    UNION ALL
    
    SELECT 
        'ce390408-1c18-47fc-bd7d-76379ec488b7'::UUID as company_id,
        'Configurações FGTS' as tabela,
        COUNT(*) as total
    FROM rh.fgts_config 
    WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
)
SELECT 
    r.tabela,
    r.total as referencia,
    COALESCE(t.total, 0) as empresa_1,
    CASE 
        WHEN r.total > COALESCE(t.total, 0) THEN '❌ FALTANDO: ' || (r.total - COALESCE(t.total, 0))
        ELSE '✅ OK'
    END as status_1
FROM reference_data r
LEFT JOIN target_data t ON r.tabela = t.tabela AND t.company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
ORDER BY r.tabela;







