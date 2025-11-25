# Análise Completa do Esquema Financeiro

## Dados Existentes no Banco

### Tabelas com Dados:
1. **contas_bancarias**: 1 registro
   - company_id: `a9784891-9d58-4cc4-8404-18032105c335`
   - banco_nome: BANCO BRADESCO S.A.
   - agencia: 1234
   - conta: 12345-6
   - saldo_atual: 50000.00
   - is_active: true

2. **configuracao_fiscal**: 1 registro
   - company_id: `a9784891-9d58-4cc4-8404-18032105c335`

### Tabelas Vazias:
- contas_pagar: 0 registros
- contas_receber: 0 registros
- plano_contas: 0 registros
- lancamentos_contabeis: 0 registros
- nfe: 0 registros
- nfse: 0 registros
- fluxo_caixa: 0 registros
- conciliacoes_bancarias: 0 registros

## Estrutura das Tabelas

### contas_bancarias (17 colunas):
- id (uuid)
- company_id (uuid)
- banco_codigo (varchar)
- banco_nome (varchar)
- agencia (varchar)
- conta (varchar)
- tipo_conta (varchar)
- moeda (varchar)
- saldo_atual (numeric)
- saldo_disponivel (numeric)
- limite_credito (numeric)
- data_saldo (date)
- is_active (boolean)
- observacoes (text)
- created_by (uuid)
- created_at (timestamp)
- updated_at (timestamp)

## Problemas Identificados

1. **Validação de companyId**: O hook `useEntityData` valida se `companyId` não é vazio, mas quando `selectedCompany?.id` é `undefined`, passamos `''` (string vazia), e a query não é executada.

2. **Extração de Dados JSONB**: A função RPC retorna dados no formato `{id, data: jsonb, total_count}`, e o EntityService precisa extrair o campo `data` de cada item. O código parece correto, mas pode haver problemas quando o JSONB não está sendo parseado corretamente pelo Supabase client.

3. **Permissões**: A função RPC requer autenticação (`auth.uid()` não pode ser NULL), então quando chamada via Supabase client, precisa estar autenticado.

## Correções Necessárias

1. ✅ Corrigir validação de `companyId` em `useEntityData` para não executar query quando `companyId` é vazio
2. ⚠️ Verificar se `selectedCompany?.id` corresponde ao `company_id` do banco
3. ⚠️ Adicionar logs mais detalhados para debug
4. ⚠️ Verificar se há problemas na extração dos dados do JSONB

## Próximos Passos

1. Verificar se `selectedCompany?.id` corresponde ao `company_id` do banco (`a9784891-9d58-4cc4-8404-18032105c335`)
2. Adicionar logs mais detalhados no EntityService para ver o que está sendo retornado
3. Testar a função RPC diretamente com um usuário autenticado
4. Verificar se há problemas na forma como os dados estão sendo extraídos do JSONB

