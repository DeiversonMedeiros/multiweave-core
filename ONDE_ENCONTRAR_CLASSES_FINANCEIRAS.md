# 📍 Onde Encontrar: Classes Financeiras

## 🎯 Localização no Sistema

### **Opção 1: Via Dashboard Financeiro** (Mais Fácil)

**Caminho:**
```
Menu Principal → Financeiro → Dashboard Financeiro → Botão "Classes Financeiras"
```

**Passos:**
1. Clique em **"Financeiro"** no menu lateral
2. Você será direcionado para o **Dashboard Financeiro**
3. Procure o card/botão **"Classes Financeiras"** (ícone roxo com FileText)
4. Clique no botão

**URL que será acessada:**
```
/financeiro/classes-financeiras
```

---

### **Opção 2: Via URL Direta**

Digite diretamente no navegador:
```
/financeiro/classes-financeiras
```

Ou acesse:
```
https://seu-dominio.com/financeiro/classes-financeiras
```

---

## 📋 O que você verá na página

### **Aba "Listagem Hierárquica"** (Padrão)
- Árvore hierárquica de todas as classes financeiras
- Estrutura Pai → Filho
- Código e nome de cada classe
- Botões para:
  - 🔗 Vincular com contas contábeis
  - ✏️ Editar classe
  - 🗑️ Excluir classe

### **Aba "Vinculações"**
- Aparece quando você seleciona uma classe (clique no ícone 🔗)
- Mostra todas as vinculações da classe com contas contábeis
- Permite criar novas vinculações
- Permite remover vinculações existentes

---

## 🎨 Visualização Esperada

```
┌─────────────────────────────────────────┐
│  Classes Financeiras                    │
├─────────────────────────────────────────┤
│  [Atualizar]                            │
├─────────────────────────────────────────┤
│  [Listagem] [Vinculações]               │
├─────────────────────────────────────────┤
│                                         │
│  📁 1 - Pessoal / Folha                │
│    📁 1.1 - Salários, Encargos         │
│      📄 1.1.01 - Salários e Ordenados │
│      📄 1.1.02 - Férias                │
│    📁 1.2 - Benefícios                 │
│  📁 2 - Despesas Administrativas        │
│  ...                                    │
└─────────────────────────────────────────┘
```

---

## ✅ Dados Automáticos

**Importante:** Os dados são inseridos **automaticamente** quando:
- Uma empresa é criada (via trigger)
- A migração foi aplicada (para empresas existentes)

**Você NÃO precisa:**
- Clicar em botões para inserir dados
- Fazer nada manualmente

**Se você não vê os dados:**
1. Verifique se uma empresa está selecionada (canto superior direito)
2. Verifique se você tem permissão de leitura no módulo financeiro
3. Atualize a página (F5)

---

## 🔍 Verificação Rápida

### Se você não encontra o botão no Dashboard:

1. **Verifique as permissões:**
   - Você precisa ter permissão de leitura no módulo "financeiro"
   - Você precisa ter permissão de leitura na entidade "contabilidade"

2. **Verifique se está no Dashboard correto:**
   - Deve estar em `/financeiro` (Dashboard Financeiro)
   - Não confundir com outras páginas

3. **Use a URL direta:**
   - Digite `/financeiro/classes-financeiras` na barra de endereço

---

## 📊 Estrutura de Dados

As Classes Financeiras estão organizadas em:

1. **Pessoal / Folha de Pagamento** (8 subcategorias)
2. **Despesas Administrativas** (6 subcategorias)
3. **Frota** (3 subcategorias)
4. **Equipamentos, Máquinas e Infraestrutura** (4 subcategorias)
5. **Operações de Campo** (3 subcategorias)
6. **Comercial e Vendas** (1 subcategoria)
7. **Financeiro** (3 subcategorias)
8. **Outros** (1 subcategoria)

**Total:** ~146 classes financeiras hierárquicas

---

**Última Atualização**: 2025-01-20

