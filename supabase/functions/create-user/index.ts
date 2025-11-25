import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  password: string;
  nome: string;
  username: string;
  company_id: string;
  profile_id: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('create-user: Starting function execution');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('create-user: Environment check:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!serviceRoleKey,
      urlLength: supabaseUrl?.length || 0,
      keyLength: serviceRoleKey?.length || 0
    });
    
    const supabaseClient = createClient(
      supabaseUrl ?? '',
      serviceRoleKey ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    console.log('create-user: Supabase client created');

    // Verify that the requesting user is an admin
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    console.log('create-user: Auth header received:', authHeader ? 'Present' : 'Missing');
    
    const { data: { user: requestingUser }, error: authError } = await supabaseClient.auth.getUser(token);
    console.log('create-user: Auth result:', { requestingUser: requestingUser?.id, authError });

    if (authError || !requestingUser) {
      console.error('create-user: Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if requesting user is admin
    const { data: isAdmin, error: adminCheckError } = await supabaseClient
      .rpc('is_admin', { user_id: requestingUser.id });
    
    console.log('create-user: Admin check result:', { isAdmin, adminCheckError });

    if (adminCheckError || !isAdmin) {
      console.error('create-user: Admin check error:', adminCheckError);
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem criar usuários' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('create-user: Attempting to parse request body...');
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('create-user: Request body parsed successfully:', requestBody);
    } catch (parseError) {
      console.error('create-user: Error parsing request body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { email, password, nome, username, company_id, profile_id }: CreateUserRequest = requestBody;

    console.log('=== create-user: EXTRAINDO DADOS DO REQUEST ===');
    console.log('create-user: username recebido (raw):', username);
    console.log('create-user: username type:', typeof username);
    console.log('create-user: username is null?', username === null);
    console.log('create-user: username is undefined?', username === undefined);
    console.log('create-user: username length:', username?.length || 0);

    const sanitizedUsername = username?.trim();

    console.log('create-user: sanitizedUsername:', sanitizedUsername);
    console.log('create-user: sanitizedUsername length:', sanitizedUsername?.length || 0);

    // Validate input
    console.log('=== create-user: VALIDAÇÃO DE INPUT ===');
    console.log('create-user: Validating input:', { 
      email: !!email, 
      password: !!password, 
      passwordLength: password?.length || 0,
      nome: !!nome,
      username: !!sanitizedUsername,
      usernameValue: sanitizedUsername,
      usernameLength: sanitizedUsername?.length || 0,
      company_id: !!company_id, 
      profile_id: !!profile_id 
    });
    
    if (!email || !password || !nome || !sanitizedUsername || !company_id || !profile_id) {
      console.error('create-user: Validation failed - missing required fields');
      return new Response(
        JSON.stringify({ error: 'Dados incompletos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (sanitizedUsername.length < 3) {
      return new Response(
        JSON.stringify({ error: 'Nome de usuário deve ter pelo menos 3 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Garantir unicidade do username antes de criar o usuário
    const { data: existingUsername, error: usernameLookupError } = await supabaseClient
      .from('users')
      .select('id')
      .ilike('username', sanitizedUsername)
      .maybeSingle();

    if (usernameLookupError) {
      console.error('create-user: Erro ao verificar username:', usernameLookupError);
      return new Response(
        JSON.stringify({ error: 'Erro ao validar nome de usuário' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingUsername?.id) {
      return new Response(
        JSON.stringify({ error: 'Nome de usuário já está em uso' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate password strength
    if (password.length < 6) {
      console.error('create-user: Password too short');
      return new Response(
        JSON.stringify({ error: 'Senha deve ter pelo menos 6 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user using Supabase Auth API
    console.log('create-user: Creating user using Supabase Auth API');
    
    try {
      const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nome }
      });
      
      console.log('create-user: Auth createUser response:', { 
        hasData: !!newUser, 
        hasError: !!createError,
        userId: newUser?.user?.id,
        userEmail: newUser?.user?.email
      });
      
      if (createError) {
        console.error('create-user: Error creating user:', createError);
        console.error('create-user: Error details:', JSON.stringify(createError, null, 2));
        return new Response(
          JSON.stringify({ error: createError.message || 'Database error creating new user' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const userId = newUser.user.id;
      console.log('create-user: User created successfully:', userId);

      // Create user-company relationship
      console.log('=== create-user: INICIANDO CRIAÇÃO DE RELACIONAMENTO ===');
      console.log('create-user: Parâmetros recebidos:', { 
        user_id: userId, 
        company_id, 
        profile_id,
        userId_type: typeof userId,
        company_id_type: typeof company_id,
        profile_id_type: typeof profile_id,
        userId_length: userId?.length,
        company_id_length: company_id?.length,
        profile_id_length: profile_id?.length
      });
      
      // Validar UUIDs antes de chamar RPC
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        console.error('create-user: userId não é um UUID válido:', userId);
        await supabaseClient.auth.admin.deleteUser(userId);
        return new Response(
          JSON.stringify({ error: `userId inválido: ${userId}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (!uuidRegex.test(company_id)) {
        console.error('create-user: company_id não é um UUID válido:', company_id);
        await supabaseClient.auth.admin.deleteUser(userId);
        return new Response(
          JSON.stringify({ error: `company_id inválido: ${company_id}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (!uuidRegex.test(profile_id)) {
        console.error('create-user: profile_id não é um UUID válido:', profile_id);
        await supabaseClient.auth.admin.deleteUser(userId);
        return new Response(
          JSON.stringify({ error: `profile_id inválido: ${profile_id}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('create-user: UUIDs validados com sucesso');
      
      let relationData, relationError;
      try {
        console.log('create-user: Chamando RPC create_user_company_relationship...');
        console.log('create-user: Parâmetros RPC:', JSON.stringify({
          p_user_id: userId,
          p_company_id: company_id,
          p_profile_id: profile_id
        }, null, 2));
        
        const rpcResult = await supabaseClient
          .rpc('create_user_company_relationship', {
            p_user_id: userId,
            p_company_id: company_id,
            p_profile_id: profile_id
          });
        
        console.log('create-user: RPC chamada concluída');
        console.log('create-user: RPC result object keys:', Object.keys(rpcResult || {}));
        console.log('create-user: RPC result completo:', JSON.stringify(rpcResult, null, 2));
        
        relationData = rpcResult.data;
        relationError = rpcResult.error;
        
        console.log('create-user: RPC response parsed:', { 
          hasData: !!relationData, 
          dataType: typeof relationData,
          isArray: Array.isArray(relationData),
          dataLength: Array.isArray(relationData) ? relationData.length : 'N/A',
          dataValue: relationData,
          hasError: !!relationError,
          errorType: typeof relationError,
          errorValue: relationError
        });
        
        if (relationError) {
          console.error('create-user: ERRO DETECTADO NA RESPOSTA RPC');
          console.error('create-user: Error object keys:', relationError ? Object.keys(relationError) : 'null');
          console.error('create-user: Error completo (JSON):', JSON.stringify(relationError, Object.getOwnPropertyNames(relationError), 2));
          console.error('create-user: Error message:', relationError?.message);
          console.error('create-user: Error code:', relationError?.code);
          console.error('create-user: Error details:', relationError?.details);
          console.error('create-user: Error hint:', relationError?.hint);
        }
      } catch (rpcException: any) {
        console.error('create-user: EXCEÇÃO CAPTURADA ao chamar RPC');
        console.error('create-user: Exception type:', typeof rpcException);
        console.error('create-user: Exception constructor:', rpcException?.constructor?.name);
        console.error('create-user: Exception keys:', Object.keys(rpcException || {}));
        console.error('create-user: Exception message:', rpcException?.message);
        console.error('create-user: Exception stack:', rpcException?.stack);
        console.error('create-user: Exception name:', rpcException?.name);
        console.error('create-user: Exception completo (JSON):', JSON.stringify(rpcException, Object.getOwnPropertyNames(rpcException), 2));
        
        relationError = {
          message: rpcException?.message || 'Erro desconhecido ao chamar RPC',
          code: rpcException?.code || 'RPC_EXCEPTION',
          details: rpcException?.details || rpcException?.toString(),
          hint: rpcException?.hint || rpcException?.stack
        };
      }

      if (relationError) {
        console.error('=== create-user: ERRO AO CRIAR RELACIONAMENTO ===');
        console.error('create-user: Error object completo:', relationError);
        console.error('create-user: Error JSON stringified:', JSON.stringify(relationError, null, 2));
        
        // Try to delete the created user to maintain consistency
        try {
          console.log('create-user: Tentando deletar usuário criado...');
          await supabaseClient.auth.admin.deleteUser(userId);
          console.log('create-user: Usuário criado foi deletado devido ao erro');
        } catch (deleteError: any) {
          console.error('create-user: Erro ao deletar usuário criado:', deleteError);
          console.error('create-user: Delete error details:', JSON.stringify(deleteError, null, 2));
        }
        
        // Construir mensagem de erro detalhada
        const errorMessage = relationError.message || relationError.details || relationError.hint || 'Erro ao associar usuário à empresa';
        const errorResponse: any = {
          error: errorMessage,
          errorCode: relationError.code || 'UNKNOWN_ERROR',
          errorDetails: relationError.details || null,
          errorHint: relationError.hint || null,
          errorFull: relationError || null,
          debug: {
            hasMessage: !!relationError.message,
            hasDetails: !!relationError.details,
            hasHint: !!relationError.hint,
            hasCode: !!relationError.code,
            errorType: typeof relationError,
            errorKeys: relationError ? Object.keys(relationError) : []
          }
        };
        
        console.error('create-user: Retornando resposta de erro:', JSON.stringify(errorResponse, null, 2));
        
        return new Response(
          JSON.stringify(errorResponse),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('=== create-user: RELACIONAMENTO CRIADO COM SUCESSO ===');

      console.log('create-user: User-company relationship created successfully');

      // Update public.users with company_id and username using direct SQL
      console.log('=== create-user: ATUALIZANDO TABELA users ===');
      console.log('create-user: userId:', userId);
      console.log('create-user: company_id:', company_id);
      console.log('create-user: sanitizedUsername:', sanitizedUsername);
      console.log('create-user: nome:', nome);
      console.log('create-user: Dados para update:', JSON.stringify({
        company_id,
        username: sanitizedUsername,
        nome
      }, null, 2));
      
      // Primeiro, verificar se o registro existe e quais colunas estão disponíveis
      const { data: existingUser, error: checkError } = await supabaseClient
        .from('users')
        .select('id, email, nome, username, company_id')
        .eq('id', userId)
        .single();
      
      console.log('=== create-user: VERIFICAÇÃO PRÉ-UPDATE ===');
      console.log('create-user: existingUser antes do update:', JSON.stringify(existingUser, null, 2));
      console.log('create-user: checkError:', checkError ? JSON.stringify(checkError, null, 2) : null);
      
      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found, mas isso não deveria acontecer
        console.error('create-user: Erro ao verificar usuário existente:', checkError);
      }
      
      const updatePayload = {
        company_id,
        username: sanitizedUsername,
        nome
      };
      
      console.log('create-user: Executando update na tabela users...');
      console.log('create-user: updatePayload:', JSON.stringify(updatePayload, null, 2));
      
      const { data: updateData, error: updateError } = await supabaseClient
        .from('users')
        .update(updatePayload)
        .eq('id', userId)
        .select('id, email, nome, username, company_id');

      console.log('=== create-user: RESULTADO DO UPDATE ===');
      console.log('create-user: updateData:', JSON.stringify(updateData, null, 2));
      console.log('create-user: updateError:', updateError ? JSON.stringify(updateError, null, 2) : null);
      
      if (updateData && updateData.length > 0) {
        console.log('create-user: Usuário atualizado com sucesso!');
        console.log('create-user: username salvo:', updateData[0]?.username);
        console.log('create-user: company_id salvo:', updateData[0]?.company_id);
      }

      if (updateError) {
        console.error('=== create-user: ERRO NO UPDATE ===');
        console.error('create-user: Error updating public.users:', updateError);
        console.error('create-user: Update error code:', (updateError as any)?.code);
        console.error('create-user: Update error message:', (updateError as any)?.message);
        console.error('create-user: Update error details:', JSON.stringify(updateError, null, 2));

        if ((updateError as any)?.code === '23505') {
          console.error('create-user: Nome de usuário duplicado detectado. Iniciando rollback.');
          await supabaseClient.auth.admin.deleteUser(userId);
          return new Response(
            JSON.stringify({ error: 'Nome de usuário já está em uso' }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Se houver erro no update mas não for duplicação, ainda tentamos continuar
        // mas logamos o erro para investigação
        console.warn('create-user: Erro no update, mas continuando o processo...');
      } else {
        console.log('=== create-user: UPDATE EXECUTADO COM SUCESSO ===');
        console.log('create-user: public.users updated successfully');
        console.log('create-user: Update result:', JSON.stringify(updateData, null, 2));
        
        if (updateData && updateData.length > 0) {
          console.log('create-user: Dados retornados do update:');
          console.log('create-user: - username:', updateData[0]?.username);
          console.log('create-user: - company_id:', updateData[0]?.company_id);
          console.log('create-user: - nome:', updateData[0]?.nome);
        } else {
          console.warn('create-user: ATENÇÃO: Update retornou sucesso mas sem dados!');
        }
      }

      console.log('=== create-user: VERIFICAÇÃO FINAL ===');
      console.log('create-user: Verificando dados finais do usuário no banco...');
      
      // Verificar se o username foi realmente salvo
      const { data: finalUserData, error: finalCheckError } = await supabaseClient
        .from('users')
        .select('id, email, nome, username, company_id')
        .eq('id', userId)
        .single();
      
      if (finalCheckError) {
        console.error('=== create-user: ERRO AO VERIFICAR DADOS FINAIS ===');
        console.error('create-user: Erro:', JSON.stringify(finalCheckError, null, 2));
        console.warn('create-user: Usando sanitizedUsername como fallback na resposta');
      } else {
        console.log('=== create-user: DADOS FINAIS VERIFICADOS ===');
        console.log('create-user: Dados completos:', JSON.stringify(finalUserData, null, 2));
        console.log('create-user: Username no banco:', finalUserData?.username);
        console.log('create-user: Username esperado:', sanitizedUsername);
        console.log('create-user: Username coincide?', finalUserData?.username === sanitizedUsername);
        
        if (!finalUserData?.username) {
          console.error('=== create-user: ATENÇÃO: USERNAME NÃO FOI SALVO! ===');
          console.error('create-user: O username deveria ser:', sanitizedUsername);
          console.error('create-user: Mas o banco retornou:', finalUserData?.username);
        }
      }
      
      // Garantir que sempre temos um username para retornar
      const finalUsername = finalUserData?.username || sanitizedUsername || '';
      
      console.log('=== create-user: PREPARANDO RESPOSTA ===');
      console.log('create-user: finalUserData?.username:', finalUserData?.username);
      console.log('create-user: sanitizedUsername:', sanitizedUsername);
      console.log('create-user: finalUsername (que será retornado):', finalUsername);
      
      const responsePayload = {
        success: true,
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          nome,
          username: finalUsername
        }
      };
      
      console.log('create-user: Response payload completo:', JSON.stringify(responsePayload, null, 2));
      
      return new Response(
        JSON.stringify(responsePayload),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
      
    } catch (authError) {
      console.error('create-user: Exception during user creation:', authError);
      console.error('create-user: Exception details:', JSON.stringify(authError, null, 2));
      return new Response(
        JSON.stringify({ error: 'Database error creating new user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('=== create-user: ERRO INESPERADO NO CATCH EXTERNO ===');
    console.error('create-user: Unexpected error:', error);
    console.error('create-user: Error type:', typeof error);
    console.error('create-user: Error constructor:', error?.constructor?.name);
    console.error('create-user: Error keys:', Object.keys(error || {}));
    console.error('create-user: Error message:', error?.message);
    console.error('create-user: Error stack:', error?.stack);
    console.error('create-user: Error completo (JSON):', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    
    return new Response(
      JSON.stringify({ 
        error: error?.message || 'Erro interno do servidor',
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        errorStack: error?.stack,
        errorFull: error ? Object.keys(error) : null,
        debug: 'Erro capturado no catch externo'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});