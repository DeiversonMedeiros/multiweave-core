# Ajustes Frontend - Registro de Ponto com Janela de Tempo

## Mudanças Implementadas

### 1. Interface TimeRecord Atualizada

Adicionados campos opcionais para datas reais:
- `base_date?: string` - Data base do registro (data da primeira marcação)
- `window_hours?: number` - Janela de tempo configurada
- `saida_date?: string` - Data real da saída (quando diferente de base_date)
- `entrada_almoco_date?: string` - Data real do início almoço
- `saida_almoco_date?: string` - Data real do fim almoço
- `entrada_extra1_date?: string` - Data real da entrada extra
- `saida_extra1_date?: string` - Data real da saída extra

### 2. Nova Função RPC no Backend

Substituída a busca antiga (`EntityService.list`) pela nova função RPC:
- **Função**: `get_consolidated_time_record_by_window`
- **Parâmetros**: `p_employee_id`, `p_company_id`, `p_target_date`, `p_timezone`
- **Retorno**: Registro consolidado com todas as marcações dentro da janela de tempo

### 3. Nova Função de Formatação

Criada função `formatTimeWithDate` que:
- Formata apenas o horário quando a data é igual à base_date
- Formata horário + data quando a data é diferente (ex: "00:20 (26/01)")

### 4. Exibição Atualizada

Os cards de marcação agora:
- Mostram horário simples quando a marcação é do mesmo dia
- Mostram horário + data quando a marcação é do dia seguinte
- Exemplo: "00:20 (26/01)" para saída às 00:20 do dia 26

### 5. Query Key Atualizada

Todas as referências à query key foram atualizadas:
- Antiga: `['today-time-record', ...]`
- Nova: `['today-time-record-consolidated', ...]`

## Arquivos Modificados

- `src/pages/portal-colaborador/RegistroPontoPage.tsx`

## Comportamento Esperado

### Exemplo 1: Turno Noturno (15h de janela)
**Registros no banco**:
- Dia 25/01: Entrada 16:00
- Dia 26/01: Saída 00:20

**Exibição na interface**:
- Entrada: 16:00
- Saída: 00:20 (26/01) ✅

### Exemplo 2: Horas Extras no Dia Seguinte
**Registros no banco**:
- Dia 25/01: Entrada 16:00, Saída 00:20
- Dia 26/01: Entrada Extra 00:21, Saída Extra 02:00

**Exibição na interface**:
- Entrada: 16:00
- Saída: 00:20 (26/01)
- Entrada Extra: 00:21 (26/01) ✅
- Saída Extra: 02:00 (26/01) ✅

## Validação

✅ Interface atualizada para usar função RPC consolidada
✅ Exibição mostra datas reais quando diferentes
✅ Query keys atualizadas
✅ Sem erros de lint
✅ Compatibilidade mantida com registros offline

## Próximos Passos

1. Testar em ambiente de desenvolvimento
2. Validar com diferentes configurações de janela (12h, 15h, 20h, 22h, 24h)
3. Testar com turnos noturnos reais
4. Validar que registros offline continuam funcionando
