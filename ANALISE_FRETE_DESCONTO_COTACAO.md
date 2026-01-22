# Análise: Frete e Desconto Geral + Desconto %/R$ + Frete por Item na Cotação

## 1. Resumo das Necessidades

1. **Frete e desconto em toda a cotação** – Além do frete/desconto por fornecedor e por item, permitir frete e desconto aplicados à cotação inteira (nível ciclo).
2. **Desconto em % ou R$** – Garantir que o desconto possa ser informado em percentual ou valor absoluto (já existe em parte; generalizar para o nível ciclo e garantir na UI).
3. **Combinar individual + geral** – O comprador pode aplicar frete e desconto por item, por fornecedor e na cotação (geral), na mesma cotação.
4. **Frete por item na definição do vencedor** – O custo para comparar vencedor por item deve incluir o frete próprio do item quando existir. Ex.: Fornecedor A: item R$ 10 + frete R$ 3 = R$ 13; Fornecedor B: item R$ 12, sem frete = R$ 12 → vencedor B.
5. **Regra de negócio** – Frete e desconto (individual ou geral) **não** alteram o valor unitário nem o “valor do item” na célula (podem ser informativos). Só afetam o **valor geral da cotação** e a **escolha do vencedor** (incluindo frete por item na comparação).

---

## 2. Estrutura Atual do Banco

### 2.1 `compras.cotacao_ciclos`
- `id`, `company_id`, `requisicao_id`, `numero_cotacao`, `status`, `prazo_resposta`, `observacoes`, `workflow_state`, `created_at`, `updated_at`
- **Não possui:** `valor_frete`, `desconto_percentual`, `desconto_valor` (frete/desconto geral).

### 2.2 `compras.cotacao_fornecedores`
- `id`, `cotacao_id`→cotacao_ciclos, `fornecedor_id`, `status`, `preco_total`, `prazo_entrega`, `condicoes_comerciais`, `observacoes`, `anexos_count`, `created_at`, `updated_at`
- **Já possui:** `valor_frete`, `valor_imposto`, `desconto_percentual`, `desconto_valor` (por fornecedor).

### 2.3 `compras.cotacao_item_fornecedor`
- `id`, `cotacao_fornecedor_id`, `requisicao_item_id`, `material_id`, `quantidade_ofertada`, `valor_unitario`, `desconto_percentual`, `desconto_valor`, `valor_total_calculado` (GENERATED: qty×unit − descontos), `prazo_entrega_dias`, `condicao_pagamento`, `observacoes`, `status`, `is_vencedor`, `created_at`, `updated_at`
- **Não possui:** `valor_frete` (frete próprio do item para vencedor e totais).

### 2.4 Triggers e funções relevantes

- **`recalcular_cotacao_fornecedor_totais`** (em `cotacao_item_fornecedor`):  
  - `preco_total` em `cotacao_fornecedores` = `SUM(valor_total_calculado)`.  
  - **Manter:** `valor_total_calculado` e `preco_total` continuam sem frete (conforme regra: frete não altera valor do item).

- **`criar_pedido_apos_aprovacao_cotacao_ciclos`**:  
  - Usa `cif.valor_total_calculado` e `cf.preco_total`; considera `cf.valor_frete` em versões que o usam.  
  - **Impacto:** ao incluir `cif.valor_frete`, o valor do pedido (por fornecedor) deve somar `cif.valor_frete` nos itens vencedores e `cf.valor_frete`/`cf.valor_imposto`/descontos do fornecedor.  
  - **Recomendação:** ajustar em migração separada ou na mesma, para que `valor_final` do pedido reflita: itens + frete itens + frete/imposto do fornecedor − descontos do fornecedor. Frete/desconto **geral** (ciclo) podem ser rateados entre pedidos ou tratados fora do pedido; na primeira etapa pode-se deixar só em aprovação e tela de detalhe.

- **`get_required_approvers`** (ex.: `20260112000001_fix_approval_classe_financeira_format.sql`):  
  - Para `cotacao_compra` usa `compras.cotacoes` com `id = p_processo_id`.  
  - O `p_processo_id` das aprovações de cotação é o **`cotacao_ciclos.id`**, não `compras.cotacoes.id`.  
  - **Problema:** há risco de não encontrar linha ou usar tabela/ID errados.  
  - **Ajuste necessário:** no caso `cotacao_compra`, usar `cotacao_ciclos.id = p_processo_id`, obter `centro_custo_id` via `requisicoes_compra`, e calcular `processo_valor` a partir de:
    - itens vencedores: `SUM(cif.valor_total_calculado) + SUM(cif.valor_frete)`;
    - por fornecedor vencedor: `+ cf.valor_frete + cf.valor_imposto − (desconto % sobre subtotal do cf + cf.desconto_valor)`;
    - geral: `+ cc.valor_frete − (cc.desconto_percentual/100 × base + cc.desconto_valor)` (base = subtotal itens + fletes itens + frete/imposto por fornecedor, ou uma base acordada; na dúvida, usar subtotal itens + fretes para simplificar).

- **`process_approval`** (quando `cotacao_compra`):  
  - Atualiza `cotacao_ciclos` (status, etc.).  
  - Não usa valor; o valor é usado em `get_required_approvers`.  

- **`trigger_create_approvals_cotacao_ciclos`**, **`trigger_check_edit_permission_cotacoes`**, **`update_cotacoes_updated_at`**:  
  - Nenhum deles usa `valor_frete`/`desconto` em `cotacao_ciclos` ou `cotacao_item_fornecedor`; só precisam que as colunas existam.  

- **Views (ex.: `cotacoes_with_requisicao`)**:  
  - Se usarem só `cotacao_ciclos`/`cotacao_fornecedores`/`cotacao_item_fornecedor` sem ler valor de frete/desconto, não quebram. Se em algum momento exibirem “valor total”, convém alinhar com a mesma fórmula (itens + frete itens + frete/imposto/desconto por fornecedor + frete/desconto geral).

---

## 3. Ajustes no Banco (migração)

### 3.1 `compras.cotacao_ciclos`
- `valor_frete` NUMERIC(15,2) DEFAULT 0, CHECK (valor_frete >= 0)
- `desconto_percentual` NUMERIC(7,4) DEFAULT 0, CHECK (0..100)
- `desconto_valor` NUMERIC(15,2) DEFAULT 0, CHECK (desconto_valor >= 0)

### 3.2 `compras.cotacao_item_fornecedor`
- `valor_frete` NUMERIC(14,2) DEFAULT 0, CHECK (valor_frete >= 0)  
  - **Não** alterar `valor_total_calculado`; `valor_frete` é usado apenas em totais e na definição do vencedor.

### 3.3 `get_required_approvers` (caso `cotacao_compra`)
- Entrada: `p_processo_id` = `cotacao_ciclos.id`.
- Obter `centro_custo_id` de `requisicoes_compra` via `cc.requisicao_id`.
- Calcular `processo_valor` com:
  - Subtotal itens vencedores: `SUM(cif.valor_total_calculado)` where `cif.is_vencedor` and `cf` do ciclo.
  - Frete itens: `+ SUM(COALESCE(cif.valor_frete,0))` para os mesmos itens.
  - Por fornecedor vencedor: `+ cf.valor_frete + cf.valor_imposto − (subtotal_cf × cf.desconto_percentual/100 + cf.desconto_valor)` (subtotal_cf = soma dos `cif.valor_total_calculado` daquele `cf` onde `is_vencedor`).
  - Geral: `+ cc.valor_frete − (base × cc.desconto_percentual/100 + cc.desconto_valor)`.  
  - Uma definição simples para `base`: subtotal itens + fretes itens + `SUM(cf.valor_frete + cf.valor_imposto)` dos vencedores.

---

## 4. Modal “Gerar Cotação” – Componentes Afetados

### 4.1 Estado e tipos
- **`ItemFornecedorValor`:** incluir `valor_frete?: number`.
- **Ciclo (geral):**  
  - Opção A: em `formData` (ou objeto “dados do ciclo”):  
    `valor_frete`, `desconto_percentual`, `desconto_valor`.  
  - Opção B: estado específico, ex.:  
    `freteDescontoGeral: { valor_frete, desconto_percentual, desconto_valor }`.  
  - Carregar e persistir em `cotacao_ciclos`.

### 4.2 `valorItemCalculado(cell)`
- Manter: `(qty × valor_unitario) − (desconto % + desconto R$)` (sem frete).  
- Uso: valor do item na célula, totais de “subtotal itens” e qualquer exibição que não deva incluir frete no “valor do item”.

### 4.3 Cálculo do vencedor por item (Mapa de Cotação)
- Custo para comparação:  
  `valorItemCalculado(cell) + (cell.valor_frete || 0)`.  
- O vencedor do item é o fornecedor com menor custo nessa métrica.

### 4.4 `resumoTotais`
- **`porItem`:** para “melhor” por item:  
  `valorItemCalculado(cell) + (cell.valor_frete || 0)`.
- **`porFornecedor` (subtotal itens):** continua `SUM valorItemCalculado(cell)`.
- **`totaisFinais` (por fornecedor), antes do geral:**
  - `subtotal = porFornecedor.get(fid)`
  - `+ SUM(cell.valor_frete || 0)` para itens desse fornecedor no mapa
  - `+ f.valor_frete + f.valor_imposto`
  - `− (subtotal × f.desconto_percentual/100 + f.desconto_valor)`
- **Depois do geral (opcional na primeira versão do `resumoTotais`):**  
  - Se o resumo for “por fornecedor”, o geral pode ser aplicado só no “Total da cotação” na Finalização.  
  - Ou: um `totalGeral` = `soma dos totais dos vencedores` + `cc.valor_frete` − `cc.desconto` (definindo a base do desconto % do ciclo).

### 4.5 Aba “Mapa de Cotação”
- Em cada célula (item × fornecedor), além de preço e descontos:
  - Campo opcional **Frete (R$)**, gravado em `mapaFornecedorItens[fornecedorId][itemKey].valor_frete` e persistido em `cotacao_item_fornecedor.valor_frete`.
- Na definição do vencedor da linha (item), usar:  
  `valorItemCalculado + (cell.valor_frete || 0)`.

### 4.6 Aba “Informações Adicionais” ou equivalente
- Manter blocos por fornecedor (Frete, Imposto, Desconto %, Desconto R$).
- Incluir bloco **“Frete e Desconto da Cotação (Geral)”**:
  - Frete (R$)
  - Desconto (%)
  - Desconto (R$)
  - (Os dois tipos de desconto podem coexistir; o cálculo usa os dois.)

### 4.7 Aba “Finalização”
- Totais por fornecedor: já consideram frete/desconto do fornecedor e frete por item (conforme `resumoTotais`/`totaisFinais`).
- **Total geral da cotação:**  
  - Soma dos totais (por fornecedor) dos vencedores, ou total único considerando múltiplos vencedores.  
  - Aplicar:  
    `+ ciclo.valor_frete − (base × ciclo.desconto_percentual/100 + ciclo.desconto_valor)`.
- Exibir de forma clara:
  - Subtotal itens (sem frete/desconto no valor do item)
  - Frete (itens + por fornecedor + geral)
  - Desconto (por fornecedor + geral, em % e R$)
  - Total final.

### 4.8 Persistência
- **Ciclo:** em create/update de `cotacao_ciclos`, preencher  
  `valor_frete`, `desconto_percentual`, `desconto_valor`.
- **Célula do mapa:** em create/update de `cotacao_item_fornecedor`, preencher `valor_frete`.
- **Fornecedor:** já existe; manter `valor_frete`, `valor_imposto`, `desconto_percentual`, `desconto_valor`.

### 4.9 Carregamento de cotação existente
- De `cotacao_ciclos`: ler `valor_frete`, `desconto_percentual`, `desconto_valor` para o estado “geral”.
- De `cotacao_item_fornecedor`: ler `valor_frete` e preencher `mapaFornecedorItens[cf_id][itemKey].valor_frete`.

---

## 5. Apresentação para o Aprovador (Portal do Gestor)

### 5.1 `CotacaoDetails`
- Já usa `valor_frete`, `valor_imposto`, `desconto_percentual`, `desconto_valor` por fornecedor.
- **Incluir:**
  - **Frete por item:** quando `cif.valor_frete > 0`, exibir na linha do item (ex.: coluna “Frete” ou texto “(Frete: R$ x)”).
  - **Frete e desconto geral (ciclo):**  
    - Buscar `cc.valor_frete`, `cc.desconto_percentual`, `cc.desconto_valor`.  
    - Card ou seção “Frete e Desconto da Cotação” com esses valores.  
    - Incluir no **Total geral**:  
      `valorTotalFinal` = valor já calculado (itens + frete itens + frete/imposto/desconto por fornecedor)  
      `+ cc.valor_frete − (base × cc.desconto_percentual/100 + cc.desconto_valor)`.
- **Total Geral:** deve bater com a mesma lógica do modal (itens + fretes + impostos − descontos, em todos os níveis).

### 5.2 `CotacaoApprovalCard` / `useCotacaoApprovalInfo`
- Se exibirem um “valor” da cotação, este deve ser o mesmo `processo_valor` usado em `get_required_approvers` (total que inclui itens, frete por item, frete/imposto/desconto por fornecedor e frete/desconto geral).

### 5.3 `criar_pedido_apos_aprovacao_cotacao_ciclos`
- Para cada pedido (fornecedor aprovado):
  - `v_valor_total` (ou equivalente):  
    - Soma de `cif.valor_total_calculado` dos itens desse fornecedor no pedido.  
    - `+ SUM(COALESCE(cif.valor_frete,0))` desses itens.  
    - `+ cf.valor_frete + cf.valor_imposto`  
    - `− (subtotal_cf × cf.desconto_percentual/100 + cf.desconto_valor)`.  
- Frete/desconto **geral** (ciclo):  
  - Pode ser rateado entre os pedidos do ciclo (ex.: proporcional ao valor do pedido antes do geral) ou mantido só na aprovação e no detalhe; depende da regra de faturamento. Na primeira entrega pode-se deixar somente na aprovação e em `CotacaoDetails`.

---

## 6. Ordem de Implementação Sugerida

1. **Migração de schema**
   - `cotacao_ciclos`: `valor_frete`, `desconto_percentual`, `desconto_valor`.
   - `cotacao_item_fornecedor`: `valor_frete`.
2. **Migração de `get_required_approvers`**  
   - Caso `cotacao_compra`: fonte = `cotacao_ciclos.id`, `requisicoes_compra`, `cotacao_fornecedores`, `cotacao_item_fornecedor`; fórmula de `processo_valor` como acima.
3. **Modal: estado e tipos**
   - `ItemFornecedorValor.valor_frete`; estado do ciclo para frete/desconto geral.
4. **Modal: `resumoTotais` e vencedor**
   - Incluir `valor_frete` na comparação por item e nos totais por fornecedor (e, se fizer no front, no total geral).
5. **Modal: UI**
   - Célula: Frete (R$).  
   - Bloco “Frete e Desconto da Cotação (Geral)”.
6. **Modal: persistência e carregamento**
   - Ciclo e `cotacao_item_fornecedor.valor_frete`; carregar ao abrir cotação.
7. **`CotacaoDetails`**
   - Frete por item, frete/desconto geral e total geral.
8. **`criar_pedido_apos_aprovacao_cotacao_ciclos`** (e `CotacaoApprovalCard` se necessário)
   - Incluir `cif.valor_frete` e descontos/frete do fornecedor no valor do pedido; alinhar com `get_required_approvers` e `CotacaoDetails`.

---

## 7. Riscos e Cuidados

- **`compras.cotacoes` vs `cotacao_ciclos`:**  
  - `get_required_approvers` em `20260112000001` usa `compras.cotacoes` com `id = p_processo_id`.  
  - Se o processo de aprovação passar `cotacao_ciclos.id`, a query atual pode não retornar valor.  
  - Corrigir no caso `cotacao_compra` para usar `cotacao_ciclos` + `cf` + `cif` e `cc.valor_frete`/`cc.desconto_*`.

- **`valor_total_calculado`:**  
  - É coluna gerada; não incluir `valor_frete` nela.  
  - Qualquer trigger que leia só `valor_total_calculado` continua válido; o que precisar de “custo com frete” deve somar `valor_frete` na aplicação ou em outra função.

- **Cotações antigas:**  
  - Novas colunas com DEFAULT 0; `CotacaoDetails` já trata “cotação antiga” quando não há frete/desconto; incluir também `cc.valor_frete`/`cc.desconto_*` nessa lógica se fizer sentido.

- **Ordem de aplicação de descontos (%, R$) no geral:**  
  - Definir se % incide sobre a base antes ou depois do R$. Ex.: `base − (base × pct/100) − valor` ou `base − valor − ( (base−valor) × pct/100 )`. Manter a mesma regra em `get_required_approvers`, `CotacaoDetails` e modal.

- **Múltiplos vencedores (um por item):**  
  - Total geral = soma dos “totais” de cada fornecedor vencedor (cada um com seus itens, frete por item, frete/imposto/desconto do fornecedor) e depois + frete geral − desconto geral.  
  - O `processo_valor` em `get_required_approvers` deve refletir esse total.
