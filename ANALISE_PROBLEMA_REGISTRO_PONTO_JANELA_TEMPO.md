# Análise: Problema de Registro de Ponto com Janela de Tempo

## Problema Identificado

Um colaborador registra o ponto conforme abaixo, com configuração de intervalo de tempo de **15h** na página `rh/ponto-eletronico-config`:

- **Entrada**: 25/01/2026 16:00
- **Início Almoço**: 25/01/2026 20:00
- **Saída Almoço**: 25/01/2026 21:00
- **Saída**: 26/01/2026 00:20

### Comportamento Atual (INCORRETO)

- No dia **25/01/2026**: Aparece apenas entrada, início almoço e saída almoço (sem saída)
- No dia **26/01/2026**: Aparece apenas a saída (sem entrada), mesmo que o colaborador ainda não tenha registrado entrada neste dia

### Comportamento Esperado

Com janela de tempo de **15h**, o sistema deve entender que:
- A saída às **00:20 do dia 26** está dentro da janela de 15h a partir da entrada às **16:00 do dia 25**
- Portanto, a saída deve ser registrada no mesmo `data_registro` do dia 25/01/2026
- O dia 26/01/2026 não deve ter nenhum registro até que o colaborador registre uma nova entrada

## Análise Técnica

### 1. Função `register_time_record` (Atual)

**Arquivo**: `supabase/migrations/20260109000001_fix_register_time_record_save_location.sql`

**Problema na linha 57**:
```sql
-- Backend decide o dia do registro (regra de ouro)
v_local_date := v_local_timestamp::date;
```

Esta linha determina o dia do registro **apenas pela data do timestamp**, sem considerar a janela de tempo configurada.

**Fluxo atual**:
1. Recebe timestamp UTC: `2026-01-26T03:20:00Z` (00:20 BRT)
2. Converte para timezone local: `2026-01-26 00:20:00`
3. Extrai a data: `2026-01-26`
4. Busca/cria registro com `data_registro = '2026-01-26'`
5. **Resultado**: Saída fica no dia 26, mesmo que a entrada esteja no dia 25

### 2. Função `validate_time_record_window` (Existente mas não utilizada)

**Arquivo**: `supabase/migrations/20251118000006_create_validate_time_window_function.sql`

Esta função **já existe** e implementa a lógica correta de validação da janela de tempo:
- Busca a configuração da janela de tempo da empresa
- Verifica se a marcação está dentro da janela a partir da primeira marcação
- Retorna a data correta para o registro

**Problema**: Esta função **não está sendo usada** pela `register_time_record`.

### 3. Configuração de Janela de Tempo

**Tabela**: `rh.time_record_settings`
- Campo: `janela_tempo_marcacoes` (valores permitidos: 12, 15, 20, 22, 24)
- Configuração atual da empresa: **15 horas**

**Migração**: `supabase/migrations/20260106000003_add_12h_15h_to_time_record_settings.sql`

## Soluções Propostas

### Solução 1: Modificar `register_time_record` para usar janela de tempo (RECOMENDADA)

**Descrição**: Modificar a função `register_time_record` para usar a lógica da janela de tempo ao determinar o `data_registro`.

**Vantagens**:
- ✅ Resolve o problema na raiz
- ✅ Mantém a lógica centralizada na função RPC
- ✅ Não requer mudanças no frontend
- ✅ Compatível com todas as configurações de janela (12h, 15h, 20h, 22h, 24h)

**Implementação**:
1. Antes de determinar `v_local_date`, verificar se existe registro recente do mesmo colaborador
2. Se existir, buscar a primeira marcação (entrada) desse registro
3. Calcular horas decorridas desde a primeira marcação
4. Se estiver dentro da janela de tempo configurada, usar o `data_registro` do registro existente
5. Se estiver fora da janela, usar a data do timestamp atual

**Pseudocódigo**:
```sql
-- 1. Converter timestamp para local
v_local_timestamp := p_timestamp_utc AT TIME ZONE p_timezone;
v_local_date := v_local_timestamp::date;

-- 2. Buscar configuração da janela de tempo
SELECT janela_tempo_marcacoes INTO v_window_hours
FROM rh.time_record_settings
WHERE company_id = p_company_id;

-- 3. Buscar registro mais recente do colaborador (últimos 2 dias para garantir)
SELECT id, data_registro, entrada
INTO v_recent_record_id, v_recent_date, v_recent_entrada
FROM rh.time_records
WHERE employee_id = p_employee_id
  AND company_id = p_company_id
  AND data_registro >= v_local_date - INTERVAL '1 day'
  AND entrada IS NOT NULL
ORDER BY data_registro DESC, entrada DESC
LIMIT 1;

-- 4. Se encontrou registro recente, verificar se está dentro da janela
IF v_recent_record_id IS NOT NULL THEN
  -- Calcular timestamp da primeira marcação
  v_first_mark_timestamp := (v_recent_date + v_recent_entrada)::TIMESTAMP WITH TIME ZONE;
  
  -- Calcular horas decorridas
  v_hours_elapsed := EXTRACT(EPOCH FROM (p_timestamp_utc - v_first_mark_timestamp)) / 3600;
  
  -- Se está dentro da janela, usar o data_registro do registro existente
  IF v_hours_elapsed <= v_window_hours THEN
    v_local_date := v_recent_date;
    v_time_record_id := v_recent_record_id;
  END IF;
END IF;
```

### Solução 2: Usar `validate_time_record_window` na função RPC

**Descrição**: Modificar `register_time_record` para chamar `validate_time_record_window` antes de determinar o `data_registro`.

**Vantagens**:
- ✅ Reutiliza função existente
- ✅ Mantém lógica de validação separada

**Desvantagens**:
- ⚠️ Requer ajustes na função `validate_time_record_window` para trabalhar com timestamps UTC
- ⚠️ Pode ter impacto de performance (chamada adicional)

### Solução 3: Corrigir registros existentes + aplicar Solução 1

**Descrição**: Além de implementar a Solução 1, criar script para corrigir registros já incorretos no banco.

**Script de correção**:
```sql
-- Para cada registro do dia 26 com apenas saída (sem entrada)
-- Verificar se existe registro do dia 25 com entrada
-- Se a saída do dia 26 está dentro da janela de tempo da entrada do dia 25,
-- mover a saída para o registro do dia 25
```

## Impacto das Soluções

### Solução 1 (Recomendada)

**Mudanças necessárias**:
- ✅ 1 arquivo de migração SQL
- ✅ Testes com diferentes configurações de janela (12h, 15h, 20h, 22h, 24h)
- ✅ Testes com casos extremos (mudança de dia, múltiplos turnos)

**Riscos**:
- ⚠️ Baixo risco - lógica é clara e testável
- ⚠️ Pode afetar registros em andamento (mas de forma correta)

**Regressão**:
- ✅ Não deve afetar registros normais (dentro do mesmo dia)
- ✅ Melhora o comportamento para turnos noturnos

## Casos de Teste

### Caso 1: Turno Noturno (15h de janela)
- Entrada: 25/01 16:00
- Saída: 26/01 00:20
- **Esperado**: Ambos no registro de 25/01

### Caso 2: Turno Normal (15h de janela)
- Entrada: 25/01 08:00
- Saída: 25/01 17:00
- **Esperado**: Ambos no registro de 25/01 (comportamento atual já correto)

### Caso 3: Turno que ultrapassa janela (15h de janela)
- Entrada: 25/01 08:00
- Saída: 26/01 00:00 (16h depois)
- **Esperado**: Saída no registro de 26/01 (fora da janela)

### Caso 4: Múltiplas marcações (15h de janela)
- Entrada: 25/01 16:00
- Início Almoço: 25/01 20:00
- Saída Almoço: 25/01 21:00
- Saída: 26/01 00:20
- **Esperado**: Todas no registro de 25/01

## Recomendação Final

**Implementar a Solução 1** com as seguintes etapas:

1. ✅ Criar migração SQL modificando `register_time_record`
2. ✅ Testar em ambiente de desenvolvimento
3. ✅ Validar com diferentes configurações de janela
4. ✅ (Opcional) Criar script para corrigir registros existentes incorretos
5. ✅ Aplicar em produção

## Próximos Passos

1. Criar arquivo de migração com a correção
2. Revisar e testar a lógica
3. Aplicar em ambiente de desenvolvimento
4. Validar com casos reais
5. Aplicar em produção
