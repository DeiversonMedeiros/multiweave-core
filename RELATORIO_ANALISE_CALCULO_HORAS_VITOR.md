# Relatório de Análise: Cálculo de Horas - VITOR ALVES DA COSTA NETO

## Dados do Funcionário
- **Nome**: VITOR ALVES DA COSTA NETO
- **Matrícula**: 03027
- **ID**: 9ce0c4e9-8bb0-4ad8-ab77-ac8af3f1e3c0
- **Escala**: flexivel_6x1
- **Horas Diárias Esperadas**: 7.33h
- **Dias de Trabalho**: Segunda a Sexta (1,2,3,4,5)

## Problemas Identificados

### 1. Cálculo de Horas Negativas e Extras Incorreto

Os cálculos estão usando **8.0h como base** ao invés de **7.33h**, resultando em valores completamente errados:

| Data | Horas Trabalhadas | Esperado | Diferença Esperada | Horas Negativas Calculadas | Extras 50% Calculadas | Extras 100% Calculadas | Status |
|------|-------------------|----------|-------------------|---------------------------|----------------------|----------------------|--------|
| 30/11/2025 | 0.00h | 7.33h | -7.33h | 0.00h ✅ | 0.00h ✅ | 0.00h ✅ | OK (Domingo, sem registro) |
| 28/11/2025 | 7.52h | 7.33h | **+0.19h extras** | **0.48h ❌** | 0.00h ❌ | 0.00h ❌ | **ERRADO** |
| 27/11/2025 | 8.33h | 7.33h | **+1.00h extras** | 0.00h ✅ | **0.33h ❌** | 0.00h ❌ | **ERRADO** |
| 26/11/2025 | 7.97h | 7.33h | **+0.64h extras** | **0.03h ❌** | 0.00h ❌ | 0.00h ❌ | **ERRADO** |
| 25/11/2025 | 8.01h | 7.33h | **+0.68h extras** | 0.00h ✅ | **0.01h ❌** | 0.00h ❌ | **ERRADO** |

**Análise dos Erros:**
- **28/11**: Deveria ter 0.19h extras 50%, mas calculou 0.48h negativas (usou 8.0h como base: 7.52 - 8.0 = -0.48)
- **27/11**: Deveria ter 1.00h extras 50%, mas só calculou 0.33h (usou 8.0h como base: 8.33 - 8.0 = 0.33)
- **26/11**: Deveria ter 0.64h extras 50%, mas calculou 0.03h negativas (usou 8.0h como base: 7.97 - 8.0 = -0.03)
- **25/11**: Deveria ter 0.68h extras 50%, mas só calculou 0.01h (usou 8.0h como base: 8.01 - 8.0 = 0.01)

### 2. Feriados Não Estão Sendo Considerados para Extras 100%

A função `rh.is_holiday()` está funcionando corretamente, mas os feriados cadastrados não estão sendo considerados no cálculo de horas extras 100%.

**Feriados Cadastrados em Novembro/2025:**
- 02/11/2025: Finados ✅
- 15/11/2025: Proclamação da República ✅
- 20/11/2025: Consciência Negra ✅ (duplicado)

**Problema**: Mesmo que um feriado seja trabalhado, as horas extras não estão sendo classificadas como 100% (pagamento direto) conforme a regra da escala 6x1.

### 3. Horas Noturnas Não Estão Sendo Calculadas

A coluna `horas_noturnas` **não existe** na tabela `rh.time_records`. O código frontend está preparado para exibir horas noturnas, mas o campo não existe no banco de dados.

## Causa Raiz

### Problema Principal: Função `calculate_overtime_by_scale`

A função está buscando o turno corretamente e obtendo `horas_diarias = 7.33`, mas há um problema na lógica:

1. **Linha 86**: Busca `ws.horas_diarias` do turno (retorna 7.33 ✅)
2. **Linhas 102-108**: Verifica `horarios_por_dia` (está NULL, então não sobrescreve)
3. **Linhas 112-114**: Se `v_horas_diarias IS NULL`, usa 8.0 como padrão

**O problema**: A função pode estar recebendo `NULL` em algum momento ou há um problema na busca do turno durante o cálculo.

### Verificação Necessária

Preciso verificar se:
1. A função `calculate_overtime_by_scale` está sendo chamada corretamente após `recalculate_time_record_hours`
2. Se há algum problema na busca do turno que está retornando NULL
3. Se o `horarios_por_dia` está interferindo no cálculo

## Correções Necessárias

### 1. Corrigir Cálculo de Horas Diárias na Função `calculate_overtime_by_scale`

A função deve garantir que está usando as `horas_diarias` corretas do turno (7.33h) e não o padrão de 8.0h.

**Arquivo**: `supabase/migrations/20251220000005_fix_horas_negativas_calculation_complete.sql`

**Problema identificado**: A busca do turno pode estar falhando em alguns casos, fazendo com que use o padrão de 8.0h.

### 2. Garantir que Feriados São Considerados para Extras 100%

A função já verifica feriados corretamente (`rh.is_holiday()`), mas precisa garantir que:
- Para escala 6x1: Se `is_feriado = true`, todas as horas extras devem ser 100%
- A flag `is_feriado` deve ser atualizada corretamente no registro

### 3. Implementar Cálculo de Horas Noturnas

Adicionar:
- Coluna `horas_noturnas` na tabela `rh.time_records`
- Lógica para calcular horas noturnas (trabalho entre 22h e 5h do dia seguinte)
- Atualizar frontend para exibir horas noturnas

## Próximos Passos

1. ✅ Analisar função `calculate_overtime_by_scale` em detalhes
2. ✅ Verificar se há problema na busca do turno
3. ⏳ Criar migração para corrigir cálculo de horas
4. ⏳ Adicionar cálculo de horas noturnas
5. ⏳ Testar correções com dados reais
6. ⏳ Recalcular todos os registros do funcionário

## Evidências

### Query de Verificação do Turno
```sql
SELECT ws.horas_diarias 
FROM rh.employee_shifts es 
INNER JOIN rh.work_shifts ws ON ws.id = es.turno_id 
WHERE es.funcionario_id = '9ce0c4e9-8bb0-4ad8-ab77-ac8af3f1e3c0' 
  AND es.ativo = true 
  AND es.data_inicio <= '2025-11-28' 
  AND (es.data_fim IS NULL OR es.data_fim >= '2025-11-28')
ORDER BY es.data_inicio DESC 
LIMIT 1;
-- Retorna: 7.33 ✅
```

### Query de Verificação de Feriados
```sql
SELECT rh.is_holiday('2025-11-20', (SELECT company_id FROM rh.employees WHERE id = '9ce0c4e9-8bb0-4ad8-ab77-ac8af3f1e3c0'));
-- Retorna: true ✅ (Consciência Negra)
```

## Análise Técnica Detalhada

### Verificação do Turno

O funcionário tem:
- ✅ `employee_shifts` com turno de 7.33h (ativo desde 2025-10-23)
- ✅ `employees.work_shift_id` também aponta para turno de 7.33h

Ambos os caminhos retornam as horas corretas, então o problema não está na busca do turno.

### Possíveis Causas

1. **Problema na ordem de execução**: A função `calculate_overtime_by_scale` pode estar sendo chamada antes de `recalculate_time_record_hours` atualizar as horas trabalhadas corretamente.

2. **Problema na lógica de cálculo**: A função pode estar usando um valor antigo de `horas_trabalhadas` ou `horas_diarias` que foi calculado anteriormente.

3. **Problema de cache/estado**: Os valores podem estar sendo calculados com dados desatualizados.

### Teste Necessário

Preciso executar manualmente a função `calculate_overtime_by_scale` para um registro específico e verificar:
- Qual valor de `v_horas_diarias` está sendo usado
- Qual valor de `v_horas_trabalhadas` está sendo usado
- Qual o resultado do cálculo de `v_excedente`

## Conclusão

O problema principal é que a função `calculate_overtime_by_scale` está usando **8.0h como padrão** ao invés das **7.33h do turno**, resultando em cálculos completamente incorretos de horas negativas e extras.

**Possível causa**: A função pode estar recebendo `NULL` em `v_horas_diarias` em algum momento do processo, fazendo com que use o padrão de 8.0h. Isso pode acontecer se:
- A busca do turno falhar silenciosamente
- O `horarios_por_dia` estiver sobrescrevendo incorretamente
- Há um problema de timing na execução das funções

A função `is_holiday()` está funcionando corretamente, mas os feriados não estão sendo considerados no cálculo de extras 100% para escala 6x1 (precisa verificar se a flag `is_feriado` está sendo atualizada corretamente).

As horas noturnas não estão implementadas e precisam ser adicionadas.

## Recomendações Imediatas

1. **Adicionar logs de debug** na função `calculate_overtime_by_scale` para rastrear os valores de `v_horas_diarias` e `v_horas_trabalhadas`
2. **Garantir que a busca do turno nunca retorne NULL** quando há um turno válido
3. **Verificar a ordem de execução** das funções `recalculate_time_record_hours` e `calculate_overtime_by_scale`
4. **Recalcular todos os registros** do funcionário após corrigir a função

