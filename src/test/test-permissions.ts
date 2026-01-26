// =====================================================
// TESTE DE PERMISSÕES
// =====================================================
// Teste simples para verificar se as funções de permissão estão funcionando

import { supabase } from '@/integrations/supabase/client';

export async function testPermissionFunctions() {
  console.log('🧪 Testando funções de permissão...');

  try {
    // 1. Testar função is_admin
    console.log('1. Testando is_admin...');
    const { data: user } = await supabase.auth.getUser();
    
    if (!user.user) {
      console.error('❌ Usuário não autenticado');
      return false;
    }

    const { data: isAdmin, error: adminError } = await supabase
      .rpc('is_admin_simple', { p_user_id: user.user.id });

    if (adminError) {
      console.error('❌ Erro ao verificar admin:', adminError);
      return false;
    }

    console.log('✅ is_admin funcionando:', isAdmin);

    // 2. Testar função get_user_permissions
    console.log('2. Testando get_user_permissions...');
    const { data: permissions, error: permError } = await supabase
      .rpc('get_user_permissions', { p_user_id: user.user.id });

    if (permError) {
      console.error('❌ Erro ao buscar permissões:', permError);
      return false;
    }

    console.log('✅ get_user_permissions funcionando:', permissions?.length || 0, 'permissões');

    // 3. Testar função check_module_permission
    console.log('3. Testando check_module_permission...');
    const { data: modulePerm, error: moduleError } = await supabase
      .rpc('check_module_permission', {
        p_user_id: user.user.id,
        p_module_name: 'dashboard',
        p_action: 'read'
      });

    if (moduleError) {
      console.error('❌ Erro ao verificar permissão de módulo:', moduleError);
      return false;
    }

    console.log('✅ check_module_permission funcionando:', modulePerm);

    // 4. Testar função check_page_permission (permissões por página)
    console.log('4. Testando check_page_permission...');
    const { data: pagePerm, error: pageError } = await supabase
      .rpc('check_page_permission', {
        p_user_id: user.user.id,
        p_page_path: '/cadastros/usuarios',
        p_action: 'read'
      });

    if (pageError) {
      console.error('❌ Erro ao verificar permissão de página:', pageError);
      return false;
    }

    console.log('✅ check_page_permission funcionando:', pagePerm);

    console.log('🎉 Todas as funções de permissão estão funcionando!');
    return true;

  } catch (error: any) {
    console.error('❌ Erro geral no teste:', error);
    return false;
  }
}

// Executar teste se chamado diretamente
if (import.meta.hot) {
  console.log('🚀 Teste de permissões carregado. Use testPermissionFunctions() para executar.');
}
