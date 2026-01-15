# 🔧 Correção: Bucket training-files não encontrado

## 📋 Problema Identificado

Ao tentar fazer upload de vídeos na página "Gestão de Treinamento Online" (aba "Conteúdo"), o sistema apresentou o erro:

```
StorageApiError: Bucket not found
POST https://wmtftyaqucwfsnnjepiy.supabase.co/storage/v1/object/training-files/... 400 (Bad Request)
```

O bucket `training-files` não existe no Supabase Storage, mesmo existindo uma migração anterior que deveria tê-lo criado.

## ✅ Solução Implementada

Foi criada uma nova migração que garante a criação do bucket `training-files` com todas as políticas RLS necessárias:

**Arquivo:** `supabase/migrations/20260115000001_create_training_files_bucket.sql`

### Características do Bucket:

- **Nome:** `training-files`
- **Tipo:** Privado (usa RLS para controle de acesso)
- **Limite de tamanho:** 500MB por arquivo (para vídeos)
- **Tipos MIME permitidos:**
  - Vídeos: `video/mp4`, `video/webm`, `video/ogg`, `video/quicktime`
  - PDFs: `application/pdf`
  - Documentos: `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  - Texto: `text/plain`, `text/html`
  - Imagens: `image/jpeg`, `image/jpg`, `image/png`
  - Áudio: `audio/mpeg`, `audio/mp3`, `audio/wav`, `audio/ogg`

### Estrutura de Pastas:

```
training-files/
  └── {company_id}/
      └── {training_id}/
          └── {content_id}/
              └── {filename}
```

### Políticas RLS Implementadas:

1. **Upload:** Apenas usuários autenticados da empresa podem fazer upload
2. **Visualização:** Usuários podem visualizar arquivos da sua empresa
3. **Atualização:** Usuários podem atualizar arquivos da sua empresa
4. **Exclusão:** Usuários podem deletar arquivos da sua empresa

## 🚀 Como Aplicar a Migração

### Opção 1: Via Supabase Dashboard (Mais Simples) ⭐

1. Acesse o Supabase Dashboard:
   ```
   https://supabase.com/dashboard/project/wmtftyaqucwfsnnjepiy
   ```

2. Vá em **SQL Editor** (menu lateral)

3. Abra o arquivo de migração:
   ```
   supabase/migrations/20260115000001_create_training_files_bucket.sql
   ```

4. Copie todo o conteúdo do arquivo

5. Cole no SQL Editor e clique em **Run** (ou pressione `Ctrl+Enter`)

6. Verifique se a execução foi bem-sucedida (deve aparecer "Success. No rows returned")

### Opção 2: Via Script PowerShell

Execute o script criado:

```powershell
.\apply_training_files_bucket.ps1
```

**Nota:** Requer que o `psql` (PostgreSQL client) esteja instalado e no PATH.

### Opção 3: Via Supabase CLI

Se você tiver o Supabase CLI configurado:

```powershell
supabase db push
```

Isso aplicará todas as migrações pendentes, incluindo a nova.

## ✅ Verificação

Após aplicar a migração, verifique se o bucket foi criado:

1. No Supabase Dashboard, vá em **Storage**
2. Verifique se o bucket `training-files` aparece na lista
3. Teste fazer upload de um vídeo na página "Gestão de Treinamento Online"

## 🔍 Arquivos Relacionados

- **Migração:** `supabase/migrations/20260115000001_create_training_files_bucket.sql`
- **Componente de Upload:** `src/components/rh/TrainingFileUpload.tsx`
- **Serviço:** `src/services/rh/onlineTrainingService.ts`

## 📝 Notas Importantes

- A migração usa `ON CONFLICT DO UPDATE`, então pode ser executada múltiplas vezes sem problemas
- As políticas RLS são removidas e recriadas para evitar conflitos
- O bucket é privado por padrão, garantindo segurança dos arquivos
- O limite de 500MB é adequado para vídeos de treinamento

## 🎯 Próximos Passos

Após aplicar a migração:

1. ✅ Teste o upload de um vídeo na página de treinamentos
2. ✅ Verifique se o arquivo aparece corretamente
3. ✅ Teste a visualização do vídeo após o upload
4. ✅ Verifique as permissões (apenas usuários da empresa devem ter acesso)

---

**Data da Correção:** 2026-01-15  
**Status:** ✅ Migração criada e pronta para aplicação
