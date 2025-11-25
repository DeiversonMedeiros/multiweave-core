# Validação de 12 Meses de Trabalho para Solicitar Férias

## 📋 Resumo das Alterações

O sistema agora permite que o funcionário **visualize períodos futuros** para programação, mas **valida que a data de início das férias** seja após o término do período aquisitivo (12 meses completos), conforme a legislação brasileira (CLT).

## 🔍 Problema Identificado

Anteriormente, o sistema não permitia visualizar períodos futuros e não validava a data de início das férias. Agora:
- ✅ Funcionário pode **visualizar períodos futuros** para programação
- ✅ Sistema **valida que a data de início** seja após o término do período aquisitivo
- ✅ Funcionário admitido em **01/01/2023** pode ver o período de **2025**, mas só pode solicitar férias a partir de **02/01/2026** (após completar 12 meses)

## ✅ Solução Implementada

### 1. Criação de Períodos Aquisitivos (Incluindo Futuros)

**Arquivo:** `supabase/migrations/20250120000002_fix_vacation_years_from_admission.sql`

A função `rh.calcular_e_criar_periodos_aquisitivos` foi atualizada para:
- **Criar períodos futuros com status 'pendente'** para permitir visualização e programação
- Períodos completados têm status 'ativo' ou 'vencido'
- Períodos futuros têm status 'pendente'

```sql
-- Período ainda em andamento (menos de 12 meses)
-- Não criar período ainda - funcionário não completou 12 meses de trabalho
IF data_fim_periodo >= data_atual THEN
  -- Avançar para o próximo período
  CONTINUE;
END IF;

-- Criar período aquisitivo apenas se já foi completado (12 meses passaram)
IF data_fim_periodo <= data_atual THEN
  INSERT INTO rh.vacation_entitlements (...);
END IF;
```

### 2. Busca de Anos Disponíveis (Incluindo Futuros)

**Arquivo:** `supabase/migrations/20250120000002_fix_vacation_years_from_admission.sql`

A função `rh.buscar_anos_ferias_disponiveis` foi atualizada para:
- **Retornar períodos completados e futuros** (status != 'gozado')
- **Incluir `data_fim_periodo`** no retorno para validação no frontend
- Permitir visualização de períodos futuros para programação

```sql
WHERE ve.employee_id = employee_id_param
  AND ve.status != 'gozado'
  -- Apenas períodos que já foram completados (12 meses já passaram)
  AND ve.data_fim_periodo <= CURRENT_DATE
  -- Apenas períodos que ainda têm dias restantes disponíveis
  AND ve.dias_restantes > 0
```

### 3. Validação na Criação de Férias Fracionadas

**Arquivo:** `supabase/migrations/20250120000001_fix_vacation_validation_rules.sql`

A função `rh.criar_ferias_fracionadas` foi atualizada para:
- **Validar que a data de início seja após o término do período aquisitivo** (`data_inicio > data_fim_periodo`)
- Retornar erro claro se a data de início for antes ou igual ao término do período

```sql
-- Validar que o período aquisitivo já foi completado (12 meses já passaram)
IF periodo_data_fim IS NULL OR periodo_data_fim > CURRENT_DATE THEN
  RAISE EXCEPTION 'Período aquisitivo ainda não foi completado. É necessário ter pelo menos 12 meses de trabalho antes de solicitar férias.';
END IF;
```

### 4. Nova Função para Férias Integrais

**Arquivo:** `supabase/migrations/20250120000001_fix_vacation_validation_rules.sql`

Foi criada a função `rh.criar_ferias_integrais` que:
- **Valida que a data de início seja após o término do período aquisitivo** (`data_inicio > data_fim_periodo`)
- Valida que são exatamente 30 dias (férias integrais)
- Valida que há dias suficientes disponíveis

```sql
CREATE OR REPLACE FUNCTION rh.criar_ferias_integrais(
  p_company_id UUID,
  p_employee_id UUID,
  p_ano INTEGER,
  p_data_inicio DATE,
  p_data_fim DATE,
  p_observacoes TEXT DEFAULT NULL
) RETURNS UUID AS $$
```

### 5. Atualização do Frontend

**Arquivos:** 
- `src/pages/portal-colaborador/FeriasPage.tsx`
- `src/components/rh/FractionedVacationForm.tsx`
- `src/services/rh/vacationCalculationService.ts`

O frontend foi atualizado para:
- Usar a função RPC `rh.criar_ferias_integrais` em vez de criar diretamente na tabela
- Usar `call_schema_rpc` para chamar funções RPC do schema `rh`
- **Validar data mínima** no input de data de início (após término do período aquisitivo)
- **Exibir mensagem informativa** sobre a data mínima permitida
- **Validar em tempo real** se a data de início é válida
- Exibir mensagens de erro mais claras ao usuário

## 📊 Exemplo de Funcionamento

### Cenário: Funcionário Admitido em 01/01/2023

**Histórico:**
- ✅ Já gozou férias de 2023 (em 2024)
- ✅ Já gozou férias de 2024 (em 2025)
- 📅 Período aquisitivo de 2025: 01/01/2025 a 31/12/2025

**Data Atual:** 15/12/2025 (ainda não completou 12 meses do período de 2025)

- ✅ **Pode VER** o período de 2025 no dropdown (para programação)
- ❌ **NÃO pode solicitar férias** com data de início antes de **02/01/2026**
- O sistema **valida** que a data de início seja após 31/12/2025
- O input de data de início tem `min="2026-01-02"` (data_fim_periodo + 1 dia)

**Data Atual:** 02/01/2026 (já completou 12 meses do período de 2025)

- ✅ **Pode solicitar férias** com data de início a partir de **02/01/2026**
- O sistema **permite** qualquer data de início >= 02/01/2026

## 🔒 Validações Implementadas

1. ✅ Períodos futuros são criados com status 'pendente' para visualização
2. ✅ Períodos completados e futuros são exibidos no dropdown de anos
3. ✅ Validação de data mínima no frontend (input com `min` attribute)
4. ✅ Validação de data mínima no backend (data_inicio > data_fim_periodo)
5. ✅ Validação na criação de férias integrais
6. ✅ Validação na criação de férias fracionadas
7. ✅ Mensagens informativas sobre data mínima permitida
8. ✅ Mensagens de erro claras para o usuário

## 📝 Notas Importantes

- Cada período aquisitivo precisa de **12 meses completos** de trabalho
- O primeiro período começa na **data de admissão**
- Períodos subsequentes começam **12 meses após o anterior**
- O sistema calcula automaticamente os períodos baseado na `data_admissao` do funcionário

## 🚀 Próximos Passos

1. Aplicar as migrações no banco de dados
2. Testar com funcionários que foram admitidos recentemente
3. Verificar se os períodos aquisitivos estão sendo criados corretamente
4. Validar que funcionários não podem solicitar férias antes de completar 12 meses

