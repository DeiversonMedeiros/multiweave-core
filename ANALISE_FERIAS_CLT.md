# Análise do Sistema de Férias - Regras CLT

## Cenário de Teste
Funcionário com 30 dias de férias referentes ao ano de 2024:
- Solicita 10 dias em março de 2025
- Após isso, pode solicitar até mais duas férias referentes a este período
- Uma delas deve ter no mínimo 14 dias
- Ou pode solicitar uma férias de 20 dias
- Ou pode pedir mais uma férias de 14 dias e 6 dias de abono

## Regras CLT para Férias Fracionadas

1. **Máximo de 3 períodos** de férias
2. **Pelo menos um período deve ter 14+ dias consecutivos**
3. **Demais períodos devem ter no mínimo 5 dias consecutivos**
4. **Total máximo de 30 dias** (incluindo abono pecuniário)
5. **Máximo de 10 dias de abono pecuniário** (venda de férias)

## Problemas Encontrados

### 1. ❌ Validação de 14+ dias não estava funcionando (CORRIGIDO)
**Localização**: `supabase/migrations/20250110000008_create_vacation_functions.sql` linha 87-90

**Problema**: A validação verificava se havia um período com 14+ dias, mas não bloqueava se não houvesse.

**Correção**: Adicionada validação que realmente bloqueia a criação se não houver período com 14+ dias.

### 2. ❌ Bug na função aprovar_ferias (CORRIGIDO)
**Localização**: `supabase/migrations/20250110000008_create_vacation_functions.sql` linha 212

**Problema**: Estava somando `dias_gozados + dias_gozados` quando deveria ser `dias_gozados_atuais + dias_gozados_calculados`.

**Correção**: Corrigida a lógica de soma e adicionada validação de dias disponíveis antes de aprovar.

### 3. ⚠️ Validação de múltiplas solicitações (PARCIALMENTE CORRIGIDO)
**Problema**: A função não considerava solicitações já aprovadas para o mesmo ano aquisitivo ao validar novas solicitações.

**Correção**: Adicionada validação que soma dias já solicitados e aprovados antes de validar nova solicitação.

### 4. ✅ Validação Frontend está correta
**Localização**: `src/lib/vacationValidation.ts`

A validação frontend está implementada corretamente:
- Valida máximo de 3 períodos
- Valida que pelo menos um período tem 14+ dias
- Valida que demais períodos têm no mínimo 5 dias
- Valida total máximo de 30 dias
- Valida sobreposição de períodos

### 5. ⚠️ Consideração de solicitações pendentes (MELHORIA SUGERIDA)
**Problema**: O sistema não considera solicitações pendentes ao calcular dias disponíveis. Isso permite que o usuário faça múltiplas solicitações que somadas excedem os dias disponíveis.

**Solução Atual**: O backend valida apenas dias já aprovados. Solicitações pendentes não são consideradas até serem aprovadas.

**Melhoria Sugerida**: Adicionar validação no frontend que alerta o usuário sobre solicitações pendentes e calcula dias disponíveis considerando-as.

## Estrutura do Banco de Dados

### Tabela: `rh.vacation_entitlements`
Armazena os períodos aquisitivos de cada funcionário:
- `ano_aquisitivo`: Ano de referência das férias
- `dias_disponiveis`: Total de dias disponíveis (geralmente 30)
- `dias_gozados`: Dias já gozados (atualizado quando férias são aprovadas)
- `dias_restantes`: Calculado automaticamente (dias_disponiveis - dias_gozados)
- `status`: 'ativo', 'parcialmente_gozado', 'gozado', 'vencido'

### Tabela: `rh.vacations`
Armazena as solicitações de férias:
- `tipo`: 'ferias', 'licenca_medica', etc.
- `status`: 'pendente', 'aprovado', 'rejeitado', 'em_andamento', 'concluido'
- `dias_solicitados`: Total de dias solicitados

### Tabela: `rh.vacation_periods`
Armazena os períodos individuais de férias fracionadas:
- `vacation_id`: Referência à solicitação
- `dias_ferias`: Dias de férias do período
- `dias_abono`: Dias de abono pecuniário do período
- `periodo_numero`: Número do período (1, 2 ou 3)

## Fluxo de Validação

### Frontend (React)
1. Usuário preenche formulário de férias fracionadas
2. `validateFractionedVacation()` valida:
   - Número de períodos (máx 3)
   - Pelo menos um período com 14+ dias
   - Demais períodos com mínimo 5 dias
   - Total não excede 30 dias
   - Períodos não se sobrepõem
3. Se válido, envia para backend via RPC

### Backend (PostgreSQL)
1. Função `rh.criar_ferias_fracionadas()` recebe dados
2. Valida:
   - Funcionário tem direito a férias no ano
   - Número de períodos (máx 3)
   - Cada período tem dados válidos
   - Pelo menos um período com 14+ dias
   - Demais períodos com mínimo 5 dias
   - Total não excede 30 dias
   - Há dias suficientes disponíveis (considerando já aprovados)
3. Cria registro em `rh.vacations` com status 'pendente'
4. Cria períodos em `rh.vacation_periods`

### Aprovação
1. Função `rh.aprovar_ferias()` é chamada
2. Atualiza status da solicitação para 'aprovado'
3. Calcula total de dias gozados (soma de todos os períodos)
4. Atualiza `rh.vacation_entitlements`:
   - Incrementa `dias_gozados`
   - Atualiza `status` (ativo → parcialmente_gozado → gozado)

## Correções Aplicadas

### Migração: `20250120000001_fix_vacation_validation_rules.sql`

1. **Corrigida validação de 14+ dias**: Agora realmente bloqueia se não houver período com 14+ dias
2. **Corrigida função aprovar_ferias**: Corrigida soma de dias gozados
3. **Adicionada validação de múltiplas solicitações**: Considera dias já aprovados ao validar nova solicitação
4. **Melhoradas mensagens de erro**: Mais descritivas e informativas

## Testes Recomendados

1. ✅ Solicitar 10 dias → Deve permitir
2. ✅ Após aprovar 10 dias, solicitar mais 20 dias → Deve permitir (total 30)
3. ✅ Solicitar 3 períodos: 14 dias, 5 dias, 5 dias → Deve permitir (total 24)
4. ✅ Solicitar 2 períodos: 14 dias, 6 dias de abono → Deve permitir (total 20)
5. ❌ Solicitar 3 períodos: 5 dias, 5 dias, 5 dias → Deve BLOQUEAR (nenhum com 14+ dias)
6. ❌ Solicitar mais de 30 dias → Deve BLOQUEAR
7. ❌ Solicitar mais dias do que disponíveis → Deve BLOQUEAR

## Conclusão

O sistema agora está alinhado com as regras da CLT:
- ✅ Valida corretamente período mínimo de 14 dias
- ✅ Valida múltiplas solicitações para o mesmo ano
- ✅ Atualiza corretamente os dias gozados
- ✅ Frontend e backend estão alinhados

**Próximos passos sugeridos**:
- Adicionar validação no frontend que considera solicitações pendentes
- Adicionar alertas quando restarem menos de 14 dias após uma solicitação
- Melhorar UX mostrando quantos períodos ainda podem ser solicitados

