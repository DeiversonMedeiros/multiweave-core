# Análise Corrigida: Problema de Registro de Ponto com Janela de Tempo

## Entendimento Correto do Problema

### Comportamento Esperado (CORRETO)

**Banco de Dados**:
- Entrada: 25/01/2026 16:00 → `data_registro = '2026-01-25'` ✅
- Saída: 26/01/2026 00:20 → `data_registro = '2026-01-26'` ✅ (data real do timestamp)

**Interface (portal-colaborador/registro-ponto)**:
- Deve mostrar TODOS os registros agrupados considerando a janela de tempo
- Entrada: 25/01/2026 16:00
- Início Almoço: 25/01/2026 20:00
- Saída Almoço: 25/01/2026 21:00
- Saída: 26/01/2026 00:20 (com data visível para o colaborador)
- Horas Extras: 26/01/2026 00:21 - 26/01/2026 02:00 (se dentro da janela)

### Comportamento Atual (INCORRETO)

**Problema na Interface**:
- Busca apenas registros com `data_registro = hoje`
- Não busca registros do dia seguinte que estão dentro da janela de tempo
- Não agrupa registros corretamente

## Solução Correta

### 1. Banco de Dados (NÃO MUDAR)

A função `register_time_record` deve **continuar registrando com a data real do timestamp**:
- Não alterar o `data_registro` baseado na janela de tempo
- Cada marcação é registrada com sua data real

### 2. Interface (CORRIGIR)

A lógica de busca e agrupamento deve:

1. **Buscar registros do dia atual E do dia seguinte**
2. **Verificar se registros do dia seguinte estão dentro da janela de tempo**
3. **Agrupar e exibir todos os registros que pertencem ao mesmo "dia de trabalho"**
4. **Mostrar as datas reais de cada marcação na interface**

## Implementação

### Opção 1: Função RPC no Backend (RECOMENDADA)

Criar função RPC que:
- Recebe: `employee_id`, `company_id`, `target_date`, `window_hours`
- Busca registros do `target_date` e `target_date + 1 day`
- Agrupa registros considerando a janela de tempo
- Retorna registro consolidado com todas as marcações

**Vantagens**:
- Lógica centralizada no backend
- Performance melhor (menos dados transferidos)
- Reutilizável em outras partes do sistema

### Opção 2: Lógica no Frontend

Ajustar a query no `RegistroPontoPage.tsx` para:
- Buscar registros do dia atual E do dia seguinte
- Agrupar no frontend considerando a janela de tempo
- Exibir com datas reais

**Desvantagens**:
- Lógica duplicada se usado em outros lugares
- Mais processamento no cliente

## Estrutura de Dados Retornada

```typescript
interface ConsolidatedTimeRecord {
  // Data base do registro (data da primeira marcação)
  base_date: string; // '2026-01-25'
  
  // Marcações com suas datas reais
  marks: {
    entrada: { time: '16:00', date: '2026-01-25' },
    entrada_almoco: { time: '20:00', date: '2026-01-25' },
    saida_almoco: { time: '21:00', date: '2026-01-25' },
    saida: { time: '00:20', date: '2026-01-26' }, // Data real
    entrada_extra1: { time: '00:21', date: '2026-01-26' }, // Data real
    saida_extra1: { time: '02:00', date: '2026-01-26' } // Data real
  }
}
```

## Próximos Passos

1. ✅ Reverter mudança na função `register_time_record` (manter comportamento atual)
2. ✅ Criar função RPC para buscar registros agrupados por janela de tempo
3. ✅ Ajustar `RegistroPontoPage.tsx` para usar a nova função
4. ✅ Ajustar exibição para mostrar datas reais de cada marcação
