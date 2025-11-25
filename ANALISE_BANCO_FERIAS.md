# Análise do Banco de Dados - Sistema de Férias

## Dados Coletados

### Estatísticas Gerais
- **Total de funcionários**: 52
- **Funcionários com data de admissão**: 52 (100%)
- **Funcionários sem data de admissão**: 0
- **Total de períodos aquisitivos criados**: 1
- **Funcionários com períodos criados**: 1 (apenas 1.9% dos funcionários)

### Períodos Aquisitivos Existentes
- **Status 'ativo'**: 1
- **Status 'gozado'**: 0
- **Status 'parcialmente_gozado'**: 0
- **Status 'vencido'**: 0

### Exemplo de Dados Encontrados
```
Funcionário: Deiverson Jorge Honorato Medeiros
- Data de Admissão: 2024-01-01
- Período Aquisitivo: 2024
- Status: ativo
- Dias Disponíveis: 30
- Dias Gozados: 0
- Dias Restantes: 30
- Período: 2024-01-01 a 2024-12-31
```

### Funcionários SEM Períodos Aquisitivos (Exemplos)
- DAIANA CONCEICAO CORREIA (admitida em 2023-08-16) - **0 períodos**
- DAIANA HONORATO MEDEIROS (admitida em 2024-03-12) - **0 períodos**
- ADENILSON LIMA DOS SANTOS (admitido em 2025-09-05) - **0 períodos**
- E mais 48 funcionários sem períodos criados

## Função Atual: `rh.buscar_anos_ferias_disponiveis`

### Código Atual
```sql
CREATE OR REPLACE FUNCTION rh.buscar_anos_ferias_disponiveis(employee_id_param uuid)
RETURNS TABLE(...)
AS $$
BEGIN 
  RETURN QUERY 
  SELECT ve.ano_aquisitivo as ano, ve.dias_disponiveis, ve.dias_gozados, 
         ve.dias_restantes, ve.status, ve.data_vencimento 
  FROM rh.vacation_entitlements ve 
  WHERE ve.employee_id = employee_id_param 
    AND ve.status IN ('ativo', 'parcialmente_gozado') 
  ORDER BY ve.ano_aquisitivo DESC; 
END;
$$;
```

### Problemas Identificados

1. **Não cria períodos automaticamente**
   - A função apenas busca períodos existentes
   - Não calcula períodos baseados na data de admissão
   - 98% dos funcionários não têm períodos criados

2. **Não exclui explicitamente períodos gozados**
   - Filtra apenas por 'ativo' e 'parcialmente_gozado'
   - Não verifica se `dias_restantes > 0`
   - Pode retornar períodos vencidos sem dias disponíveis

3. **Não considera data de admissão**
   - Não calcula quantos períodos o funcionário deveria ter
   - Não cria períodos retroativos baseados na data de admissão

## Análise de Casos Específicos

### Caso 1: Funcionário Admitido em 2023
**DAIANA CONCEICAO CORREIA** - Admitida em 2023-08-16
- **Deveria ter**: 
  - Período 2023: 16/08/2023 a 15/08/2024 (30 dias)
  - Período 2024: 16/08/2024 a 15/08/2025 (30 dias)
  - Período 2025: 16/08/2025 a 15/08/2026 (30 dias)
- **Tem atualmente**: 0 períodos
- **Resultado**: Campo "Ano de Referência" vazio

### Caso 2: Funcionário Admitido em 2024
**DAIANA HONORATO MEDEIROS** - Admitida em 2024-03-12
- **Deveria ter**:
  - Período 2024: 12/03/2024 a 11/03/2025 (30 dias)
  - Período 2025: 12/03/2025 a 11/03/2026 (30 dias)
- **Tem atualmente**: 0 períodos
- **Resultado**: Campo "Ano de Referência" vazio

### Caso 3: Funcionário com Período Criado
**Deiverson Jorge Honorato Medeiros** - Admitido em 2024-01-01
- **Tem**: Período 2024 (30 dias disponíveis)
- **Deveria ter também**: Período 2025 (se já passou 12 meses)
- **Resultado**: Campo mostra apenas 2024

## Problemas Críticos Encontrados

### 1. Períodos Não São Criados Automaticamente
- **Impacto**: 98% dos funcionários não conseguem solicitar férias
- **Causa**: Não há processo automático de criação de períodos
- **Solução**: Função que calcula e cria períodos baseados na data de admissão

### 2. Períodos Não São Calculados Corretamente
- **Impacto**: Mesmo funcionários com períodos podem não ter todos os períodos que deveriam
- **Causa**: Períodos são criados manualmente, não baseados na data de admissão
- **Solução**: Cálculo automático a partir da data de admissão

### 3. Anos Gozados Não São Excluídos
- **Impacto**: Pode mostrar anos que já foram totalmente gozados
- **Causa**: Filtro não verifica `dias_restantes > 0`
- **Solução**: Adicionar filtro explícito para excluir períodos gozados

## Recomendações

### Migração Necessária
A migração `20250120000002_fix_vacation_years_from_admission.sql` resolve:
1. ✅ Cria períodos automaticamente baseados na data de admissão
2. ✅ Exclui períodos gozados do resultado
3. ✅ Calcula períodos corretamente (12 meses a partir da admissão)
4. ✅ Cria períodos retroativos para funcionários antigos

### Dados Esperados Após Migração

Para **DAIANA CONCEICAO CORREIA** (admitida em 2023-08-16):
- Período 2023: 16/08/2023 a 15/08/2024
- Período 2024: 16/08/2024 a 15/08/2025
- Período 2025: 16/08/2025 a 15/08/2026

Para **Deiverson Jorge Honorato Medeiros** (admitido em 2024-01-01):
- Período 2024: 01/01/2024 a 31/12/2024 (já existe)
- Período 2025: 01/01/2025 a 31/12/2025 (será criado)

## Dados Adicionais Coletados

### Férias Aprovadas
- **Total de férias aprovadas**: 0
- **Total de dias aprovados**: 0
- **Conclusão**: Nenhuma férias foi aprovada ainda, então não há períodos gozados no sistema

### Distribuição de Funcionários por Ano de Admissão
- **2023**: 1 funcionário (2 anos trabalhados)
- **2024**: Múltiplos funcionários (1 ano trabalhado)
- **2025**: Múltiplos funcionários (ainda no primeiro ano)

### Período Único Existente
- **Funcionário**: Deiverson Jorge Honorato Medeiros
- **Ano Aquisitivo**: 2024
- **Status**: ativo
- **Dias Gozados**: 0
- **Dias Restantes**: 30
- **Observação**: Este funcionário tem apenas 1 período, mas deveria ter também o período de 2025 (já passou 12 meses desde a admissão em 01/01/2024)

## Conclusão

O banco de dados atual tem:
- ✅ Estrutura correta (tabela `vacation_entitlements`)
- ✅ Funcionários com data de admissão cadastrada (100%)
- ✅ Nenhuma férias aprovada ainda (sistema limpo para migração)
- ❌ **98% dos funcionários não têm períodos aquisitivos criados**
- ❌ Períodos aquisitivos não são criados automaticamente
- ❌ Função não calcula períodos baseados na data de admissão
- ❌ Função não exclui explicitamente períodos gozados
- ❌ Funcionário com período existente não tem todos os períodos que deveria ter

## Impacto da Migração

### Antes da Migração
- 51 funcionários (98%) não conseguem solicitar férias (sem períodos)
- 1 funcionário pode solicitar, mas só vê 1 ano (deveria ver mais)

### Após a Migração
- Todos os 52 funcionários terão períodos aquisitivos calculados automaticamente
- Períodos serão criados baseados na data de admissão
- Funcionários verão todos os anos de férias disponíveis
- Anos gozados serão automaticamente excluídos

**A migração proposta é necessária, segura e resolverá o problema crítico de 98% dos funcionários não conseguirem solicitar férias.**

