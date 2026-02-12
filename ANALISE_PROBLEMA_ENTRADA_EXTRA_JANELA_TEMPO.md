# Análise: Problema de Entrada Extra não Agrupada na Janela de Tempo

## Problema Identificado

O funcionário **GILCIMAR OLIVEIRA DA SILVA** da empresa **SMARTVIEW** registrou uma entrada extra às **00:32 do dia 22/01/2026**, mas essa marcação não foi agrupada com o registro do dia **21/01/2026**, ficando isolada em um registro separado do dia 22/01.

### Comportamento Esperado

Quando uma marcação de entrada extra ocorre após a meia-noite (ex: 00:32 do dia 22/01), mas ainda está dentro da janela de tempo configurada (15 horas para SMARTVIEW), ela deveria ser agrupada com o registro do dia anterior (21/01) que contém a entrada principal.

### Comportamento Atual (Incorreto)

A marcação de entrada extra às 00:32 do dia 22/01 foi criada em um registro separado do dia 22/01, sem outras marcações, quando deveria estar agrupada com o registro do dia 21/01.

## Análise Técnica

### Função `register_time_record`

A função `register_time_record` possui lógica para verificar a janela de tempo quando o evento **não é "entrada"** (linha 76). Isso inclui eventos `extra_inicio` e `extra_fim`.

**Problema identificado na busca de registro recente:**

```sql
-- Linha 95-96 da migração 20260128000001
AND tr.data_registro >= v_local_date - INTERVAL '2 days'
AND tr.data_registro <= v_local_date
```

Quando uma marcação ocorre às 00:32 do dia 22/01:
- `v_local_date` = 22/01/2026
- A busca procura registros entre 20/01 e 22/01 ✅ (deveria encontrar o registro do dia 21/01)

**Porém, há dois problemas potenciais:**

1. **Janela de busca limitada**: A busca está limitada a 2 dias atrás. Se houver um registro do dia 20/01 que ainda está dentro da janela de 15 horas, ele pode não ser encontrado.

2. **Verificação rigorosa da janela**: A verificação usa `v_hours_elapsed >= 0 AND v_hours_elapsed <= v_window_hours` sem margem de tolerância. Marcações muito próximas do limite podem ser excluídas.

### Função `get_time_records_paginated`

A função `get_time_records_paginated` busca registros diretamente da tabela `rh.time_records` e não usa a função `get_consolidated_time_record_by_window` para consolidar registros de dias diferentes.

**Isso significa que:**
- Se um registro foi criado incorretamente no dia 22/01 com apenas entrada_extra1, ele será exibido como um registro separado
- A função não consolida automaticamente registros do dia anterior que ainda estão dentro da janela de tempo

## Solução Implementada

### Migração: `20260209000001_fix_register_time_record_extra_window_logic.sql`

**Correções aplicadas:**

1. **Expansão da janela de busca**: De 2 dias para 3 dias atrás
   ```sql
   AND tr.data_registro >= v_local_date - INTERVAL '3 days'
   ```

2. **Margem de tolerância na verificação da janela**: Adicionada margem de 0.5 horas
   ```sql
   v_is_within_window := v_hours_elapsed >= -0.5 AND v_hours_elapsed <= (v_window_hours + 0.5);
   ```

3. **Informações adicionais no retorno**: Incluídas informações sobre janela de tempo e horas decorridas para debug
   ```sql
   'window_hours', v_window_hours,
   'hours_elapsed', CASE WHEN v_hours_elapsed IS NOT NULL THEN ROUND(v_hours_elapsed, 2) ELSE NULL END,
   'is_within_window', CASE WHEN v_is_within_window IS NOT NULL THEN v_is_within_window ELSE false END
   ```

## Próximos Passos

1. **Aplicar a migração** no banco de dados de produção
2. **Verificar registros existentes** que podem ter sido criados incorretamente
3. **Considerar criar uma função de correção** para agrupar registros existentes que foram criados incorretamente

## Scripts de Análise

Criado script `scripts/analyze_gilcimar_time_records.sql` para análise de registros específicos do funcionário GILCIMAR.

## Configuração da Empresa

- **Empresa**: SMARTVIEW
- **Janela de Tempo**: 15 horas
- **Funcionário**: GILCIMAR OLIVEIRA DA SILVA (ID: 99f57156-2a71-4f8f-af1c-78ff8e4258dc)
