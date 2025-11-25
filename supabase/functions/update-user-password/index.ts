import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface UpdatePasswordRequest {
  user_id: string;
  new_password: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    console.log('update-user-password: Starting function execution');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('update-user-password: Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Configuração do servidor inválida' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabaseClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    console.log('update-user-password: Supabase client created');

    // Verify that the requesting user is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autorização não fornecido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    const { data: { user: requestingUser }, error: authError } = await supabaseClient.auth.getUser(token);
    console.log('update-user-password: Auth result:', { requestingUser: requestingUser?.id, authError });

    if (authError || !requestingUser) {
      console.error('update-user-password: Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if requesting user is admin
    const { data: isAdmin, error: adminCheckError } = await supabaseClient
      .rpc('is_admin', { user_id: requestingUser.id });
    
    console.log('update-user-password: Admin check result:', { isAdmin, adminCheckError });

    if (adminCheckError || !isAdmin) {
      console.error('update-user-password: Admin check error:', adminCheckError);
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem atualizar senhas' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    let requestBody: UpdatePasswordRequest;
    try {
      requestBody = await req.json();
      console.log('update-user-password: Request body parsed successfully');
    } catch (parseError) {
      console.error('update-user-password: Error parsing request body:', parseError);
      return new Response(
        JSON.stringify({ error: 'JSON inválido no corpo da requisição' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { user_id, new_password } = requestBody;

    // Validate input
    if (!user_id || !new_password) {
      console.error('update-user-password: Validation failed - missing required fields');
      return new Response(
        JSON.stringify({ error: 'Dados incompletos: user_id e new_password são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate password strength
    if (new_password.length < 6) {
      console.error('update-user-password: Password too short');
      return new Response(
        JSON.stringify({ error: 'Senha deve ter pelo menos 6 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(user_id)) {
      console.error('update-user-password: user_id não é um UUID válido:', user_id);
      return new Response(
        JSON.stringify({ error: 'user_id inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update user password using Supabase Auth Admin API
    console.log('update-user-password: Updating user password using Supabase Auth Admin API');
    
    try {
      const { data: updatedUser, error: updateError } = await supabaseClient.auth.admin.updateUserById(
        user_id,
        { password: new_password }
      );
      
      console.log('update-user-password: Auth updateUserById response:', { 
        hasData: !!updatedUser, 
        hasError: !!updateError,
        userId: updatedUser?.user?.id,
        userEmail: updatedUser?.user?.email
      });
      
      if (updateError) {
        console.error('update-user-password: Error updating password:', updateError);
        console.error('update-user-password: Error details:', JSON.stringify(updateError, null, 2));
        return new Response(
          JSON.stringify({ error: updateError.message || 'Erro ao atualizar senha do usuário' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('update-user-password: Password updated successfully');
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Senha atualizada com sucesso',
          user: {
            id: updatedUser.user.id,
            email: updatedUser.user.email
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
      
    } catch (authError: any) {
      console.error('update-user-password: Exception during password update:', authError);
      console.error('update-user-password: Exception details:', JSON.stringify(authError, null, 2));
      return new Response(
        JSON.stringify({ error: authError?.message || 'Erro ao atualizar senha do usuário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('=== update-user-password: ERRO INESPERADO ===');
    console.error('update-user-password: Unexpected error:', error);
    console.error('update-user-password: Error message:', error?.message);
    console.error('update-user-password: Error stack:', error?.stack);
    
    return new Response(
      JSON.stringify({ 
        error: error?.message || 'Erro interno do servidor'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

