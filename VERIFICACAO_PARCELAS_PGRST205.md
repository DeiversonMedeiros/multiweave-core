# Verificação de Acessos - Tabela de Parcelas (PGRST205)

## ✅ Correções Implementadas

### 1. **Hook para Parcelas Criado**
- ✅ `src/hooks/financial/useContasPagarParcelas.ts` criado
- ✅ Usa `EntityService` para todas as operações (list, create, update, delete)
- ✅ Não há acessos diretos via `supabase.from('financeiro.contas_pagar_parcelas')`

### 2. **Função RPC Wrapper Criada**
- ✅ Função wrapper `public.generate_titulo_number_parcela` criada na migração
- ✅ Chama a função original `financeiro.generate_titulo_number_parcela`
- ✅ Permissões concedidas para `authenticated` e `anon`

**Arquivo**: `supabase/migrations/20251115000002_create_contas_pagar_parcelas.sql`

### 3. **Verificação de Acessos Diretos**
- ✅ Nenhum acesso direto encontrado à tabela `contas_pagar_parcelas`
- ✅ Todos os acessos usam `EntityService` através do hook criado

## ⚠️ Acessos Diretos Encontrados (Outras Tabelas)

Os seguintes arquivos ainda têm acessos diretos a tabelas do schema `financeiro` que precisam ser corrigidos:

### 1. `src/services/rh/financialIntegrationService.ts`
- ❌ Acesso direto: `supabase.from('financeiro.accounts_payable')`
- **Linhas**: 159, 284, 324, 381, 400
- **Ação necessária**: Substituir por `EntityService`

### 2. `src/hooks/rh/useFinancialIntegration.ts`
- ❌ Acesso direto: `supabase.from('financeiro.accounts_payable')`
- **Ação necessária**: Substituir por `EntityService` ou hook específico

### 3. `src/services/offlineSyncService.ts`
- ❌ Acesso direto: `supabase.from('financeiro.reimbursement_requests')`
- **Ação necessária**: Substituir por `EntityService`

## 📋 Padrão de Correção

### ❌ ANTES (Incorreto):
```tsx
const { data, error } = await supabase
  .from('financeiro.accounts_payable')
  .insert(apData)
  .select()
  .single();
```

### ✅ DEPOIS (Correto):
```tsx
const result = await EntityService.create({
  schema: 'financeiro',
  table: 'accounts_payable',
  companyId: companyId,
  data: apData
});
```

## 🔧 Próximos Passos

1. **Aplicar migração atualizada** (se ainda não aplicou):
   ```bash
   supabase db push
   ```

2. **Corrigir acessos diretos encontrados** nos 3 arquivos listados acima

3. **Testar criação de parcelas**:
   - Criar uma conta a pagar parcelada
   - Verificar se as parcelas são criadas corretamente
   - Verificar se não há erros PGRST205

## ✅ Status da Tabela de Parcelas

- ✅ Tabela criada: `financeiro.contas_pagar_parcelas`
- ✅ Hook criado usando `EntityService`
- ✅ Função RPC wrapper criada
- ✅ Nenhum acesso direto encontrado
- ✅ Pronto para uso (após aplicar migração)


















