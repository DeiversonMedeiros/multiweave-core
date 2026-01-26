# 🔍 Análise do Erro 500 - Follow-up de Compras

## Data: 2026-01-24

---

## ❌ Problemas Identificados

### 1. Coluna `data_cotacao` não existe
- **Tabela:** `compras.cotacao_ciclos`
- **Problema:** A função SQL referencia `cc.data_cotacao`, mas essa coluna não existe
- **Solução:** Usar `cc.created_at::DATE as data_cotacao`

### 2. Tipo de `prazo_resposta` incorreto
- **Tabela:** `compras.cotacao_ciclos`
- **Problema:** A função declara `prazo_resposta INTEGER`, mas no banco é `DATE`
- **Solução:** Alterar para `prazo_resposta DATE`

### 3. Função não criada no banco
- **Problema:** A migração falhou, então a função não existe
- **Solução:** Corrigir a migração e executar novamente

---

## ✅ Correções Aplicadas

### 1. Correção da CTE `cotacoes`
```sql
-- ANTES (ERRADO):
cc.data_cotacao,

-- DEPOIS (CORRETO):
cc.created_at::DATE as data_cotacao,
```

### 2. Correção do tipo `prazo_resposta`
```sql
-- ANTES (ERRADO):
prazo_resposta INTEGER,

-- DEPOIS (CORRETO):
prazo_resposta DATE,
```

### 3. Estrutura Real das Tabelas

#### `compras.requisicoes_compra`
- ✅ `data_solicitacao` (DATE) - existe
- ✅ `workflow_state` (TEXT) - existe
- ✅ `status` (ENUM) - existe

#### `compras.cotacao_ciclos`
- ❌ `data_cotacao` (DATE) - **NÃO EXISTE**
- ✅ `created_at` (TIMESTAMP) - existe (usar este)
- ✅ `prazo_resposta` (DATE) - existe
- ✅ `workflow_state` (TEXT) - existe
- ✅ `status` (TEXT) - existe

#### `compras.pedidos_compra`
- ✅ `data_pedido` (DATE) - existe
- ✅ `data_entrega_prevista` (DATE) - existe
- ✅ `data_entrega_real` (DATE) - existe
- ✅ `workflow_state` (TEXT) - existe
- ✅ `status` (ENUM) - existe

#### `financeiro.contas_pagar`
- ✅ `data_vencimento` (DATE) - existe
- ✅ `status` (VARCHAR) - existe
- ✅ `pedido_id` (UUID) - existe

#### `almoxarifado.entradas_materiais`
- ✅ `numero_nota` (VARCHAR) - existe (não `numero_documento`)
- ✅ `data_entrada` (DATE) - existe
- ✅ `status` (VARCHAR) - existe
- ❌ `tipo_entrada` - **NÃO EXISTE**
- ❌ `updated_at` - **NÃO EXISTE**

---

## 📝 Migração Corrigida

A migração `20260124000004_create_followup_compras_function.sql` foi corrigida com:

1. ✅ Uso de `created_at::DATE` em vez de `data_cotacao`
2. ✅ Tipo `DATE` para `prazo_resposta` em vez de `INTEGER`
3. ✅ Uso de `numero_nota` em vez de `numero_documento`
4. ✅ Remoção de referências a `tipo_entrada` e `updated_at` da tabela `entradas_materiais`
5. ✅ Função wrapper no schema `public` para permitir chamada via RPC

---

## 🚀 Próximos Passos

1. Executar a migração corrigida
2. Testar a função diretamente no banco:
   ```sql
   SELECT * FROM public.get_followup_compras(
       'company-id-aqui'::UUID,
       NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
   ) LIMIT 5;
   ```
3. Verificar se a função está acessível via RPC do Supabase

---

**Fim da Análise**
