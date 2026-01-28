# Correção: Registro de Ponto com Janela de Tempo

## Problema Identificado

O sistema estava registrando marcações de ponto incorretamente quando a marcação ocorria após a meia-noite, mesmo estando dentro da janela de tempo configurada.

### Exemplo do Problema

**Registros feitos pelo usuário:**
- Entrada: 27/01/2026 21:24:18 ✅
- Entrada Almoço: 27/01/2026 23:09:47 ✅
- Saída Almoço: 28/01/2026 00:09:04 ❌

**Como o sistema interpretou (INCORRETO):**
- Entrada: 27/01/2026 21:24:18 ✅
- Entrada Almoço: 27/01/2026 23:09:47 ✅
- Entrada: 28/01/2026 00:09:04 ❌ (deveria ser "Saída Almoço" no dia 27)

### Causa Raiz

A função `register_time_record` determinava o `data_registro` apenas pela data do timestamp, sem considerar a janela de tempo configurada. Quando uma marcação ocorria após a meia-noite, o sistema criava um novo registro para o dia seguinte, mesmo que a marcação estivesse dentro da janela de tempo do registro anterior.

## Solução Implementada

### 1. Correção da Função `register_time_record`

**Arquivo**: `supabase/migrations/20260128000001_fix_register_time_record_window_logic.sql`

**Mudanças:**
- Quando o evento **NÃO é "entrada"**, a função agora:
  1. Busca o registro mais recente com entrada (últimos 2 dias)
  2. Verifica se a marcação atual está dentro da janela de tempo desse registro
  3. Se estiver dentro da janela, usa o `data_registro` do registro existente
  4. Se estiver fora da janela ou não encontrar registro, usa a data do timestamp atual

**Lógica de Janela de Tempo:**
- Obtém a configuração de janela de tempo da empresa (`rh.time_record_settings`)
- Calcula horas decorridas desde a primeira marcação (entrada)
- Compara com a janela configurada (ex: 15 horas)
- Se `horas_decorridas <= janela_tempo`, agrupa no registro existente

### 2. Correção de Registros Incorretos Existentes

**Arquivo**: `supabase/migrations/20260128000002_fix_incorrect_time_records.sql`

**Funcionalidade:**
- Identifica registros que têm apenas "entrada" no dia seguinte
- Verifica se esses registros deveriam estar agrupados com registros do dia anterior
- Corrige automaticamente movendo a marcação para o campo correto no registro anterior
- Remove o registro incorreto criado

**Resultado da Correção:**
- ✅ 2 registros corrigidos automaticamente
- ✅ Registro às 00:09:04 do dia 28/01 corrigido para "saida_almoco" no dia 27/01
- ✅ Registro às 00:02:24 do dia 28/01 corrigido para "saida" no dia 27/01

## Comportamento Esperado Após Correção

### Cenário: Turno Noturno com Janela de 15h

**Registros:**
- Entrada: 27/01/2026 21:24:18
- Entrada Almoço: 27/01/2026 23:09:47
- Saída Almoço: 28/01/2026 00:09:04

**Como o sistema agora registra (CORRETO):**
- `data_registro = '2026-01-27'`
  - `entrada = '21:24:18'`
  - `entrada_almoco = '23:09:47'`
  - `saida_almoco = '00:09:04'` ✅ (agrupado corretamente)

**Interface:**
- Todos os registros aparecem agrupados no dia 27/01/2026
- A saída do almoço mostra a data real (28/01) na interface, mas está agrupada corretamente

## Validação

Para validar se a correção está funcionando:

1. **Registrar ponto em turno noturno:**
   - Entrada antes da meia-noite
   - Marcações após a meia-noite dentro da janela de tempo

2. **Verificar no banco de dados:**
   ```sql
   SELECT 
     data_registro,
     entrada,
     entrada_almoco,
     saida_almoco,
     saida
   FROM rh.time_records
   WHERE employee_id = '<id_do_colaborador>'
     AND data_registro >= CURRENT_DATE - INTERVAL '2 days'
   ORDER BY data_registro DESC;
   ```

3. **Verificar na interface:**
   - Todos os registros devem aparecer agrupados no mesmo cartão de ponto
   - Não deve aparecer registro separado no dia seguinte

## Notas Técnicas

- A função `register_time_record` continua salvando timestamps UTC originais em `time_record_events`
- O `data_registro` é determinado pela lógica de janela de tempo, não pela data do timestamp
- A função busca registros dos últimos 2 dias para garantir que encontra o registro correto
- Logs de NOTICE são gerados para facilitar debugging (dentro/fora da janela)

## Arquivos Modificados

1. `supabase/migrations/20260128000001_fix_register_time_record_window_logic.sql`
   - Correção da função `register_time_record`

2. `supabase/migrations/20260128000002_fix_incorrect_time_records.sql`
   - Script de correção de registros existentes

## Correção Adicional: Busca Bidirecional na Interface

### Problema Identificado

Após corrigir a função `register_time_record`, a interface ainda não mostrava registros do dia anterior que estavam dentro da janela de tempo. Quando o usuário acessava no dia 28/01, a função `get_consolidated_time_record_by_window` buscava apenas registros do dia 28 e 29, não buscava o dia 27.

### Solução Implementada

**Arquivo**: `supabase/migrations/20260128000003_fix_get_consolidated_time_record_bidirectional.sql`

**Mudanças:**
- A função agora busca **primeiro no dia anterior** (27/01)
- Verifica se o registro do dia anterior ainda está dentro da janela de tempo
- Se estiver dentro da janela, retorna esse registro consolidado
- Se não estiver, busca no dia atual (28/01)
- Também consolida marcações do dia seguinte que estão dentro da janela

**Lógica de Busca:**
1. Buscar registro do dia anterior com entrada
2. Calcular horas decorridas desde a entrada até o início do dia atual
3. Se `horas_decorridas <= janela_tempo`, usar registro do dia anterior
4. Se não encontrar ou estiver fora da janela, buscar no dia atual
5. Consolidar marcações do dia seguinte que estão dentro da janela

## Correção Final: Datas Reais dos Eventos

### Problema Identificado

A interface estava mostrando a data do registro base (27/01) para todas as marcações, mesmo quando algumas ocorreram no dia seguinte (28/01). Por exemplo, "Fim Almoço" às 00:09:04 estava sendo exibido como "(27/01)" quando deveria ser "(28/01)".

### Solução Implementada

**Arquivo**: `supabase/migrations/20260128000004_add_real_dates_from_events.sql`

**Mudanças:**
- A função `get_consolidated_time_record_by_window` agora busca as datas reais de cada marcação usando `time_record_events.event_at`
- Retorna campos `*_date` (ex: `saida_almoco_date`) quando a data real é diferente de `base_date`
- O frontend usa esses campos para exibir a data correta na interface

**Como funciona:**
1. A tabela `time_records` armazena apenas TIME (hora) em campos como `saida_almoco`
2. A tabela `time_record_events` armazena o timestamp completo (`event_at`) com data e hora reais
3. A função busca `event_at` de cada evento e extrai a data real
4. Retorna `saida_almoco_date = '2026-01-28'` quando a marcação ocorreu no dia 28
5. Frontend exibe: "00:09 (28/01)" ✅

### Arquitetura

A estrutura atual está correta:
- ✅ `time_records` armazena apenas TIME (simples e eficiente)
- ✅ `time_record_events` armazena timestamps completos (fonte de verdade)
- ✅ Função usa eventos para obter datas reais
- ✅ Frontend exibe datas corretas

**Não é necessário alterar a estrutura da tabela.** Veja `ARQUITETURA_REGISTRO_PONTO_DATAS.md` para detalhes.

## Status

✅ **Correção aplicada e testada**
✅ **Registros incorretos corrigidos**
✅ **Função de busca bidirecional implementada**
✅ **Datas reais dos eventos implementadas**
✅ **Sistema funcionando conforme esperado**
