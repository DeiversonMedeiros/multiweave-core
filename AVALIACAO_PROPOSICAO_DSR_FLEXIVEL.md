# Avaliação: Proposta de DSR para Escalas Flexíveis

## Proposta do Usuário

**Lógica proposta:**
- Se não tiver férias, compensação, atestado, licença, etc.
- O **primeiro dia** que o colaborador não registrar o ponto será considerado **DSR**
- Se ele não registrar nos **dias seguintes**, será considerado **falta**

## Análise de Viabilidade

### ✅ Vantagens

1. **Simplicidade**: Não requer rastreamento manual de trocas de folga
2. **Flexibilidade**: Funciona mesmo quando o funcionário folga em dias diferentes do ciclo
3. **Automático**: Detecta automaticamente quando é folga vs falta
4. **Adequado para escalas rotativas**: Não depende de dias fixos da semana

### ⚠️ Desafios e Considerações

#### 1. **Como identificar o "primeiro dia sem registro"?**

**Problema**: Precisamos saber qual foi o último dia trabalhado para identificar o primeiro dia sem registro.

**Solução**: Analisar os registros anteriores no mês para encontrar o último dia com registro.

#### 2. **Folgas consecutivas (escala 5x2, 12x36, etc.)**

**Exemplo - Escala 5x2:**
- 5 dias trabalho, 2 folgas consecutivas
- Se funcionário não registrou por 2 dias seguidos:
  - Dia 1 sem registro → DSR ✅
  - Dia 2 sem registro → DSR ou Falta? ⚠️

**Solução proposta**: 
- Verificar quantos dias de folga a escala permite (`dias_folga`)
- Se não registrou até `dias_folga` dias consecutivos → todos são DSR
- Se não registrou mais que `dias_folga` dias → excedentes são falta

#### 3. **Folgas não consecutivas**

**Exemplo:**
- Funcionário trabalhou dia 1, 2, 3
- Não registrou dia 4 (DSR)
- Trabalhou dia 5
- Não registrou dia 6 (DSR ou Falta?)

**Solução**: 
- Cada sequência de dias sem registro é analisada independentemente
- Primeiro dia de cada sequência = DSR (até o limite de `dias_folga`)
- Dias seguintes na mesma sequência = DSR (até `dias_folga`) ou Falta (se exceder)

#### 4. **Dias que deveriam ser trabalho mas não tem registro**

**Exemplo - Escala 6x1:**
- Deveria trabalhar dias 1-6, folgar dia 7
- Não registrou dia 6 (deveria trabalhar)
- Não registrou dia 7 (deveria folgar)

**Solução proposta**:
- Dia 6: Primeiro dia sem registro → DSR (mesmo que deveria trabalhar)
- Dia 7: Segundo dia sem registro → DSR (até limite de `dias_folga`)

**⚠️ Problema**: Isso pode mascarar faltas reais.

#### 5. **Limite de dias de folga**

**Solução**: Usar `dias_folga` da escala para limitar quantos dias consecutivos podem ser DSR:
- Escala 6x1: `dias_folga = 1` → máximo 1 dia DSR consecutivo
- Escala 5x2: `dias_folga = 2` → máximo 2 dias DSR consecutivos
- Escala 12x36: `dias_folga = 2` → máximo 2 dias DSR consecutivos

## Proposta de Implementação Híbrida

### Lógica Combinada

1. **Para escalas FIXAS**: Manter lógica atual (baseada em dias da semana)

2. **Para escalas FLEXÍVEIS/ROTATIVAS**: Usar lógica híbrida:
   - **Prioridade 1**: Se é dia de folga no ciclo E não tem registro → DSR
   - **Prioridade 2**: Se não é dia de folga no ciclo MAS é o primeiro dia sem registro em uma sequência → DSR (até limite de `dias_folga`)
   - **Prioridade 3**: Se exceder `dias_folga` dias consecutivos sem registro → Falta

### Algoritmo Detalhado

```
Para cada dia do mês (em ordem cronológica):
  1. Se tem registro de ponto → usar registro existente
  2. Se está em atestado/férias/licença → não criar DSR
  3. Se tem falta registrada → não criar DSR
  
  4. Para escalas FLEXÍVEIS:
     a. Se é dia de folga no ciclo E não tem registro → DSR ✅
     b. Se NÃO é dia de folga no ciclo:
        - Verificar quantos dias consecutivos sem registro (incluindo este)
        - Se é o primeiro dia da sequência E sequência <= dias_folga → DSR ✅
        - Se sequência > dias_folga → Falta ❌
```

### Exemplo Prático - Escala 6x1 (dias_folga = 1)

**Cenário A: Seguiu o ciclo**
- Dias 1-6: Tem registro → Trabalho
- Dia 7: Sem registro, é folga no ciclo → ✅ DSR

**Cenário B: Folgou um dia antes**
- Dias 1-5: Tem registro → Trabalho
- Dia 6: Sem registro, NÃO é folga no ciclo, primeiro dia sem registro → ✅ DSR
- Dia 7: Tem registro → Trabalho

**Cenário C: Folgou dois dias seguidos (não previsto)**
- Dias 1-5: Tem registro → Trabalho
- Dia 6: Sem registro, primeiro dia sem registro → ✅ DSR (dentro do limite de 1)
- Dia 7: Sem registro, segundo dia sem registro, excede dias_folga=1 → ❌ Falta

**Cenário D: Não registrou por 3 dias (faltas)**
- Dias 1-4: Tem registro → Trabalho
- Dia 5: Sem registro, primeiro dia sem registro → ✅ DSR (dentro do limite de 1)
- Dia 6: Sem registro, segundo dia sem registro, excede dias_folga=1 → ❌ Falta
- Dia 7: Sem registro, terceiro dia sem registro, excede dias_folga=1 → ❌ Falta

### Exemplo Prático - Escala 5x2 (dias_folga = 2)

**Cenário: Folgou dois dias seguidos**
- Dias 1-5: Tem registro → Trabalho
- Dia 6: Sem registro, primeiro dia sem registro → ✅ DSR (dentro do limite de 2)
- Dia 7: Sem registro, segundo dia sem registro → ✅ DSR (dentro do limite de 2)
- Dia 8: Tem registro → Trabalho

**Cenário: Não registrou por 3 dias (1 DSR + 2 faltas)**
- Dias 1-5: Tem registro → Trabalho
- Dia 6: Sem registro, primeiro dia sem registro → ✅ DSR (dentro do limite de 2)
- Dia 7: Sem registro, segundo dia sem registro → ✅ DSR (dentro do limite de 2)
- Dia 8: Sem registro, terceiro dia sem registro, excede dias_folga=2 → ❌ Falta

## Vantagens da Abordagem Híbrida

1. ✅ **Mantém precisão do ciclo**: Se o funcionário seguiu o ciclo, funciona perfeitamente
2. ✅ **Flexibilidade para trocas**: Se folgou em dia diferente, ainda detecta como DSR
3. ✅ **Limita abusos**: Não permite mais DSRs do que a escala permite
4. ✅ **Detecta faltas**: Dias além do limite são marcados como falta

## Desvantagens

1. ⚠️ **Pode mascarar faltas**: Se funcionário faltou em dia que deveria trabalhar, pode aparecer como DSR
2. ⚠️ **Complexidade**: Lógica mais complexa que a atual
3. ⚠️ **Requer análise sequencial**: Precisa analisar dias em ordem cronológica

## Recomendação

**Implementar a abordagem híbrida** com as seguintes regras:

1. **Escalas Fixas**: Manter lógica atual (baseada em dias da semana)
2. **Escalas Flexíveis**: 
   - Priorizar ciclo (se é folga no ciclo → DSR)
   - Se não é folga no ciclo, mas é primeiro dia sem registro → DSR (até `dias_folga`)
   - Dias além de `dias_folga` consecutivos → Falta

## Próximos Passos

1. Modificar `completeRecordsWithRestDays` para implementar lógica híbrida
2. Adicionar função auxiliar para detectar sequências de dias sem registro
3. Usar `dias_folga` da escala para limitar DSRs consecutivos
4. Testar com diferentes cenários
