# Análise do Problema: Registros não aparecem na página "Controle de Ponto"

## Problema Identificado

O registro do usuário "teste17" (ID: `26780476-5646-4fd1-b2a6-71d439fd497f`) na empresa "Axiseng" (company_id: `dc060329-50cd-4114-922f-624a6ab036d6`) não aparece na página.

## Possíveis Causas

### 1. ORDER BY com NULL (MAIS PROVÁVEL)
A função `get_time_records_simple` usa:
```sql
ORDER BY tr.data_registro DESC, e.nome;
```

Quando o employee não existe ou `e.nome` é NULL, a ordenação pode causar problemas e alguns registros podem não aparecer corretamente.

**Solução**: Usar `COALESCE(e.nome, '')` no ORDER BY.

### 2. Filtros de Data no Cliente
Os filtros de data são aplicados no cliente após buscar todos os registros:
- Intervalo padrão: 90 dias (já corrigido de 30 para 90)
- O registro de hoje (2025-11-19) deve estar dentro do intervalo

### 3. Filtro de Busca
O filtro de busca verifica `employee_nome`, mas se for NULL, pode não funcionar corretamente.

**Solução**: Já corrigido para tratar NULL adequadamente.

### 4. Verificação de Acesso
A função RPC verifica se o usuário tem acesso à empresa via `user_companies`. Se o usuário não tiver acesso, a função lança exceção.

## Correções Aplicadas

1. ✅ Aumentado intervalo padrão de 30 para 90 dias
2. ✅ Melhorado filtro de busca para tratar NULL
3. ✅ Criada migração para corrigir ORDER BY

## Próximos Passos

1. Aplicar a migração `20251119000001_fix_time_records_simple_order_by.sql`
2. Verificar se o employee existe na tabela `rh.employees`
3. Verificar se o usuário tem acesso à empresa na tabela `user_companies`







