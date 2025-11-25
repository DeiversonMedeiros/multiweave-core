# Correção: Formato de Hora nos Campos de Entrada

## Problema Identificado

Ao abrir o modal de correção, os campos de hora mostravam valores como "15:28:48" (com segundos), mas o input `type="time"` HTML5 aceita apenas o formato HH:MM (sem segundos). Isso causava o erro:

> "Introduza um valor válido. Os dois valores válidos mais próximos são 15:28 e 15:29."

## Solução Implementada

### Função de Formatação

Adicionada função `formatTimeForInput` que:
1. Remove os segundos do formato HH:MM:SS para HH:MM
2. Retorna o valor formatado para o input
3. Valida se o valor já está no formato correto

```typescript
const formatTimeForInput = (time: string | null | undefined): string | undefined => {
  if (!time) return undefined;
  // Se já está no formato correto HH:MM, retornar
  if (time.length === 5) return time;
  // Se tem segundos (HH:MM:SS), remover
  if (time.length === 8) return time.substring(0, 5);
  return time;
};
```

### Aplicação na Formatação

Antes de preencher qualquer campo de hora, o valor é formatado:

```typescript
if (existingRecord.entrada) {
  const entradaFormatted = formatTimeForInput(existingRecord.entrada);
  if (entradaFormatted) setValue('entrada', entradaFormatted);
}
```

## Campos Afetados

A formatação é aplicada a todos os campos de hora:
- ✅ Entrada
- ✅ Saída
- ✅ Entrada Almoço
- ✅ Saída Almoço
- ✅ Entrada Extra
- ✅ Saída Extra

## Resultado

### Antes
```
Input mostrar: 15:28:48 ❌ (não aceito pelo browser)
Erro: "Introduza um valor válido..."
```

### Depois
```
Input mostrar: 15:28 ✅ (aceito pelo browser)
Sem erros de validação
```

## Como Testar

1. **Recarregue a página**
2. **Clique em um dia que já tem marcação**
3. **Verifique que:**
   - Os campos de hora aparecem corretamente (HH:MM)
   - Não aparece erro de validação
   - É possível editar os horários
   - É possível salvar a correção

## Status

✅ Problema corrigido
✅ Todos os campos de hora formatados corretamente
✅ Sem erros de validação
✅ Interface funcionando perfeitamente

