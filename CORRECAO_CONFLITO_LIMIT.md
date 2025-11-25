# CORREÇÃO DO CONFLITO DE PARÂMETROS LIMIT

## 🔍 **Problema Identificado**
O erro `syntax error at or near "limit"` estava sendo causado por um conflito de parâmetros:

**Logs mostravam:**
```json
{
  "filters": {
    "limit": 50  // ❌ Conflito: parâmetro de paginação nos filtros
  },
  "limit_param": 100,  // ✅ Parâmetro correto para a função SQL
  "offset_param": 0
}
```

## 🛠️ **Correção Aplicada**

### 1. **Filtros Limpos no EntityService**
- Removidos parâmetros de paginação dos filtros SQL
- Parâmetros removidos: `limit`, `offset`, `page`, `pageSize`
- Mantidos apenas filtros de dados reais

### 2. **Logs Detalhados Adicionados**
- Log dos filtros originais
- Log dos parâmetros de paginação
- Log de cada filtro sendo processado
- Log dos filtros finais limpos

## 📁 **Arquivo Modificado**
- `src/services/generic/entityService.ts` - Correção do conflito de parâmetros

## 🔧 **Código da Correção**

```typescript
// ANTES (❌ Causava conflito)
const cleanFilters = Object.entries(filters).reduce((acc, [key, value]) => {
  if (value && value !== 'all') {
    acc[key] = value;  // Incluía 'limit' nos filtros
  }
  return acc;
}, {} as Record<string, any>);

// DEPOIS (✅ Sem conflito)
const cleanFilters = Object.entries(filters).reduce((acc, [key, value]) => {
  // Pular parâmetros de paginação que não devem ir para os filtros SQL
  if (key === 'limit' || key === 'offset' || key === 'page' || key === 'pageSize') {
    return acc;  // Remove parâmetros de paginação dos filtros
  }
  
  if (value && value !== 'all') {
    acc[key] = value;
  }
  return acc;
}, {} as Record<string, any>);
```

## 🎯 **Resultado Esperado**

Agora os logs devem mostrar:
```json
{
  "filters": {},  // ✅ Filtros limpos (sem parâmetros de paginação)
  "limit_param": 100,  // ✅ Parâmetro correto para SQL
  "offset_param": 0
}
```

## 🚀 **Teste**

1. **Recarregue a página** do módulo Frota
2. **Verifique os logs** no console:
   - Deve mostrar "Removendo parâmetro de paginação: limit = 50"
   - Deve mostrar "cleanFilters: {}"
3. **O erro SQL deve desaparecer**

## 📝 **Explicação Técnica**

O problema ocorria porque:
1. O hook `useVehicles` passava `limit: 50` nos filtros
2. O EntityService também passava `limit_param: 100` 
3. A função SQL recebia ambos os parâmetros
4. Isso causava conflito na construção da query SQL

A correção separa claramente:
- **Filtros de dados**: Para WHERE clauses
- **Parâmetros de paginação**: Para LIMIT/OFFSET
