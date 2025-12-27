# 📋 Instruções para Aplicar Migrações de Logística

## ✅ O que já foi feito:

1. ✅ Schema do banco de dados criado (`supabase/migrations/20251220000020_create_logistica_schema.sql`)
2. ✅ Funções RPC criadas (`supabase/migrations/20251220000021_create_logistica_rpc_functions.sql`)
3. ✅ Integração com sistema de aprovações (`supabase/migrations/20251220000022_add_logistica_to_approval_system.sql`)
4. ✅ Tipos TypeScript criados (`src/types/logistica.ts`)
5. ✅ Hooks criados (`src/hooks/logistica/useLogisticaData.ts`)
6. ✅ Rotas criadas (`src/pages/logistica/LogisticaRoutes.tsx`)
7. ✅ Código atualizado para incluir 'logistica' no sistema de aprovações
8. ✅ App.tsx atualizado com rota de logística

## 🔧 Como aplicar as migrações:

### Opção 1: Via Supabase CLI (Recomendado)
```bash
supabase db push --db-url "postgresql://postgres:81hbcoNDXaGiPIpp!@db.wmtftyaqucwfsnnjepiy.supabase.co:5432/postgres"
```

### Opção 2: Via psql direto
```bash
# Aplicar migração 1
psql "postgresql://postgres:81hbcoNDXaGiPIpp!@db.wmtftyaqucwfsnnjepiy.supabase.co:5432/postgres" -f supabase/migrations/20251220000020_create_logistica_schema.sql

# Aplicar migração 2
psql "postgresql://postgres:81hbcoNDXaGiPIpp!@db.wmtftyaqucwfsnnjepiy.supabase.co:5432/postgres" -f supabase/migrations/20251220000021_create_logistica_rpc_functions.sql

# Aplicar migração 3
psql "postgresql://postgres:81hbcoNDXaGiPIpp!@db.wmtftyaqucwfsnnjepiy.supabase.co:5432/postgres" -f supabase/migrations/20251220000022_add_logistica_to_approval_system.sql
```

### Opção 3: Via Supabase Dashboard
1. Acesse o Supabase Dashboard
2. Vá em SQL Editor
3. Cole o conteúdo de cada arquivo de migração e execute

## 📝 Arquivos de Migração:

1. `supabase/migrations/20251220000020_create_logistica_schema.sql` - Schema completo
2. `supabase/migrations/20251220000021_create_logistica_rpc_functions.sql` - Funções RPC
3. `supabase/migrations/20251220000022_add_logistica_to_approval_system.sql` - Integração com aprovações

## ✅ Verificação:

Após aplicar as migrações, verifique se:
- Schema `logistica` foi criado
- Tabelas foram criadas (logistics_requests, trips, trip_items, etc.)
- Funções RPC foram criadas
- Constraint de aprovações foi atualizado para incluir 'logistica'

