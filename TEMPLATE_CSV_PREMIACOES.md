# Template CSV - Premiações e Produtividade

## Visão Geral
Este documento descreve a estrutura do arquivo CSV para importação de premiações e produtividade no sistema.

## Como Usar
1. Clique no botão "Template CSV" na página de Premiações e Produtividade
2. O arquivo `template_premiacoes.csv` será baixado automaticamente
3. Preencha os dados seguindo o formato do template
4. Use o botão "Importar CSV" para fazer o upload do arquivo preenchido

## Estrutura do CSV

### Campos Obrigatórios

| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| `employee_id` | UUID | ID único do funcionário no sistema | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` |
| `tipo` | String | Tipo da premiação | `premiacao`, `produtividade`, `bonus`, `comissao`, `meta`, `outros` |
| `nome` | String | Nome da premiação | `Premiação por Meta Atingida` |
| `valor` | Decimal | Valor da premiação (maior que 0) | `500.00` |
| `tipo_calculo` | String | Tipo de cálculo | `valor_fixo`, `percentual_meta`, `tabela_faixas`, `comissao_venda` |

### Campos Opcionais

| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| `employee_name` | String | Nome do funcionário (para validação) | `João Silva` |
| `descricao` | String | Descrição detalhada da premiação | `Premiação por atingir 120% da meta de vendas` |
| `percentual` | Decimal | Percentual da premiação (0-100) | `15.00` |
| `meta_atingida` | Decimal | Meta que foi atingida | `120000.00` |
| `meta_estabelecida` | Decimal | Meta estabelecida | `100000.00` |
| `criterios` | String | Critérios para concessão da premiação | `Meta de vendas mensal` |
| `observacoes` | String | Observações adicionais | `Excelente desempenho no mês` |

## Tipos de Premiação

### `premiacao`
Premiações gerais por desempenho ou conquistas.

### `produtividade`
Bônus baseado em indicadores de produtividade.

### `bonus`
Bônus especiais ou extraordinários.

### `comissao`
Comissões por vendas ou resultados.

### `meta`
Premiações baseadas em metas específicas.

### `outros`
Outros tipos de premiação não categorizados.

## Tipos de Cálculo

### `valor_fixo`
Valor fixo definido para a premiação.

### `percentual_meta`
Cálculo baseado em percentual da meta atingida.

### `tabela_faixas`
Cálculo baseado em tabela de faixas de desempenho.

### `comissao_venda`
Cálculo baseado em comissão sobre vendas.

## Exemplos de Uso

### Exemplo 1: Premiação por Meta
```csv
employee_id,employee_name,tipo,nome,descricao,valor,percentual,tipo_calculo,meta_atingida,meta_estabelecida,criterios,observacoes
a1b2c3d4-e5f6-7890-abcd-ef1234567890,João Silva,premiacao,Premiação por Meta Atingida,Premiação por atingir 120% da meta de vendas,500.00,15.00,percentual_meta,120000.00,100000.00,Meta de vendas mensal,Excelente desempenho no mês
```

### Exemplo 2: Bônus de Produtividade
```csv
employee_id,employee_name,tipo,nome,descricao,valor,percentual,tipo_calculo,meta_atingida,meta_estabelecida,criterios,observacoes
b2c3d4e5-f6g7-8901-bcde-f23456789012,Maria Santos,produtividade,Bônus de Produtividade,Bônus por alta produtividade,300.00,,valor_fixo,,,,Produtividade acima de 110%,Funcionária exemplar
```

## Validações

### Validações Automáticas
- **employee_id**: Deve existir no sistema
- **tipo**: Deve ser um dos valores válidos
- **nome**: Não pode estar vazio
- **valor**: Deve ser maior que zero
- **tipo_calculo**: Deve ser um dos valores válidos

### Dicas Importantes
1. **IDs de Funcionários**: Use os IDs exatos do sistema (UUIDs)
2. **Valores Decimais**: Use ponto (.) como separador decimal
3. **Campos com Vírgulas**: Se um campo contém vírgulas, ele será automaticamente envolvido em aspas
4. **Encoding**: Use UTF-8 para caracteres especiais
5. **Mês de Referência**: O mês de referência é definido na interface antes da importação

## Tratamento de Erros

Se houver erros na importação:
1. O sistema mostrará quantas linhas foram processadas com sucesso
2. Os erros serão registrados e podem ser consultados
3. Apenas as linhas válidas serão importadas
4. As linhas com erro podem ser corrigidas e reimportadas

## Suporte

Para dúvidas ou problemas com a importação, consulte:
- Logs de importação na interface
- Documentação do sistema
- Suporte técnico
