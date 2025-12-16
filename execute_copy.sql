-- Executar a função de cópia
SELECT public.copy_company_data(
    'dc060329-50cd-4114-922f-624a6ab036d6'::UUID,
    ARRAY[
        'ce390408-1c18-47fc-bd7d-76379ec488b7'::UUID,
        'ce92d32f-0503-43ca-b3cc-fb09a462b839'::UUID,
        'f83704f6-3278-4d59-81ca-45925a1ab855'::UUID
    ]
);
















