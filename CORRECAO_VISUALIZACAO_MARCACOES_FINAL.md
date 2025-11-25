# Correção: Visualização de Marcações no Portal do Colaborador

## Problemas Identificados

1. **`recordsByDate` estava `undefined`**: O hook `useMonthlyTimeRecords` retorna um objeto `data` via `useQuery`, mas a página estava tentando acessar diretamente.
2. **`EntityService.upsert` não existia**: O modal de edição tentava usar um método que não existia.

## Correções Aplicadas

### 1. Correção na Página CorrecaoPontoPage.tsx

**Antes:**
```typescript
const { 
  recordsByDate, 
  isLoading: recordsLoading, 
  error: recordsError 
} = useMonthlyTimeRecords(selectedYear, selectedMonth);
```

**Depois:**
```typescript
const { 
  data: monthlyRecords,
  isLoading: recordsLoading, 
  error: recordsError 
} = useMonthlyTimeRecords(selectedYear, selectedMonth);

const recordsByDate = monthlyRecords?.recordsByDate || {};
```

**Arquivo modificado**: `src/pages/portal-colaborador/CorrecaoPontoPage.tsx`

### 2. Adicionado método `upsert` ao EntityService

**Arquivo modificado**: `src/services/generic/entityService.ts`

Adicionado método:
```typescript
upsert: async <T = any>(params: {
  schema: string;
  table: string;
  companyId: string;
  data: Partial<T>;
  id?: string;
}): Promise<T>
```

### 3. Logs de Debug Adicionados

**Arquivo modificado**: `src/hooks/rh/useMonthlyTimeRecords.ts`

Adicionados logs para rastrear:
- Parâmetros de busca
- Resultado da função RPC
- Processamento dos registros
- Organização por data

### 4. Migração de Banco de Dados

**Arquivo criado**: `supabase/migrations/20250126000002_fix_get_entity_data_final.sql`

Corrige a função `get_entity_data` para processar filtros de data corretamente.

## Como Testar

1. **Recarregue a página** do Portal do Colaborador
2. **Vá para a aba "Correção de Ponto"**
3. **Verifique os logs no console**:
   - Os logs devem mostrar `recordsByDate` não como `undefined`, mas como um objeto com os registros
   - Você deve ver logs como `📅 [useMonthlyTimeRecords] Processando registro`

4. **Verifique se as marcações aparecem no calendário**

## Comandos para Verificar

### No navegador (DevTools):
```javascript
// Procure por logs como:
📅 [DEBUG] CorrecaoPontoPage - recordsByDate: Object
📅 [useMonthlyTimeRecords] Processando registro: Object
```

### No banco de dados:
```sql
-- Verificar se existem registros
SELECT COUNT(*) FROM rh.time_records;

-- Ver registros do mês atual
SELECT * FROM rh.time_records 
WHERE data_registro >= '2025-10-01' 
  AND data_registro <= '2025-10-31'
ORDER BY data_registro DESC;
```

## Status

✅ Corrigido: Acesso aos dados do hook  
✅ Corrigido: Método upsert adicionado  
✅ Adicionado: Logs de debug detalhados  
✅ Criado: Migração para correção da função SQL  

## Próximos Passos

1. **Verificar se existem registros no banco**
   - Se não houver registros, criar alguns para testar
   
2. **Testar criação de novos registros**
   - Clicar em um dia no calendário
   - Preencher os campos de horário
   - Salvar e verificar se aparece no calendário

3. **Se ainda não aparecer:**
   - Verificar os logs completos no console
   - Verificar se há erros na função RPC `get_entity_data`
   - Verificar permissões de acesso à tabela `time_records`

