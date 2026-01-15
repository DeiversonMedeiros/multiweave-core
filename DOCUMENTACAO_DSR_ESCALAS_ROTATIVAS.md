# Documentação: Cálculo de DSR em Escalas Rotativas

## Problema Identificado

A função `is_rest_day` original só funcionava para **escalas fixas**, verificando se o dia da semana estava no array `dias_semana`. Para **escalas rotativas (flexíveis)**, não havia uma forma de determinar se um dia específico era folga, pois essas escalas não têm dias fixos da semana.

## Solução Implementada

### Escalas Fixas
- **Lógica**: Verifica se o dia da semana (Segunda=1, Terça=2, ..., Domingo=7) está no array `dias_semana` do turno
- **Exemplo**: Se `dias_semana = [1,2,3,4,5]`, então Segunda a Sexta são trabalho, Sábado e Domingo são folga

### Escalas Rotativas (Flexíveis)
- **Lógica**: Calcula a posição no ciclo baseado na data de início do turno do funcionário
- **Como funciona**:
  1. Busca a `data_inicio` do `employee_shift` (quando o funcionário começou a trabalhar com aquele turno)
  2. Calcula quantos dias se passaram desde o início: `dias_desde_inicio = data_atual - data_inicio`
  3. Calcula a posição no ciclo: `posicao_no_ciclo = (dias_desde_inicio % ciclo_dias) + 1`
  4. Se `posicao_no_ciclo > dias_trabalho`, então é folga

### Exemplo Prático: Escala 6x1

**Configuração:**
- `dias_trabalho = 6`
- `dias_folga = 1`
- `ciclo_dias = 7`
- `data_inicio = 2026-01-01` (funcionário começou neste turno em 01/01/2026)

**Cálculo para diferentes datas:**

| Data | Dias desde início | Posição no ciclo | É folga? |
|------|-------------------|------------------|----------|
| 01/01/2026 | 0 | 1 | Não (dia 1 de trabalho) |
| 02/01/2026 | 1 | 2 | Não (dia 2 de trabalho) |
| 03/01/2026 | 2 | 3 | Não (dia 3 de trabalho) |
| 04/01/2026 | 3 | 4 | Não (dia 4 de trabalho) |
| 05/01/2026 | 4 | 5 | Não (dia 5 de trabalho) |
| 06/01/2026 | 5 | 6 | Não (dia 6 de trabalho) |
| 07/01/2026 | 6 | 7 | **Sim** (dia 7 = folga) |
| 08/01/2026 | 7 | 1 | Não (novo ciclo, dia 1) |
| 09/01/2026 | 8 | 2 | Não (novo ciclo, dia 2) |
| ... | ... | ... | ... |

### Exemplo Prático: Escala 12x36

**Configuração:**
- `dias_trabalho = 1` (12 horas de trabalho)
- `dias_folga = 2` (36 horas de folga)
- `ciclo_dias = 3`
- `data_inicio = 2026-01-01`

**Cálculo:**

| Data | Dias desde início | Posição no ciclo | É folga? |
|------|-------------------|------------------|----------|
| 01/01/2026 | 0 | 1 | Não (dia 1 = trabalho) |
| 02/01/2026 | 1 | 2 | **Sim** (dia 2 = folga) |
| 03/01/2026 | 2 | 3 | **Sim** (dia 3 = folga) |
| 04/01/2026 | 3 | 1 | Não (novo ciclo, dia 1) |
| ... | ... | ... | ... |

## Tipos de Escala Suportados

A função suporta os seguintes tipos de escala rotativa:

1. **flexivel_6x1**: 6 dias trabalho, 1 folga (ciclo de 7 dias)
2. **flexivel_5x2**: 5 dias trabalho, 2 folgas (ciclo de 7 dias)
3. **flexivel_4x3**: 4 dias trabalho, 3 folgas (ciclo de 7 dias)
4. **escala_12x36**: 1 dia trabalho (12h), 2 dias folga (36h) (ciclo de 3 dias)
5. **escala_24x48**: 1 dia trabalho (24h), 2 dias folga (48h) (ciclo de 3 dias)
6. **personalizada**: Usa valores configurados em `dias_trabalho`, `dias_folga` e `ciclo_dias`

## Importante: Data de Início do Turno

Para escalas rotativas funcionarem corretamente, é **essencial** que o campo `data_inicio` na tabela `rh.employee_shifts` esteja preenchido corretamente. Esta data determina o início do ciclo para cada funcionário.

**Recomendação**: Ao atribuir um turno a um funcionário, sempre definir a `data_inicio` como a data em que ele realmente começou a trabalhar naquele turno.

## Migração

A migração `20260110000001_fix_is_rest_day_rotative_scales.sql` atualiza a função `rh.is_rest_day` para suportar escalas rotativas.

## Impacto

Com esta correção:
- ✅ DSR é calculado corretamente para escalas fixas (como antes)
- ✅ DSR é calculado corretamente para escalas rotativas (novo)
- ✅ Dias de folga aparecem com "DSR" nos relatórios PDF/CSV
- ✅ Dias de folga aparecem com "DSR" no histórico de marcações
