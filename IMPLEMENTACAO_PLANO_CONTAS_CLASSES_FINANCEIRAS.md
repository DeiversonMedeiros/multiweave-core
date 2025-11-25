# 📘 Implementação: Plano de Contas Contábil e Classes Financeiras Gerenciais

## ✅ Resumo da Implementação

Este documento descreve a implementação completa do sistema de **Plano de Contas Contábil** e **Classes Financeiras Gerenciais** para empresas de Telecom/Fibra Óptica no módulo financeiro.

---

## 📋 Estrutura Implementada

### 1. **Plano de Contas Contábil** (4 níveis hierárquicos)

A estrutura do plano de contas foi implementada com suporte a 4 níveis hierárquicos:

- **Nível 1**: Grupos principais (Ativo, Passivo, Patrimônio Líquido, Receitas, Custos, Despesas)
- **Nível 2**: Subgrupos (ex: Ativo Circulante, Ativo Não Circulante)
- **Nível 3**: Contas sintéticas (ex: Caixa e Equivalentes, Contas a Receber)
- **Nível 4**: Contas analíticas (ex: Caixa, Bancos Conta Movimento)

**Tabela**: `financeiro.plano_contas`

**Campos adicionados**:
- `aceita_lancamento`: Indica se a conta aceita lançamentos diretos
- `natureza`: Natureza da conta (devedora ou credora)
- `saldo_inicial`: Saldo inicial da conta
- `saldo_atual`: Saldo atual da conta

**Tipo de conta atualizado**: Agora inclui `'custos'` além de `'ativo'`, `'passivo'`, `'patrimonio'`, `'receita'`, `'despesa'`

---

### 2. **Classes Financeiras Gerenciais** (Hierarquia Pai/Filho)

Sistema de classes financeiras gerenciais voltadas para operações de Telecom, com hierarquia Pai/Filho:

**Tabela**: `financeiro.classes_financeiras`

**Estrutura**:
- `codigo`: Código único da classe (ex: "1.1.01")
- `nome`: Nome da classe financeira
- `classe_pai_id`: Referência à classe pai (para hierarquia)
- `nivel`: Nível hierárquico (1 = raiz)
- `ordem`: Ordem de exibição

**8 Categorias Principais**:
1. **Pessoal / Folha de Pagamento**
2. **Despesas Administrativas**
3. **Frota**
4. **Equipamentos, Máquinas e Infraestrutura**
5. **Operações de Campo (Implantação e Manutenção de Fibra Óptica)**
6. **Comercial e Vendas**
7. **Financeiro**
8. **Outros**

---

### 3. **Tabela de Vinculação** (Classes → Contas Contábeis)

Tabela que vincula Classes Financeiras Gerenciais às Contas Contábeis do Plano de Contas:

**Tabela**: `financeiro.classes_financeiras_contas`

**Funcionalidades**:
- Uma classe financeira pode estar vinculada a múltiplas contas contábeis
- Uma conta contábil pode ser usada por múltiplas classes
- Campo `is_default` indica a conta padrão para cada classe

---

## 📁 Arquivos Criados/Modificados

### Migrações SQL

1. **`supabase/migrations/20250120000015_create_classes_financeiras_system.sql`**
   - Cria tabela `classes_financeiras`
   - Cria tabela `classes_financeiras_contas`
   - Ajusta tabela `plano_contas` (adiciona campos necessários)
   - Cria RLS policies
   - Cria triggers e funções auxiliares

2. **`supabase/migrations/20250120000016_insert_plano_contas_telecom.sql`**
   - Função RPC: `financeiro.insert_plano_contas_telecom(company_id, created_by)`
   - Insere toda a estrutura do Plano de Contas (4 níveis)
   - Total: ~100+ contas contábeis organizadas hierarquicamente

3. **`supabase/migrations/20250120000017_insert_classes_financeiras_telecom.sql`**
   - Função RPC: `financeiro.insert_classes_financeiras_telecom(company_id, created_by)`
   - Insere toda a estrutura de Classes Financeiras Gerenciais
   - Total: ~150+ classes financeiras organizadas hierarquicamente

### TypeScript Types

**`src/integrations/supabase/financial-types.ts`**
- Adicionado `ClasseFinanceira` interface
- Adicionado `ClasseFinanceiraConta` interface
- Adicionado `ClasseFinanceiraFormData` interface
- Adicionado `ClasseFinanceiraContaFormData` interface
- Atualizado `PlanoContas` interface (ajustes de campos)

### Hooks React

1. **`src/hooks/financial/useClassesFinanceiras.ts`**
   - `useClassesFinanceiras()`: Lista todas as classes financeiras
   - `useActiveClassesFinanceiras()`: Lista classes ativas
   - `useClassesFinanceirasHierarquicas()`: Retorna classes organizadas em árvore
   - `useCreateClasseFinanceira()`: Cria nova classe
   - `useUpdateClasseFinanceira()`: Atualiza classe existente
   - `useDeleteClasseFinanceira()`: Soft delete de classe
   - `useInsertClassesFinanceirasTelecom()`: Insere estrutura padrão Telecom

2. **`src/hooks/financial/useClassesFinanceirasContas.ts`**
   - `useClassesFinanceirasContas()`: Lista vinculações
   - `useClasseFinanceiraContaPadrao()`: Busca conta padrão de uma classe
   - `useCreateClasseFinanceiraConta()`: Cria vinculação
   - `useUpdateClasseFinanceiraConta()`: Atualiza vinculação
   - `useDeleteClasseFinanceiraConta()`: Remove vinculação

---

## 🚀 Como Usar

### 1. Inserir Plano de Contas para uma Empresa

```typescript
import { useInsertPlanoContasTelecom } from '@/hooks/financial/usePlanoContas';

const { mutate: insertPlanoContas } = useInsertPlanoContasTelecom();

// Chamar a função
insertPlanoContas({
  company_id: 'uuid-da-empresa',
  created_by: 'uuid-do-usuario'
});
```

Ou via RPC direto:

```sql
SELECT financeiro.insert_plano_contas_telecom(
  'uuid-da-empresa'::UUID,
  'uuid-do-usuario'::UUID
);
```

### 2. Inserir Classes Financeiras para uma Empresa

```typescript
import { useInsertClassesFinanceirasTelecom } from '@/hooks/financial/useClassesFinanceiras';

const { mutate: insertClasses } = useInsertClassesFinanceirasTelecom();

// Chamar a função
insertClasses();
```

Ou via RPC direto:

```sql
SELECT financeiro.insert_classes_financeiras_telecom(
  'uuid-da-empresa'::UUID,
  'uuid-do-usuario'::UUID
);
```

### 3. Vincular Classe Financeira a Conta Contábil

```typescript
import { useCreateClasseFinanceiraConta } from '@/hooks/financial/useClassesFinanceirasContas';

const { mutate: createVinculacao } = useCreateClasseFinanceiraConta();

createVinculacao({
  classe_financeira_id: 'uuid-da-classe',
  conta_contabil_id: 'uuid-da-conta',
  is_default: true
});
```

---

## 📊 Estrutura de Dados

### Plano de Contas (Exemplo)

```
1 - Ativo
├── 1.1 - Ativo Circulante
│   ├── 1.1.01 - Caixa e Equivalentes
│   │   ├── 1.1.01.01 - Caixa
│   │   ├── 1.1.01.02 - Bancos Conta Movimento
│   │   └── 1.1.01.03 - Aplicações Financeiras Curto Prazo
│   └── 1.1.02 - Contas a Receber
│       ├── 1.1.02.01 - Clientes – Serviços de Implantação
│       └── 1.1.02.02 - Clientes – Serviços de Manutenção
└── 1.2 - Ativo Não Circulante
    └── 1.2.02 - Imobilizado
        ├── 1.2.02.01 - Veículos de Manutenção
        └── 1.2.02.02 - Equipamentos de Campo
```

### Classes Financeiras (Exemplo)

```
1 - Pessoal / Folha de Pagamento
├── 1.1 - Salários, Encargos e Benefícios
│   ├── 1.1.01 - Salários e Ordenados
│   ├── 1.1.02 - Férias
│   └── 1.1.03 - 13º Salário
└── 1.2 - Benefícios
    ├── 1.2.01 - Vale Transporte
    └── 1.2.02 - Vale Refeição

5 - Operações de Campo
├── 5.1 - Materiais Técnicos
│   ├── 5.1.01 - Material Elétrico
│   └── 5.1.02 - Material Civil
└── 5.2 - Serviços Operacionais
    └── 5.2.01 - Prestador de Serviços Terceirizados
```

---

## 🔐 Segurança (RLS)

Todas as tabelas possuem Row Level Security (RLS) configurado:

- **Política de SELECT**: Usuários podem visualizar dados de suas empresas
- **Política de INSERT/UPDATE/DELETE**: Apenas usuários com permissão `admin` ou `edit` podem modificar

---

## 📝 Próximos Passos (Opcional)

1. **Criar UI para gerenciar Classes Financeiras**
   - Listagem hierárquica
   - Formulário de criação/edição
   - Vinculação com Contas Contábeis

2. **Criar UI para gerenciar Plano de Contas**
   - Visualização em árvore
   - Formulário de criação/edição
   - Validação de códigos

3. **Criar função RPC para vincular automaticamente**
   - Mapeamento padrão entre Classes e Contas
   - Pode ser feito manualmente via UI também

4. **Integração com Contas a Pagar/Receber**
   - Permitir seleção de Classe Financeira ao criar conta
   - Auto-vincular com Conta Contábil padrão

---

## ✅ Status da Implementação

- [x] Estrutura de banco de dados criada
- [x] Migrações SQL criadas
- [x] Tipos TypeScript atualizados
- [x] Hooks React criados
- [x] RLS policies configuradas
- [x] Funções RPC para inserção de dados padrão
- [ ] UI para gerenciamento (próximo passo)
- [ ] Integração com Contas a Pagar/Receber (próximo passo)

---

**Data de Implementação**: 2025-01-20  
**Autor**: Sistema MultiWeave Core

