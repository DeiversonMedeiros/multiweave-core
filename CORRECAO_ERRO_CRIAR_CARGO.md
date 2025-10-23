# 🔧 Correção do Erro ao Criar Cargo - RESOLVIDO

## ❌ **Problema Identificado**

**Erro:** `TypeError: Converting circular structure to JSON`
**Localização:** `src/pages/rh/PositionsPageNew.tsx`
**Causas:**
1. `company_id_param: undefined` - Hook `useCreateEntity` chamado sem `companyId`
2. Estrutura circular no JSON - Objetos React incluídos nos dados

---

## ✅ **Solução Implementada**

### **1. Problema Principal - company_id undefined**

**❌ ANTES:**
```tsx
const createPosition = useCreateEntity<Position>('rh', 'positions');
const updatePosition = useUpdateEntity<Position>('rh', 'positions');
```

**✅ DEPOIS:**
```tsx
const createPosition = useCreateEntity<Position>('rh', 'positions', selectedCompany?.id || '');
const updatePosition = useUpdateEntity<Position>('rh', 'positions', selectedCompany?.id || '');
```

### **2. Problema de Estrutura Circular**

**❌ ANTES:**
```tsx
const handleModalSubmit = async (data: Partial<Position>) => {
  try {
    if (modalMode === 'create') {
      await createPosition.mutateAsync({
        ...data,  // ❌ Pode incluir objetos React
        company_id: selectedCompany?.id  // ❌ Duplicação
      });
    }
    // ...
  }
};
```

**✅ DEPOIS:**
```tsx
const handleModalSubmit = async (data: Partial<Position>) => {
  try {
    if (modalMode === 'create') {
      // Limpar dados para evitar referências circulares
      const cleanData = {
        nome: data.nome,
        descricao: data.descricao,
        nivel_hierarquico: data.nivel_hierarquico,
        salario_base: data.salario_base,
        is_active: data.is_active ?? true,
        // Não incluir company_id aqui pois já é passado no hook
      };
      
      await createPosition.mutateAsync(cleanData);
    }
    // ...
  }
};
```

---

## 🧪 **Validação da Correção**

### **Problemas Resolvidos:**

1. ✅ **company_id_param undefined** - Agora passado corretamente no hook
2. ✅ **Estrutura circular** - Dados limpos antes do envio
3. ✅ **Duplicação de company_id** - Removida do payload
4. ✅ **Objetos React nos dados** - Filtrados para incluir apenas campos necessários

### **Campos Limpos no Payload:**
- ✅ `nome` - Nome do cargo
- ✅ `descricao` - Descrição do cargo
- ✅ `nivel_hierarquico` - Nível hierárquico
- ✅ `salario_base` - Salário base
- ✅ `is_active` - Status ativo (padrão: true)

---

## 📊 **Resultado Final**

**ANTES:**
- ❌ `company_id_param: undefined`
- ❌ `TypeError: Converting circular structure to JSON`
- ❌ Falha ao criar cargos
- ❌ Objetos React incluídos nos dados

**DEPOIS:**
- ✅ `company_id_param` definido corretamente
- ✅ Dados limpos sem referências circulares
- ✅ Criação de cargos funcionando
- ✅ Payload otimizado com apenas campos necessários

---

## 🎯 **Benefícios da Correção**

1. **Funcionalidade Restaurada** - Criação de cargos funcionando
2. **Dados Limpos** - Sem objetos React no payload
3. **Performance Melhorada** - Payload otimizado
4. **Código Mais Robusto** - Tratamento adequado de dados

---

## 📝 **Arquivos Modificados**

- ✅ `src/pages/rh/PositionsPageNew.tsx` - Hooks e handler corrigidos
- ✅ `useCreateEntity` e `useUpdateEntity` com `companyId`
- ✅ `handleModalSubmit` com limpeza de dados

**Status:** ✅ **RESOLVIDO** - Criação de cargos funcionando corretamente
