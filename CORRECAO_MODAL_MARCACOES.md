# Correção: Modal não mostra marcações existentes

## Problema Identificado

Ao clicar em um dia com marcação no calendário, o modal "Solicitar Correção de Ponto" não mostrava as marcações já realizadas. Os campos apareciam vazios.

## Solução Implementada

### 1. Adicionada busca de registro existente
- **Import** adicionado: `useQuery` do `@tanstack/react-query`
- **Query criada** para buscar o registro atual quando o modal é aberto
- Query só executa quando não está criando novo registro (`!isCreating`)

### 2. Preenchimento automático do formulário
- Quando há um registro existente, os campos são preenchidos automaticamente
- Campos preenchidos:
  - Entrada
  - Saída
  - Entrada Almoço
  - Saída Almoço
  - Entrada Extra
  - Saída Extra

### 3. Exibição do registro atual
- Adicionado um `Alert` que mostra os horários atuais antes dos campos de correção
- Usuário vê claramente quais são os horários registrados atualmente
- Ajuda a identificar o que precisa ser corrigido

## Código Adicionado

### Busca do registro existente
```typescript
const { data: existingRecord } = useQuery({
  queryKey: ['time-record', date, employeeId, selectedCompany?.id],
  queryFn: async () => {
    if (!selectedCompany?.id) return null;
    
    const result = await EntityService.list({
      schema: 'rh',
      table: 'time_records',
      companyId: selectedCompany.id,
      filters: {
        employee_id: employeeId,
        data_registro: date
      },
      pageSize: 1
    });
    
    return result.data[0] || null;
  },
  enabled: !isCreating && !!selectedCompany?.id && !!employeeId && !!date
});
```

### Preenchimento automático
```typescript
useEffect(() => {
  if (existingRecord && !isCreating) {
    console.log('📝 [TimeRecordEditModal] Preenchendo formulário com dados existentes:', existingRecord);
    
    if (existingRecord.entrada) setValue('entrada', existingRecord.entrada);
    if (existingRecord.saida) setValue('saida', existingRecord.saida);
    if (existingRecord.entrada_almoco) setValue('entrada_almoco', existingRecord.entrada_almoco);
    if (existingRecord.saida_almoco) setValue('saida_almoco', existingRecord.saida_almoco);
    if (existingRecord.entrada_extra1) setValue('entrada_extra1', existingRecord.entrada_extra1);
    if (existingRecord.saida_extra1) setValue('saida_extra1', existingRecord.saida_extra1);
    
    console.log('✅ [TimeRecordEditModal] Formulário preenchido');
  } else if (isCreating) {
    reset();
  }
}, [existingRecord, isCreating, setValue, reset]);
```

### Exibição do registro atual
```typescript
{!isCreating && existingRecord && (
  <Alert className="bg-blue-50 border-blue-200">
    <CheckCircle className="h-4 w-4 text-blue-600" />
    <AlertDescription className="text-blue-800">
      <div className="space-y-2">
        <p className="font-medium">Registro Atual:</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {existingRecord.entrada && (
            <div><span className="font-medium">Entrada:</span> {existingRecord.entrada}</div>
          )}
          {/* ... outros campos ... */}
        </div>
      </div>
    </AlertDescription>
  </Alert>
)}
```

## Como Testar

1. **Acesse o Portal do Colaborador**
2. **Vá para "Correção de Ponto"**
3. **Clique em um dia que tem marcação** (por exemplo, dia 24 ou 25)
4. **Verifique que:**
   - Uma caixa azul aparece mostrando o "Registro Atual"
   - Os campos do formulário são preenchidos automaticamente com os horários atuais
   - Você pode editar os horários para solicitar a correção

## Logs de Debug

Os seguintes logs foram adicionados:
- `📝 [TimeRecordEditModal] Preenchendo formulário com dados existentes:` - Quando há um registro para preencher
- `✅ [TimeRecordEditModal] Formulário preenchido` - Quando o preenchimento foi concluído

## Status

✅ Correção aplicada  
✅ Modal agora busca e exibe os registros existentes  
✅ Formulário é preenchido automaticamente  
✅ Interface mostra claramente os horários atuais vs. novos

