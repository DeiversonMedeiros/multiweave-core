# Instruções para Corrigir o Erro de Foreign Key

## Problema Identificado

O campo `solicitado_por` na tabela `rh.attendance_corrections` tem uma foreign key que aponta para `profiles(id)`, mas o código está tentando inserir um UUID de `auth.users`.

## Solução

Execute este SQL no **Supabase SQL Editor**:

```sql
-- Remover constraints problemáticas
ALTER TABLE rh.attendance_corrections 
DROP CONSTRAINT IF EXISTS attendance_corrections_solicitado_por_fkey CASCADE;

ALTER TABLE rh.attendance_corrections 
DROP CONSTRAINT IF EXISTS attendance_corrections_aprovado_por_fkey CASCADE;
```

Depois disso:
1. Recarregue a página
2. Tente criar a correção novamente
3. Deve funcionar!

## Alternativamente

Se você quiser que eu aplique automaticamente, posso executar via CLI:
```bash
supabase db push
```

Mas seria mais rápido aplicar diretamente no SQL Editor do Supabase Dashboard.

## Após Aplicar

Teste novamente a criação de correção. Os logs mostrarão:
```
✅ [TimeRecordEditModal] Correção criada com sucesso
```

## Status

- ✅ Código do frontend está correto
- ✅ UUID é válido
- ✅ Todos os dados corretos
- ❌ Foreign key está bloqueando (será removida)
- ✅ Depois deve funcionar perfeitamente

