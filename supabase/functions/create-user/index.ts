import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  password: string;
  nome: string;
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
    
    const { email, password, nome, company_id, profile_id }: CreateUserRequest = requestBody;

    // Validate input
    console.log('create-user: Validating input:', { 
      email: !!email, 
      password: !!password, 
      passwordLength: password?.length || 0,
      nome: !!nome, 
      company_id: !!company_id, 
      profile_id: !!profile_id 
    });
    
    if (!email || !password || !nome || !company_id || !profile_id) {
      console.error('create-user: Validation failed - missing required fields');
      return new Response(
        JSON.stringify({ error: 'Dados incompletos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      console.log('create-user: Creating user-company relationship:', { user_id: userId, company_id, profile_id });
      
      const { data: relationData, error: relationError } = await supabaseClient
        .rpc('create_user_company_relationship', {
          p_user_id: userId,
          p_company_id: company_id,
          p_profile_id: profile_id
        });

      console.log('create-user: RPC response:', { relationData, relationError });

      if (relationError) {
        console.error('create-user: Error creating user-company relationship:', relationError);
        console.error('create-user: RPC error details:', JSON.stringify(relationError, null, 2));
        // Try to delete the created user to maintain consistency
        await supabaseClient.auth.admin.deleteUser(userId);
        
        return new Response(
          JSON.stringify({ error: 'Erro ao associar usuário à empresa' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('create-user: User-company relationship created successfully');

      // Update public.users with company_id using direct SQL
      console.log('create-user: Updating public.users with company_id via direct SQL');
      console.log('create-user: SQL parameters:', { userId, company_id });
      
      const { data: updateData, error: updateError } = await supabaseClient
        .from('users')
        .update({ company_id })
        .eq('id', userId)
        .select();

      console.log('create-user: Update SQL response:', { updateData, updateError });

      if (updateError) {
        console.error('create-user: Error updating public.users:', updateError);
        console.error('create-user: Update error details:', JSON.stringify(updateError, null, 2));
      } else {
        console.log('create-user: public.users updated with company_id successfully');
        console.log('create-user: Update result:', updateData);
      }

      console.log('create-user: Process completed successfully');
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          user: {
            id: newUser.user.id,
            email: newUser.user.email,
            nome
          }
        }),
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
    console.error('create-user: Unexpected error:', error);
    console.error('create-user: Error stack:', error.stack);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});