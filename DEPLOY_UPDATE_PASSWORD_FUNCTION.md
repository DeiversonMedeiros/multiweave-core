# Deploy da Edge Function update-user-password

## Problema
A edge function `update-user-password` precisa ser deployada no Supabase para que a funcionalidade de atualização de senha funcione.

## Solução: Deploy Manual via Dashboard

### Passo 1: Acessar o Dashboard do Supabase
1. Acesse: https://supabase.com/dashboard
2. Faça login na sua conta
3. Selecione o projeto: `wmtftyaqucwfsnnjepiy`

### Passo 2: Criar a Edge Function
1. No menu lateral, vá em **Edge Functions**
2. Clique em **Create a new function**
3. Nome da função: `update-user-password`
4. Clique em **Create function**

### Passo 3: Copiar o Código
1. Abra o arquivo: `supabase/functions/update-user-password/index.ts`
2. Copie todo o conteúdo
3. Cole no editor da edge function no dashboard

### Passo 4: Deploy
1. Clique em **Deploy** ou **Save**
2. Aguarde o deploy ser concluído

## Alternativa: Deploy via CLI (se tiver permissões)

Se você tiver acesso via CLI com as credenciais corretas:

```bash
supabase functions deploy update-user-password --project-ref wmtftyaqucwfsnnjepiy
```

## Verificação

Após o deploy, a função estará disponível em:
```
https://wmtftyaqucwfsnnjepiy.supabase.co/functions/v1/update-user-password
```

## Teste

Após o deploy, teste a funcionalidade:
1. Acesse a página "Usuários"
2. Clique no botão "Senha" na coluna de ações
3. Preencha a nova senha e confirmação
4. Clique em "Atualizar Senha"

Se ainda houver erro de CORS, verifique se os headers estão corretos na função deployada.

