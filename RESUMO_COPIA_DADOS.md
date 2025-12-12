# Resumo da Cópia de Dados entre Empresas

## Empresas Envolvidas

### Empresa de Referência
- **ID**: `dc060329-50cd-4114-922f-624a6ab036d6`

### Empresas Destino
1. **ID**: `ce390408-1c18-47fc-bd7d-76379ec488b7`
2. **ID**: `ce92d32f-0503-43ca-b3cc-fb09a462b839`
3. **ID**: `f83704f6-3278-4d59-81ca-45925a1ab855`

## Dados Copiados

Os seguintes dados foram copiados da empresa de referência para as empresas destino:

1. ✅ **Centros de Custo** (`public.cost_centers`)
2. ✅ **Cargos** (`rh.positions`)
3. ✅ **Escalas de Trabalho** (`rh.work_shifts` e `rh.work_schedules`)
4. ✅ **Zonas de Localização** (`rh.location_zones`)
5. ✅ **Rubricas** (`rh.rubricas`)
6. ✅ **Faixas INSS** (`rh.inss_brackets`)
7. ✅ **Faixas IRRF** (`rh.irrf_brackets`)
8. ✅ **Configurações FGTS** (`rh.fgts_config`)
9. ✅ **Configurações de Folha** (`rh.payroll_config` - se existir)
10. ✅ **Configuração de Integração Financeira** (`rh.financial_integration_config`)
11. ✅ **Configuração Fiscal** (`financeiro.configuracao_fiscal` - se existir)
12. ✅ **Configuração Bancária** (`financeiro.configuracao_bancaria` - se existir)

## Scripts Criados

### 1. `copy_company_data.sql`
Script SQL completo que realiza a cópia de todos os dados. Pode ser executado diretamente no banco de dados.

### 2. `create_copy_function.sql`
Cria uma função RPC `public.copy_company_data()` que pode ser chamada para executar a cópia.

### 3. `execute_copy.sql`
Script que chama a função RPC para executar a cópia.

### 4. `verify_copy.sql`
Script de verificação que mostra quantos registros foram copiados para cada empresa.

### 5. `run_copy.ps1`
Script PowerShell que executa todos os passos automaticamente.

## Como Executar

### Opção 1: Executar o script SQL diretamente
```bash
psql "postgresql://postgres:81hbcoNDXaGiPIpp!@db.wmtftyaqucwfsnnjepiy.supabase.co:5432/postgres" -f copy_company_data.sql
```

### Opção 2: Usar a função RPC
```sql
SELECT public.copy_company_data(
    'dc060329-50cd-4114-922f-624a6ab036d6'::UUID,
    ARRAY[
        'ce390408-1c18-47fc-bd7d-76379ec488b7'::UUID,
        'ce92d32f-0503-43ca-b3cc-fb09a462b839'::UUID,
        'f83704f6-3278-4d59-81ca-45925a1ab855'::UUID
    ]
);
```

### Opção 3: Usar o Supabase CLI
```bash
Get-Content copy_company_data.sql | supabase db execute --db-url "postgresql://postgres:81hbcoNDXaGiPIpp!@db.wmtftyaqucwfsnnjepiy.supabase.co:5432/postgres"
```

## Verificação

Para verificar se os dados foram copiados corretamente, execute:
```bash
Get-Content verify_copy.sql | supabase db execute --db-url "postgresql://postgres:81hbcoNDXaGiPIpp!@db.wmtftyaqucwfsnnjepiy.supabase.co:5432/postgres"
```

## Observações

- Os scripts usam `ON CONFLICT DO NOTHING` para evitar duplicatas
- Todos os campos `created_at` e `updated_at` são atualizados para a data/hora atual
- A cópia mantém todos os relacionamentos e constraints do banco de dados
- Configurações de integração financeira são atualizadas se já existirem (ON CONFLICT DO UPDATE)

## Status

✅ Scripts criados e prontos para execução
✅ Função RPC criada no banco de dados
✅ Scripts de verificação disponíveis










