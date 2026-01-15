# Documentação: DSR em Escalas Rotativas - Tratamento de Trocas de Folga

## Problema Identificado

Em escalas rotativas (flexíveis), o funcionário pode folgar em dias diferentes do previsto no ciclo devido a:
- Trocas de folga entre funcionários
- Compensações
- Ajustes operacionais
- Outras situações específicas

**Exemplo:**
- Escala 6x1: Ciclo prevê folga no dia 7
- Funcionário folga no dia 6 (um dia antes) ou no dia 8 (um dia depois)
- O que acontece com o DSR?

## Solução Implementada

### Lógica Atual

A função `completeRecordsWithRestDays` cria registros virtuais de DSR apenas quando:

1. ✅ **É dia de folga no ciclo** (calculado pela função `is_rest_day`)
2. ✅ **NÃO tem registro de ponto** naquele dia
3. ✅ **NÃO está em atestado médico**
4. ✅ **NÃO está em férias**
5. ✅ **NÃO tem falta registrada**

### Comportamento em Casos Específicos

#### Caso 1: Funcionário folgou no dia previsto (ciclo correto)
- **Dia previsto para folga**: Dia 7 do ciclo
- **Funcionário folgou**: Dia 7
- **Tem registro?**: Não
- **Resultado**: ✅ Aparece como DSR

#### Caso 2: Funcionário folgou um dia antes (troca de folga)
- **Dia previsto para folga**: Dia 7 do ciclo
- **Funcionário folgou**: Dia 6 (um dia antes)
- **Tem registro no dia 6?**: Não
- **Tem registro no dia 7?**: Sim (trabalhou)
- **Resultado**: 
  - Dia 6: ❌ NÃO aparece como DSR (não é dia de folga no ciclo)
  - Dia 7: ❌ NÃO aparece como DSR (tem registro, trabalhou)

#### Caso 3: Funcionário folgou um dia depois (troca de folga)
- **Dia previsto para folga**: Dia 7 do ciclo
- **Funcionário folgou**: Dia 8 (um dia depois)
- **Tem registro no dia 7?**: Sim (trabalhou)
- **Tem registro no dia 8?**: Não
- **Resultado**:
  - Dia 7: ❌ NÃO aparece como DSR (tem registro, trabalhou)
  - Dia 8: ❌ NÃO aparece como DSR (não é dia de folga no ciclo)

## Limitações da Solução Atual

A solução atual **não detecta automaticamente** trocas de folga. Ela apenas:
- Mostra DSR nos dias previstos para folga que não têm registro
- Não mostra DSR se há registro (mesmo que seja dia de folga)

### O que NÃO é coberto:

1. **Trocas de folga não registradas**: Se o funcionário folgou em um dia diferente mas não há registro de falta no dia que deveria ter trabalhado, o sistema não detecta
2. **Compensações**: Se o funcionário trabalhou em um dia de folga para compensar outro dia, não há rastreamento automático

## Soluções Possíveis (Futuras Melhorias)

### Opção 1: Rastreamento Manual de Trocas
- Criar uma tabela `rh.folga_trocas` para registrar trocas de folga
- Quando houver troca, registrar:
  - Data original da folga
  - Data real da folga
  - Motivo da troca
- A função `is_rest_day` consultaria essa tabela

### Opção 2: Análise Inteligente de Padrões
- Analisar registros de ponto para detectar padrões
- Se funcionário não trabalhou em X dias consecutivos e trabalhou em um dia de folga, pode ser troca
- Complexo e pode gerar falsos positivos

### Opção 3: Campo de Observação
- Adicionar campo `observacoes` ou `tipo_folga` em `time_records`
- Permitir marcar manualmente quando é DSR vs troca de folga
- Mais simples, mas requer intervenção manual

## Recomendação Atual

**Para escalas rotativas com trocas frequentes de folga:**

1. **Registrar faltas corretamente**: Se o funcionário folgou em um dia diferente, registrar falta no dia que deveria ter trabalhado
2. **Usar observações**: Adicionar observação no registro explicando a troca
3. **Revisão manual**: Revisar relatórios mensais para ajustar DSR manualmente se necessário

## Comportamento Esperado

### Escala 6x1 - Exemplo Prático

**Ciclo previsto:**
- Dias 1-6: Trabalho
- Dia 7: Folga (DSR)

**Cenário A: Funcionário seguiu o ciclo**
- Dias 1-6: Tem registro → Trabalho
- Dia 7: Sem registro → ✅ DSR

**Cenário B: Funcionário folgou no dia 6 (um dia antes)**
- Dias 1-5: Tem registro → Trabalho
- Dia 6: Sem registro → ❌ NÃO é DSR (deveria trabalhar)
- Dia 7: Tem registro → Trabalho (compensou)
- **Resultado**: Dia 6 aparece como falta (se registrado) ou não aparece

**Cenário C: Funcionário folgou no dia 8 (um dia depois)**
- Dias 1-6: Tem registro → Trabalho
- Dia 7: Tem registro → Trabalho (compensou)
- Dia 8: Sem registro → ❌ NÃO é DSR (não é dia de folga no ciclo)
- **Resultado**: Dia 8 não aparece como DSR

## Conclusão

A solução atual funciona corretamente para casos onde o funcionário segue o ciclo previsto. Para trocas de folga, é necessário:
- Registrar faltas nos dias que deveria ter trabalhado
- Usar observações para documentar trocas
- Revisão manual dos relatórios quando necessário

Uma melhoria futura seria criar um sistema de rastreamento de trocas de folga.
