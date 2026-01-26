# Solução Corrigida: Problema de Registro de Ponto com Janela de Tempo

## Entendimento Correto

### ✅ Comportamento Esperado

**Banco de Dados** (NÃO MUDAR):
- Entrada: 25/01/2026 16:00 → `data_registro = '2026-01-25'` ✅
- Saída: 26/01/2026 00:20 → `data_registro = '2026-01-26'` ✅ (data real do timestamp)

**Interface** (CORRIGIR):
- Deve buscar registros do dia atual E do dia seguinte
- Deve agrupar registros que estão dentro da janela de tempo
- Deve exibir com as datas reais de cada marcação:
  - Entrada: 25/01/2026 16:00
  - Início Almoço: 25/01/2026 20:00
  - Saída Almoço: 25/01/2026 21:00
  - Saída: 26/01/2026 00:20 (com data visível)
  - Horas Extras: 26/01/2026 00:21 - 26/01/2026 02:00 (se dentro da janela)

## Solução Implementada

### 1. Função RPC no Backend

**Arquivo**: `supabase/migrations/20260126000001_get_consolidated_time_record_by_window.sql`

**Função**: `get_consolidated_time_record_by_window`

**Funcionalidade**:
- Busca registro do dia alvo (`p_target_date`)
- Busca registro do dia seguinte (`p_target_date + 1 day`)
- Verifica quais marcações do dia seguinte estão dentro da janela de tempo
- Retorna registro consolidado com campos adicionais `*_date` indicando a data real

**Estrutura de Retorno**:
```json
{
  "id": "...",
  "data_registro": "2026-01-25",
  "entrada": "16:00:00",
  "entrada_almoco": "20:00:00",
  "saida_almoco": "21:00:00",
  "saida": "00:20:00",  // Do dia seguinte
  "saida_date": "2026-01-26",  // Data real da saída
  "entrada_extra1": "00:21:00",  // Do dia seguinte
  "entrada_extra1_date": "2026-01-26",  // Data real
  "saida_extra1": "02:00:00",  // Do dia seguinte
  "saida_extra1_date": "2026-01-26",  // Data real
  "base_date": "2026-01-25",
  "window_hours": 15
}
```

### 2. Ajustes no Frontend (Próximo Passo)

**Arquivo**: `src/pages/portal-colaborador/RegistroPontoPage.tsx`

**Mudanças necessárias**:
1. Substituir busca atual por chamada à função RPC `get_consolidated_time_record_by_window`
2. Ajustar exibição para mostrar datas reais quando diferentes de `base_date`
3. Manter compatibilidade com registros offline

## Próximos Passos

1. ✅ Função RPC criada
2. ⏳ Ajustar `RegistroPontoPage.tsx` para usar a nova função
3. ⏳ Ajustar componente de exibição para mostrar datas reais
4. ⏳ Testar com diferentes configurações de janela
5. ⏳ Validar com turnos noturnos reais

## Exemplo de Uso

```typescript
// No frontend
const { data } = await supabase.rpc('get_consolidated_time_record_by_window', {
  p_employee_id: employeeId,
  p_company_id: companyId,
  p_target_date: '2026-01-25',
  p_timezone: 'America/Sao_Paulo'
});

// Resultado inclui todas as marcações do "dia de trabalho"
// com campos *_date indicando datas reais quando diferentes
```

## Validação

### Caso 1: Turno Noturno (15h de janela)
- Entrada: 25/01 16:00 → `data_registro = '2026-01-25'`
- Saída: 26/01 00:20 → `data_registro = '2026-01-26'`
- **Interface**: Mostra ambos agrupados, com `saida_date = '2026-01-26'` ✅

### Caso 2: Horas Extras no Dia Seguinte
- Entrada: 25/01 16:00 → `data_registro = '2026-01-25'`
- Entrada Extra: 26/01 00:21 → `data_registro = '2026-01-26'`
- Saída Extra: 26/01 02:00 → `data_registro = '2026-01-26'`
- **Interface**: Mostra todos agrupados, com datas reais visíveis ✅
