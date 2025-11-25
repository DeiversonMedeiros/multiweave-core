# 🗺️ Guia Rápido: Onde Encontrar as Novas Funcionalidades

## ✅ O QUE FOI IMPLEMENTADO

### 1. **Plano de Contas Contábil** (4 níveis hierárquicos)
### 2. **Classes Financeiras Gerenciais** (hierarquia Pai/Filho)
### 3. **Vinculação Classes ↔ Contas Contábeis**

---

## 📍 ONDE ENCONTRAR NO SISTEMA

### 🎯 **PLANO DE CONTAS**

**📍 Localização:**
```
Menu → Financeiro → Contabilidade → Aba "Plano de Contas"
```

**🔗 URL:**
```
/financeiro/contabilidade
```

**📋 O que fazer:**
1. Acesse o menu **Financeiro**
2. Clique em **Contabilidade**
3. Clique na aba **"Plano de Contas"**
4. Se não houver contas, aparecerá o botão **"Inserir Padrão Telecom"**
5. Clique no botão para inserir toda a estrutura (100+ contas)

**✅ O que você verá:**
- Lista de todas as contas contábeis
- Código, descrição, tipo, nível, natureza
- Botão para criar nova conta manualmente
- Botão para editar/excluir contas

---

### 🎯 **CLASSES FINANCEIRAS**

**📍 Localização:**
```
Menu → Financeiro → Classes Financeiras
```

**🔗 URL:**
```
/financeiro/classes-financeiras
```

**📋 O que fazer:**
1. Acesse o menu **Financeiro**
2. Clique em **Classes Financeiras** (novo botão no dashboard)
3. Se não houver classes, aparecerá o botão **"Inserir Padrão Telecom"**
4. Clique no botão para inserir toda a estrutura (150+ classes)

**✅ O que você verá:**
- **Aba "Listagem Hierárquica"**: Árvore de classes (Pai → Filho)
- **Aba "Vinculações"**: Vincular classes com contas contábeis
- Botões para criar/editar/excluir classes
- Visualização em árvore com códigos e nomes

**🔗 Como vincular com Contas Contábeis:**
1. Na aba "Listagem Hierárquica", clique no ícone de **link (🔗)** de uma classe
2. Isso abrirá a aba "Vinculações" para aquela classe
3. Clique em **"Nova Vinculação"**
4. Selecione a conta contábil desejada
5. A vinculação será criada automaticamente

---

## 🚨 PROBLEMA: Não Estou Vendo os Botões

### Se você NÃO vê o botão "Inserir Padrão Telecom":

**Causa mais provável:** As funções RPC não foram aplicadas no banco de dados.

**Solução:**
1. Acesse o **Supabase Dashboard**: https://wmtftyaqucwfsnnjepiy.supabase.co
2. Vá em **SQL Editor**
3. Abra o arquivo: `supabase/migrations/20250120000016_insert_plano_contas_telecom.sql`
4. Copie TODO o conteúdo e cole no SQL Editor
5. Clique em **Run** para executar
6. Repita para: `supabase/migrations/20250120000017_insert_classes_financeiras_telecom.sql`

### Se você vê o botão mas não funciona:

1. **Verifique o Console do Navegador** (F12)
   - Procure por erros em vermelho
   
2. **Verifique se a empresa está selecionada**
   - Deve haver uma empresa selecionada no seletor superior direito

3. **Verifique as permissões**
   - Você precisa ter permissão de leitura no módulo financeiro

---

## 📸 Visualização no Sistema

### Dashboard Financeiro
```
┌─────────────────────────────────────┐
│  Financeiro                         │
├─────────────────────────────────────┤
│  [Contas a Pagar]                   │
│  [Contas a Receber]                  │
│  [Tesouraria]                        │
│  [Fiscal]                            │
│  [Contabilidade] ← Plano de Contas  │
│  [Classes Financeiras] ← NOVO!      │
│  [SEFAZ]                             │
│  [Bancária]                          │
└─────────────────────────────────────┘
```

### Página de Contabilidade
```
┌─────────────────────────────────────┐
│  Contabilidade                      │
├─────────────────────────────────────┤
│  [Dashboard] [Plano de Contas] ←    │
│  [Lançamentos] [SPED]               │
├─────────────────────────────────────┤
│  Plano de Contas                    │
│  [Inserir Padrão Telecom] ← Botão   │
│                                     │
│  Lista de Contas:                   │
│  1 - Ativo                          │
│  1.1 - Ativo Circulante            │
│  1.1.01 - Caixa e Equivalentes     │
│  ...                                │
└─────────────────────────────────────┘
```

### Página de Classes Financeiras
```
┌─────────────────────────────────────┐
│  Classes Financeiras                │
├─────────────────────────────────────┤
│  [Inserir Padrão Telecom] ← Botão   │
├─────────────────────────────────────┤
│  [Listagem] [Vinculações]           │
├─────────────────────────────────────┤
│  📁 1 - Pessoal / Folha            │
│    📁 1.1 - Salários, Encargos     │
│      📄 1.1.01 - Salários e Ordenados│
│      📄 1.1.02 - Férias             │
│    📁 1.2 - Benefícios              │
│  📁 2 - Despesas Administrativas    │
│  ...                                │
└─────────────────────────────────────┘
```

---

## ✅ Checklist Rápido

### Para ver o Plano de Contas:
- [ ] Acessei `/financeiro/contabilidade`
- [ ] Cliquei na aba "Plano de Contas"
- [ ] Vejo contas OU vejo botão "Inserir Padrão Telecom"

### Para ver Classes Financeiras:
- [ ] Acessei `/financeiro/classes-financeiras`
- [ ] Vejo classes OU vejo botão "Inserir Padrão Telecom"
- [ ] Consigo navegar pela hierarquia

### Se não vejo nada:
- [ ] Verifiquei se a empresa está selecionada
- [ ] Verifiquei as permissões
- [ ] Apliquei as funções RPC no Supabase Dashboard

---

## 🆘 Ainda Não Funciona?

**Passos de Diagnóstico:**

1. **Abra o Console do Navegador** (F12 → Console)
   - Procure por erros
   - Copie mensagens de erro

2. **Verifique no Banco de Dados:**
   ```sql
   -- Verificar se as funções existem
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_schema = 'financeiro' 
   AND routine_name IN ('insert_plano_contas_telecom', 'insert_classes_financeiras_telecom');
   
   -- Deve retornar 2 linhas
   ```

3. **Verifique se há dados:**
   ```sql
   SELECT COUNT(*) FROM financeiro.plano_contas;
   SELECT COUNT(*) FROM financeiro.classes_financeiras;
   ```

4. **Teste manualmente:**
   ```sql
   -- Substitua 'UUID-DA-EMPRESA' pelo ID real
   SELECT financeiro.insert_plano_contas_telecom('UUID-DA-EMPRESA'::UUID, NULL);
   SELECT financeiro.insert_classes_financeiras_telecom('UUID-DA-EMPRESA'::UUID, NULL);
   ```

---

**Última Atualização**: 2025-01-20

