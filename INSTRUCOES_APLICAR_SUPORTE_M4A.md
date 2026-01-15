# 📋 Instruções para Adicionar Suporte a M4A no Bucket de Treinamentos

## 🔍 Problema Identificado

O bucket `training-files` no Supabase Storage não estava configurado para aceitar arquivos M4A. O erro apresentado foi:
```
StorageApiError: mime type audio/x-m4a is not supported
```

## ✅ Solução

Foi criada uma migration que adiciona os MIME types necessários para arquivos M4A ao bucket `training-files`.

## 🔧 Como Aplicar a Migration

### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse o Supabase Dashboard: https://supabase.com/dashboard/project/wmtftyaqucwfsnnjepiy
2. Vá em **SQL Editor** (menu lateral)
3. Abra o arquivo: `supabase/migrations/20260115000002_add_m4a_mime_types_to_training_files_bucket.sql`
4. Copie todo o conteúdo do arquivo
5. Cole no SQL Editor do Supabase
6. Clique em **Run** para executar

### Opção 2: Via psql (Linha de Comando)

Se você tiver o `psql` instalado, execute:

```bash
psql "postgresql://postgres:81hbcoNDXaGiPIpp!@db.wmtftyaqucwfsnnjepiy.supabase.co:5432/postgres" -f supabase/migrations/20260115000002_add_m4a_mime_types_to_training_files_bucket.sql
```

## 📝 O que a Migration Faz

A migration atualiza o bucket `training-files` para incluir os seguintes MIME types adicionais:
- `audio/mp4` - M4A (formato padrão)
- `audio/x-m4a` - M4A (formato alternativo)

## ✅ Verificação

Após aplicar a migration, você pode verificar se funcionou tentando fazer upload de um arquivo M4A na página "Gestão de Treinamento Online" > aba "Conteúdo".

## 📄 Arquivo de Migration

- `supabase/migrations/20260115000002_add_m4a_mime_types_to_training_files_bucket.sql`
