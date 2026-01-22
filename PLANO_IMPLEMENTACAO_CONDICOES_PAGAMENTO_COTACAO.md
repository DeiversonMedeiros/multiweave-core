# Plano de Implementação: Condições de Pagamento na Cotação

## 📋 Análise do Estado Atual

### ✅ O que já está funcionando:

1. **Automatização de Pedido e Conta a Pagar:**
   - ✅ Quando uma cotação é aprovada, o sistema cria automaticamente um pedido de compra
   - ✅ Para cada pedido criado, o sistema cria automaticamente uma conta a pagar
   - ✅ Função: `compras.criar_pedido_apos_aprovacao_cotacao_ciclos()`
   - ✅ Função: `compras.criar_conta_pagar()`

2. **Estrutura de Contas a Pagar:**
   - ✅ Tabela `financeiro.contas_pagar` possui:
     - `forma_pagamento` (VARCHAR) - PIX, Cartão, À vista, Transferência bancária
     - `is_parcelada` (BOOLEAN) - Indica se é parcelada
     - `numero_parcelas` (INTEGER) - Número de parcelas
     - `intervalo_parcelas` (VARCHAR) - Intervalo entre parcelas (30, 60, 90, etc.)
   - ✅ Tabela `financeiro.contas_pagar_parcelas` para gerenciar parcelas individuais

3. **Modal "Gerar Cotação":**
   - ✅ Possui campo `condicao_pagamento` (texto livre) no fornecedor
   - ✅ Campo é salvo em `compras.cotacao_fornecedores.condicoes_comerciais`
   - ✅ Campo também existe em `compras.cotacao_item_fornecedor.condicao_pagamento`

### ❌ O que está faltando:

1. **Campos de Condições de Pagamento no Modal:**
   - ❌ Não há campos estruturados para:
     - Forma de pagamento (PIX, Cartão, À vista, Transferência bancária)
     - Parcelamento (Sim/Não)
     - Número de parcelas (30, 60, 90, 120, 150, 180 dias)
     - Intervalo entre parcelas

2. **Vinculação entre Pedido e Conta a Pagar:**
   - ❌ Não há campo `pedido_id` na tabela `financeiro.contas_pagar`
   - ❌ A vinculação é feita apenas através de `observacoes` (texto livre)
   - ❌ Não há foreign key entre as tabelas

3. **Propagação de Condições de Pagamento:**
   - ❌ As condições de pagamento da cotação não são propagadas para:
     - O pedido de compra
     - A conta a pagar gerada automaticamente

4. **Estrutura do Pedido:**
   - ❌ Tabela `compras.pedidos_compra` não possui campos para condições de pagamento
   - ❌ Não há forma de armazenar as condições acordadas na cotação

## 🎯 Objetivos da Implementação

1. Adicionar campos estruturados de condições de pagamento no modal "Gerar Cotação"
2. Salvar condições de pagamento na cotação (por fornecedor)
3. Propagar condições de pagamento para o pedido de compra
4. Criar vinculação explícita entre pedido e conta a pagar
5. Aplicar condições de pagamento na conta a pagar gerada automaticamente
6. Suportar parcelamento automático (30, 60, 90, 120, 150, 180 dias)

## 📐 Estrutura Proposta

### 1. Banco de Dados

#### 1.1. Adicionar campos em `compras.cotacao_fornecedores`:
```sql
ALTER TABLE compras.cotacao_fornecedores
ADD COLUMN IF NOT EXISTS forma_pagamento VARCHAR(50),
ADD COLUMN IF NOT EXISTS is_parcelada BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS numero_parcelas INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS intervalo_parcelas VARCHAR(20) DEFAULT '30'; -- '30', '60', '90', '120', '150', '180'
```

#### 1.2. Adicionar campos em `compras.pedidos_compra`:
```sql
ALTER TABLE compras.pedidos_compra
ADD COLUMN IF NOT EXISTS forma_pagamento VARCHAR(50),
ADD COLUMN IF NOT EXISTS is_parcelada BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS numero_parcelas INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS intervalo_parcelas VARCHAR(20) DEFAULT '30';
```

#### 1.3. Adicionar vinculação em `financeiro.contas_pagar`:
```sql
ALTER TABLE financeiro.contas_pagar
ADD COLUMN IF NOT EXISTS pedido_id UUID REFERENCES compras.pedidos_compra(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_contas_pagar_pedido_id ON financeiro.contas_pagar(pedido_id);
```

### 2. Interface do Modal "Gerar Cotação"

#### 2.1. Adicionar seção "Condições de Pagamento" por fornecedor:
- **Forma de Pagamento:** Select com opções:
  - PIX
  - Cartão de Crédito
  - Cartão de Débito
  - À Vista
  - Transferência Bancária
- **Parcelamento:** Checkbox "Parcelar"
- **Número de Parcelas:** Input numérico (quando parcelado)
- **Intervalo entre Parcelas:** Select com opções:
  - 30 dias
  - 60 dias
  - 90 dias
  - 120 dias
  - 150 dias
  - 180 dias

#### 2.2. Localização no Modal:
- Adicionar na seção de cada fornecedor (junto com frete, desconto, etc.)
- Ou criar uma aba separada "Condições de Pagamento"

### 3. Atualizar Função `compras.criar_pedido_apos_aprovacao_cotacao_ciclos()`

Propagar condições de pagamento do fornecedor para o pedido:
```sql
-- Ao criar o pedido, incluir:
forma_pagamento := v_fornecedor.forma_pagamento,
is_parcelada := v_fornecedor.is_parcelada,
numero_parcelas := v_fornecedor.numero_parcelas,
intervalo_parcelas := v_fornecedor.intervalo_parcelas
```

### 4. Atualizar Função `compras.criar_conta_pagar()`

#### 4.1. Receber condições de pagamento do pedido:
```sql
-- Buscar condições do pedido
SELECT forma_pagamento, is_parcelada, numero_parcelas, intervalo_parcelas
INTO v_forma_pagamento, v_is_parcelada, v_numero_parcelas, v_intervalo_parcelas
FROM compras.pedidos_compra
WHERE id = p_pedido_id;
```

#### 4.2. Aplicar na conta a pagar:
```sql
-- Inserir com condições de pagamento
INSERT INTO financeiro.contas_pagar (
    ...,
    forma_pagamento,
    is_parcelada,
    numero_parcelas,
    intervalo_parcelas,
    pedido_id
) VALUES (
    ...,
    v_forma_pagamento,
    v_is_parcelada,
    v_numero_parcelas,
    v_intervalo_parcelas,
    p_pedido_id
);
```

#### 4.3. Criar parcelas automaticamente (se parcelado):
```sql
-- Se is_parcelada = true, criar parcelas
IF v_is_parcelada AND v_numero_parcelas > 1 THEN
    FOR i IN 1..v_numero_parcelas LOOP
        -- Calcular valor da parcela
        v_valor_parcela := v_pedido.valor_final / v_numero_parcelas;
        
        -- Calcular data de vencimento
        v_data_vencimento := CURRENT_DATE + (i * v_intervalo_parcelas::INTEGER);
        
        -- Criar parcela
        INSERT INTO financeiro.contas_pagar_parcelas (...)
        VALUES (...);
    END LOOP;
END IF;
```

## 📝 Plano de Implementação

### Fase 1: Estrutura do Banco de Dados (Prioridade: Alta)
- [ ] Criar migração para adicionar campos em `cotacao_fornecedores`
- [ ] Criar migração para adicionar campos em `pedidos_compra`
- [ ] Criar migração para adicionar `pedido_id` em `contas_pagar`
- [ ] Criar índices necessários
- [ ] Testar migrações

### Fase 2: Interface do Modal (Prioridade: Alta)
- [ ] Adicionar campos de condições de pagamento no `ModalGerarCotacao.tsx`
- [ ] Adicionar validações (se parcelado, número de parcelas obrigatório)
- [ ] Salvar condições de pagamento ao criar/atualizar cotação
- [ ] Carregar condições de pagamento ao editar cotação
- [ ] Testar interface

### Fase 3: Propagação para Pedido (Prioridade: Alta)
- [ ] Atualizar função `criar_pedido_apos_aprovacao_cotacao_ciclos()`
- [ ] Incluir condições de pagamento ao criar pedido
- [ ] Testar criação de pedido com condições

### Fase 4: Propagação para Conta a Pagar (Prioridade: Alta)
- [ ] Atualizar função `criar_conta_pagar()`
- [ ] Incluir condições de pagamento ao criar conta
- [ ] Adicionar `pedido_id` na conta criada
- [ ] Implementar criação automática de parcelas
- [ ] Testar criação de conta com parcelamento

### Fase 5: Visualização e Relatórios (Prioridade: Média)
- [ ] Exibir condições de pagamento na visualização da cotação
- [ ] Exibir condições de pagamento no pedido de compra
- [ ] Exibir vinculação pedido-conta na conta a pagar
- [ ] Adicionar filtros por forma de pagamento

### Fase 6: Testes e Validações (Prioridade: Alta)
- [ ] Testar fluxo completo: Cotação → Pedido → Conta a Pagar
- [ ] Testar parcelamento automático
- [ ] Testar diferentes formas de pagamento
- [ ] Validar cálculos de parcelas
- [ ] Testar casos de borda (sem parcelamento, parcelamento com valores diferentes)

## 🔍 Pontos de Atenção

1. **Compatibilidade com Dados Existentes:**
   - Campos novos devem ter valores padrão
   - Contas a pagar existentes não terão `pedido_id` (será NULL)
   - Cotações antigas não terão condições de pagamento estruturadas

2. **Validações:**
   - Se `is_parcelada = true`, `numero_parcelas` deve ser > 1
   - Se `is_parcelada = false`, `numero_parcelas` deve ser 1
   - `intervalo_parcelas` deve ser um dos valores permitidos

3. **Cálculo de Parcelas:**
   - Valor total dividido igualmente entre parcelas
   - Última parcela pode ter diferença de centavos (ajustar)
   - Datas de vencimento calculadas a partir da data atual

4. **Migração de Dados:**
   - Campo `condicoes_comerciais` (texto) pode conter informações de pagamento
   - Considerar migração automática se possível identificar padrões

## 📊 Impacto Esperado

### Benefícios:
- ✅ Condições de pagamento estruturadas e consistentes
- ✅ Parcelamento automático na criação da conta
- ✅ Rastreabilidade completa: Cotação → Pedido → Conta a Pagar
- ✅ Redução de erros manuais
- ✅ Melhor controle financeiro

### Riscos:
- ⚠️ Migração de dados existentes pode ser complexa
- ⚠️ Mudanças em funções críticas podem afetar fluxo atual
- ⚠️ Necessário testar extensivamente antes de produção

## 🚀 Próximos Passos

1. **Revisar e aprovar este plano**
2. **Definir prioridades e prazos**
3. **Iniciar Fase 1 (Estrutura do Banco de Dados)**
4. **Testar cada fase antes de avançar**

---

**Data de Criação:** 2026-01-21  
**Última Atualização:** 2026-01-21  
**Status:** Aguardando Aprovação
