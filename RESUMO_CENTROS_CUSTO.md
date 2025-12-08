# Verificação e Cópia de Centros de Custo

## Script Executado

O script `check_and_copy_cost_centers.sql` foi executado. Este script:

1. ✅ Verifica quantos Centros de Custo existem na empresa de referência
2. ✅ Verifica quantos Centros de Custo existem em cada empresa destino
3. ✅ Compara os valores
4. ✅ Se faltar dados, copia apenas os que não existem (usando `NOT EXISTS` com `codigo`)
5. ✅ Mostra o resultado final

## Lógica de Cópia

- **Se a empresa destino já tem todos os dados (ou mais)**: Não copia nada
- **Se faltam dados**: Copia apenas os registros que não existem, baseado no campo `codigo`

## Para Verificar os Resultados

Execute esta query no Supabase Studio:

```sql
SELECT 
    'Referência' as tipo,
    COUNT(*) as total
FROM public.cost_centers
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'

UNION ALL

SELECT 
    'Empresa 1',
    COUNT(*)
FROM public.cost_centers
WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'

UNION ALL

SELECT 
    'Empresa 2',
    COUNT(*)
FROM public.cost_centers
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'

UNION ALL

SELECT 
    'Empresa 3',
    COUNT(*)
FROM public.cost_centers
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855';
```

## Status

✅ Script executado com sucesso
✅ Verificação e cópia automática realizada
✅ Dados faltantes foram copiados (se houver)
