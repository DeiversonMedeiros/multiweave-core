# Arquitetura: Registro de Ponto com Datas Reais

## Estrutura das Tabelas

### 1. `rh.time_records` (Tabela Principal)

Armazena os registros consolidados por dia (`data_registro`):

```sql
CREATE TABLE rh.time_records (
  id uuid PRIMARY KEY,
  employee_id uuid NOT NULL,
  company_id uuid NOT NULL,
  data_registro date NOT NULL,  -- Data base do registro
  entrada time,                  -- Apenas hora (HH:MM:SS)
  saida time,
  entrada_almoco time,
  saida_almoco time,            -- Apenas hora, não armazena data
  entrada_extra1 time,
  saida_extra1 time,
  ...
);
```

**Características:**
- Campos de horário são apenas `TIME` (não `TIMESTAMP`)
- `data_registro` é a data base do registro (dia do primeiro registro)
- Marcações que ocorrem após a meia-noite são agrupadas no mesmo registro se estiverem dentro da janela de tempo

### 2. `rh.time_record_events` (Fonte de Verdade para Timestamps)

Armazena cada marcação individual com timestamp completo:

```sql
CREATE TABLE rh.time_record_events (
  id uuid PRIMARY KEY,
  time_record_id uuid NOT NULL,  -- Referência ao registro consolidado
  employee_id uuid NOT NULL,
  company_id uuid NOT NULL,
  event_type varchar(20),       -- 'entrada', 'saida_almoco', etc.
  event_at timestamptz NOT NULL, -- Data e hora REAL da marcação (UTC)
  latitude numeric,
  longitude numeric,
  ...
);
```

**Características:**
- `event_at` é `TIMESTAMPTZ` (contém data e hora reais)
- Cada marcação gera um evento separado
- Fonte de verdade para saber quando cada marcação realmente ocorreu

## Como o Sistema Funciona

### Exemplo: Turno Noturno

**Registros feitos:**
- Entrada: 27/01/2026 21:24:18
- Entrada Almoço: 27/01/2026 23:09:47
- Saída Almoço: 28/01/2026 00:09:04

**No banco de dados:**

1. **`time_records`** (registro consolidado):
   ```sql
   data_registro = '2026-01-27'
   entrada = '21:24:18'
   entrada_almoco = '23:09:47'
   saida_almoco = '00:09:04'  -- Hora apenas, mas data real é 28/01
   ```

2. **`time_record_events`** (eventos individuais):
   ```sql
   -- Evento 1
   event_type = 'entrada'
   event_at = '2026-01-27 21:24:18-03:00'  -- Data e hora reais
   
   -- Evento 2
   event_type = 'entrada_almoco'
   event_at = '2026-01-27 23:09:47-03:00'
   
   -- Evento 3
   event_type = 'saida_almoco'
   event_at = '2026-01-28 00:09:04-03:00'  -- Data real: 28/01!
   ```

### Função `get_consolidated_time_record_by_window`

A função agora:

1. **Busca o registro consolidado** em `time_records`
2. **Busca as datas reais** em `time_record_events` usando `event_at`
3. **Retorna campos `*_date`** quando a data real é diferente de `base_date`

**Exemplo de retorno:**
```json
{
  "id": "...",
  "data_registro": "2026-01-27",
  "base_date": "2026-01-27",
  "entrada": "21:24:18",
  "entrada_almoco": "23:09:47",
  "saida_almoco": "00:09:04",
  "saida_almoco_date": "2026-01-28",  // Data real da marcação
  "window_hours": 15
}
```

### Frontend

O frontend usa os campos `*_date` para exibir a data correta:

```typescript
// Exemplo: Fim Almoço
formatTimeWithDate(
  record.saida_almoco,           // "00:09:04"
  record.saida_almoco_date,      // "2026-01-28"
  record.base_date               // "2026-01-27"
)
// Resultado: "00:09 (28/01)"
```

## Vantagens desta Arquitetura

### ✅ Simplicidade na Tabela Principal
- `time_records` mantém apenas TIME (não precisa de TIMESTAMP para cada campo)
- Facilita cálculos de horas trabalhadas
- Estrutura simples e performática

### ✅ Precisão nos Eventos
- `time_record_events` armazena timestamp completo (fonte de verdade)
- Permite saber exatamente quando cada marcação ocorreu
- Suporta auditoria e rastreabilidade

### ✅ Flexibilidade na Agregação
- Registros podem ser agrupados por janela de tempo
- Datas reais são preservadas nos eventos
- Interface pode mostrar datas corretas mesmo quando agrupadas

### ✅ Compatibilidade com Cálculos
- Funções de cálculo de horas usam `data_registro + time`
- Para marcações após meia-noite, usam `saida_almoco_date + saida_almoco`
- Cálculos permanecem corretos

## Cálculos de Horas

### Exemplo: Calcular tempo de almoço

**Cenário:** Entrada almoço 27/01 23:09:47, Saída almoço 28/01 00:09:04

**Cálculo correto:**
```sql
-- Usar datas reais dos eventos
SELECT 
  EXTRACT(EPOCH FROM (
    (saida_almoco_date + saida_almoco)::timestamp -
    (entrada_almoco_date + entrada_almoco)::timestamp
  )) / 60 AS minutos_almoco
FROM get_consolidated_time_record_by_window(...)
```

**Resultado:** 59 minutos e 17 segundos ✅

## Conclusão

A arquitetura atual está **correta e bem projetada**:

1. ✅ Tabela `time_records` armazena apenas TIME (simples e eficiente)
2. ✅ Tabela `time_record_events` armazena timestamps completos (precisão)
3. ✅ Função `get_consolidated_time_record_by_window` usa eventos para obter datas reais
4. ✅ Frontend exibe datas corretas usando campos `*_date`
5. ✅ Cálculos podem usar datas reais quando necessário

**Não é necessário alterar a estrutura da tabela `time_records`.** A solução atual é elegante e eficiente.
