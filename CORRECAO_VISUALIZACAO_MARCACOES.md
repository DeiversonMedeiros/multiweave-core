# Correção: Visualização de Marcações no Portal do Colaborador

## Problema
A aba "Correção de Ponto" no Portal do Colaborador não estava mostrando as marcações já realizadas no calendário.

## Análise
O problema estava na função RPC `get_entity_data` que busca os registros de ponto. A função tinha um conflito entre construção dinâmica de query e uso de parâmetros `USING`.

## Correções Aplicadas

### 1. Função get_entity_data Simplificada
- **Arquivo**: `supabase/migrations/20250126000002_fix_get_entity_data_final.sql`
- Removido o uso de `EXECUTE ... USING` com parâmetros estáticos
- Query agora é construída completamente dinamicamente
- Filtros de data (`data_registro_gte` e `data_registro_lte`) agora são processados corretamente

### 2. Debug Logs Adicionados
- **Arquivo**: `src/hooks/rh/useMonthlyTimeRecords.ts`
- Adicionados logs detalhados para rastrear:
  - Parâmetros da busca
  - Resultado da função RPC
  - Processamento dos registros
  - Organização por data

## Como Testar

1. **Verificar logs no console do navegador**
   - Abra o Portal do Colaborador
   - Vá para "Correção de Ponto"
   - Abra o DevTools (F12)
   - Verifique os logs no console

2. **Verificar se há registros no banco**
   - Execute o script SQL: `debug_time_records_query.sql`

3. **Testar a função RPC diretamente**
   - Use o script: `test_get_entity_data.sql`

## Próximos Passos

1. Aplicar a migração no banco de dados (já foi aplicado pelo usuário)
2. Verificar se existem registros de ponto no banco
3. Testar no navegador e verificar os logs
4. Se não houver registros, criar registros de teste

## Comandos Úteis

### Aplicar migração
```bash
supabase db push
```

### Verificar registros
```bash
# No Supabase Dashboard SQL Editor, execute:
SELECT COUNT(*) FROM rh.time_records;
```

### Ver logs
- Abra o console do navegador
- Procure por logs com emoji 🔍 📊 📅 ✅

