# Instruções para Verificar e Corrigir a Cópia de Dados

## Problema Identificado
Diversos dados não foram copiados corretamente entre as empresas.

## Solução

### Passo 1: Executar o Script de Cópia Corrigido

1. Acesse o **Supabase Studio** → **SQL Editor**
2. Execute o arquivo `copy_company_data_fixed.sql` completo
3. Este script mostra em tempo real quantos registros foram copiados

### Passo 2: Verificar os Resultados

Execute o arquivo `get_copy_status.sql` que criará uma função e mostrará o status de cada empresa.

Ou execute diretamente estas queries:

```sql
-- Verificar Empresa 1
SELECT 
    'Empresa 1' as empresa,
    tabela,
    referencia_count as referencia,
    destino_count as destino,
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
    referencia_count as referencia,
    destino_count as destino,
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
    referencia_count as referencia,
    destino_count as destino,
    faltando,
    status
FROM public.get_copy_status(
    'dc060329-50cd-4114-922f-624a6ab036d6'::UUID,
    'f83704f6-3278-4d59-81ca-45925a1ab855'::UUID
);
```

### Passo 3: Se Ainda Houver Dados Faltantes

O script `copy_company_data_fixed.sql` foi melhorado para:
- Usar `NOT EXISTS` em vez de `ON CONFLICT` para tabelas sem constraints únicas
- Mostrar quantos registros existem na referência antes de copiar
- Mostrar quantos registros foram realmente copiados
- Tratar corretamente todas as constraints únicas

## Tabelas que Devem Ser Copiadas

1. ✅ **Centros de Custo** (`public.cost_centers`)
2. ✅ **Cargos** (`rh.positions`)
3. ✅ **Escalas de Trabalho** (`rh.work_shifts`)
4. ✅ **Zonas de Localização** (`rh.location_zones`)
5. ✅ **Rubricas** (`rh.rubricas`)
6. ✅ **Faixas INSS** (`rh.inss_brackets`)
7. ✅ **Faixas IRRF** (`rh.irrf_brackets`)
8. ✅ **Configurações FGTS** (`rh.fgts_config`)
9. ✅ **Configurações de Folha** (`rh.payroll_config` - se existir)
10. ✅ **Configuração de Integração Financeira** (`rh.financial_integration_config`)
11. ✅ **Configuração Fiscal** (`financeiro.configuracao_fiscal` - se existir)
12. ✅ **Configuração Bancária** (`financeiro.configuracao_bancaria` - se existir)

## Observações Importantes

- O script `copy_company_data_fixed.sql` mostra mensagens `RAISE NOTICE` que aparecem no console do Supabase Studio
- Se algum dado não for copiado, verifique:
  - Se há constraints únicas que estão impedindo a inserção
  - Se os dados realmente existem na empresa de referência
  - Se há algum erro sendo retornado silenciosamente

## Próximos Passos

1. Execute `copy_company_data_fixed.sql` no Supabase Studio
2. Verifique as mensagens de `RAISE NOTICE` que mostram o progresso
3. Execute `get_copy_status.sql` para ver o status final
4. Se ainda houver dados faltantes, me informe quais tabelas específicas estão com problema
















