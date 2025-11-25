# 📍 Onde Encontrar: Plano de Contas e Classes Financeiras

## 🎯 Localização no Sistema

### 1. **Plano de Contas Contábil** ✅

**Caminho no Sistema:**
```
Menu Principal → Financeiro → Contabilidade → Aba "Plano de Contas"
```

**URL Direta:**
```
/financeiro/contabilidade
```

**O que você encontrará:**
- Lista de todas as contas contábeis cadastradas
- Botão "Inserir Padrão Telecom" (se não houver contas)
- Botão "Nova Conta" para criar contas manualmente
- Visualização de: código, descrição, tipo, nível, natureza, saldo

**Como inserir dados padrão:**
1. Acesse `/financeiro/contabilidade`
2. Clique na aba "Plano de Contas"
3. Se não houver contas, aparecerá o botão "Inserir Padrão Telecom"
4. Clique no botão e confirme
5. Aguarde a inserção (pode levar alguns segundos)

---

### 2. **Classes Financeiras Gerenciais** ✅

**Caminho no Sistema:**
```
Menu Principal → Financeiro → Classes Financeiras
```

**URL Direta:**
```
/financeiro/classes-financeiras
```

**O que você encontrará:**
- Lista hierárquica de todas as classes financeiras
- Visualização em árvore (Pai → Filho)
- Botão "Inserir Padrão Telecom" (se não houver classes)
- Aba de "Vinculações" para vincular classes com contas contábeis

**Como inserir dados padrão:**
1. Acesse `/financeiro/classes-financeiras`
2. Se não houver classes, aparecerá o botão "Inserir Padrão Telecom"
3. Clique no botão e confirme
4. Aguarde a inserção (pode levar alguns segundos)

**Como vincular Classes com Contas Contábeis:**
1. Na aba "Listagem Hierárquica", clique no ícone de link (🔗) de uma classe
2. Isso abrirá a aba "Vinculações"
3. Clique em "Nova Vinculação"
4. Selecione a conta contábil desejada
5. A vinculação será criada automaticamente

---

## 🚨 Problema: Não Estou Vendo os Dados

### Se você não vê o botão "Inserir Padrão Telecom":

**Possíveis causas:**
1. **Funções RPC não foram aplicadas** (problema de encoding)
   - **Solução**: Aplicar manualmente via Supabase Dashboard SQL Editor
   - Arquivos: 
     - `supabase/migrations/20250120000016_insert_plano_contas_telecom.sql`
     - `supabase/migrations/20250120000017_insert_classes_financeiras_telecom.sql`

2. **Empresa não selecionada**
   - **Solução**: Selecione uma empresa no seletor superior direito

3. **Sem permissões**
   - **Solução**: Verifique se você tem permissão de leitura no módulo financeiro

### Se você vê o botão mas não funciona:

**Verificar:**
1. Abra o Console do Navegador (F12)
2. Veja se há erros
3. Verifique se as funções RPC existem no banco:
   ```sql
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_schema = 'financeiro' 
   AND routine_name IN ('insert_plano_contas_telecom', 'insert_classes_financeiras_telecom');
   ```

---

## 📋 Checklist de Verificação

### Para Plano de Contas:
- [ ] Acessei `/financeiro/contabilidade`
- [ ] Cliquei na aba "Plano de Contas"
- [ ] Vejo a lista de contas OU o botão "Inserir Padrão Telecom"
- [ ] Se vejo o botão, cliquei e confirmei
- [ ] Aguardei a inserção completar
- [ ] Atualizei a página (F5)

### Para Classes Financeiras:
- [ ] Acessei `/financeiro/classes-financeiras`
- [ ] Vejo a lista hierárquica OU o botão "Inserir Padrão Telecom"
- [ ] Se vejo o botão, cliquei e confirmei
- [ ] Aguardei a inserção completar
- [ ] Atualizei a página (F5)

---

## 🔧 Solução Rápida: Aplicar Funções RPC Manualmente

Se as funções RPC não foram aplicadas devido ao problema de encoding, siga estes passos:

### 1. Acesse o Supabase Dashboard
- URL: https://wmtftyaqucwfsnnjepiy.supabase.co
- Vá em: SQL Editor

### 2. Aplique a função do Plano de Contas
- Abra o arquivo: `supabase/migrations/20250120000016_insert_plano_contas_telecom.sql`
- Copie TODO o conteúdo
- Cole no SQL Editor do Supabase
- Execute (Run)

### 3. Aplique a função das Classes Financeiras
- Abra o arquivo: `supabase/migrations/20250120000017_insert_classes_financeiras_telecom.sql`
- Copie TODO o conteúdo
- Cole no SQL Editor do Supabase
- Execute (Run)

### 4. Teste no Sistema
- Volte ao sistema
- Acesse `/financeiro/contabilidade` ou `/financeiro/classes-financeiras`
- Clique em "Inserir Padrão Telecom"
- Deve funcionar agora!

---

## 📞 Se Ainda Não Funcionar

1. **Verifique o Console do Navegador** (F12 → Console)
   - Procure por erros em vermelho
   - Copie a mensagem de erro

2. **Verifique as Permissões**
   - Você tem acesso ao módulo financeiro?
   - Você tem permissão de criação/edição?

3. **Verifique a Empresa Selecionada**
   - Há uma empresa selecionada?
   - A empresa está ativa?

4. **Verifique o Banco de Dados**
   - As tabelas existem?
   - As funções RPC existem?
   - Há dados na tabela `companies`?

---

**Última Atualização**: 2025-01-20

