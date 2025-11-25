# 🔧 Correção: Campos Não Mostram Dados no Formulário de Funcionário

## 📋 Problema Identificado

No modal "Novo Funcionário" na aba "Profissionais", os campos a seguir não mostram nenhum dado:
- **Cargo** (`cargo_id`)
- **Departamento** (`departamento_id`)
- **Turno de Trabalho** (`work_shift_id`)
- **Centro de Custo** (`cost_center_id`)
- **Gestor Imediato** (`gestor_imediato_id`)

## 🔍 Causa Raiz

O hook `useCostCenters()` estava implementado incorretamente, tentando chamar um hook React (`useEntityData`) dentro de `queryFn`, o que é anti-pattern do React.

### ❌ Código Antigo (Incorreto)
```typescript
export function useCostCenters() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['public', 'cost_centers', selectedCompany?.id],
    queryFn: () => useEntityData<CostCenter>({  // ❌ Hook dentro de queryFn
      schema: 'public',
      table: 'cost_centers',
      companyId: selectedCompany?.id || '',
      page: 1,
      pageSize: 100
    }),
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}
```

### ✅ Código Corrigido
```typescript
export function useCostCenters() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['public', 'cost_centers', selectedCompany?.id],
    queryFn: async () => {
      const result = await EntityService.list<CostCenter>({  // ✅ Chamada direta do serviço
        schema: 'public',
        table: 'cost_centers',
        companyId: selectedCompany?.id || '',
        page: 1,
        pageSize: 100
      });
      return result;
    },
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}
```

## 🛠️ Correções Aplicadas

### 1. **Arquivo**: `src/hooks/useCostCenters.ts`

**Mudanças:**
- ✅ Usa `EntityService.list()` diretamente no `queryFn` em vez de tentar chamar `useEntityData`
- ✅ Retorna Promise corretamente
- ✅ Adicionado `async/await` para tratamento correto de erros

### 2. **Arquivo**: `src/components/rh/EmployeeForm.tsx`

**Mudanças:**
- ✅ Ajuste na linha 142: `const costCenters = costCentersData?.data || [];`
- Os outros campos (positions, units, workShifts, employees) já estavam corretos usando `useRHData`

## 🧪 Como Verificar a Correção

### Passo 1: Verificar se há dados no banco

Execute estas queries para verificar se existem dados:

```sql
-- Verificar cargos
SELECT id, nome FROM rh.positions;

-- Verificar departamentos
SELECT id, nome FROM rh.units;

-- Verificar turnos
SELECT id, nome, hora_inicio, hora_fim FROM rh.work_shifts;

-- Verificar centros de custo
SELECT id, nome, codigo FROM public.cost_centers;
```

### Passo 2: Testar o formulário

1. Abra a aplicação
2. Vá para **Funcionários** → **Novo Funcionário**
3. Aba **Profissionais**
4. Verifique se os campos agora mostram dados:
   - Cargo deve listar cargos existentes
   - Departamento deve listar departamentos existentes
   - Turno de Trabalho deve listar turnos existentes
   - Centro de Custo deve listar centros de custo existentes
   - Gestor Imediato deve listar funcionários existentes

### Passo 3: Verificar o console do navegador

Os logs de debug devem mostrar:
```
🔍 [DEBUG] useRHData - chamado para table: positions, companyId: <uuid>
🔍 [DEBUG] useRHData - query.data: {...}
🔍 [DEBUG] useRHData - result.data: [...]
```

## 📝 Notas Importantes

### Hooks do Schema `rh` (Positions, Units, Work Shifts, Employees)

Estes hooks usam `useRHData()` que já retorna o array de dados diretamente em `.data`. O componente acessa corretamente:
```typescript
const { data: positionsData } = useRHData('positions', selectedCompany?.id || '');
const positions = positionsData || []; // ✅ positionsData já é o array
```

### Hooks do Schema `public` (Cost Centers)

Estes hooks usam `useCostCenters()` que retorna um objeto React Query completo. O componente acessa corretamente:
```typescript
const { data: costCentersData } = useCostCenters();
const costCenters = costCentersData?.data || []; // ✅ costCentersData.data é o array
```

## 🚨 Se os dados ainda não aparecem

### Verificar:

1. **Company ID**: Certifique-se de que `selectedCompany?.id` está sendo passado corretamente
2. **Permissões**: Verifique se o usuário tem permissão para ler estas entidades
3. **Dados no banco**: Execute as queries SQL acima para confirmar que há dados
4. **Console**: Verifique se há erros no console do navegador

### Possível erro com `get_entity_data`:

Se a função RPC `get_entity_data` falhar, verifique:
- Se a migração mais recente foi aplicada
- Se os logs do banco mostram erros (usando `RAISE NOTICE`)
- Se as permissões de acesso ao schema estão configuradas

## ✅ Status

- [x] Hook `useCostCenters` corrigido
- [x] Acesso aos dados ajustado no `EmployeeForm`
- [ ] Teste manual para verificar se os dados aparecem
- [ ] Se necessário, criar dados de teste no banco

## 🔄 Próximos Passos

1. Testar o formulário com dados existentes
2. Se não houver dados, criar registros de teste:
   - Pelo menos 1 cargo (position)
   - Pelo menos 1 departamento (unit)
   - Pelo menos 1 turno (work_shift)
   - Pelo menos 1 centro de custo (cost_center)
3. Verificar se o modal carrega corretamente após as correções

