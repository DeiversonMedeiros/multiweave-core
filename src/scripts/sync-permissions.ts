// =====================================================
// SCRIPT DE SINCRONIZAÇÃO DE PERMISSÕES
// =====================================================
// Este script sincroniza as permissões entre o código e o banco de dados

import { supabase } from '@/integrations/supabase/client';
import { PERMISSION_CONFIG } from '@/lib/permissions';

interface ModulePermission {
  profile_id: string;
  module_name: string;
  can_read: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

interface EntityPermission {
  profile_id: string;
  entity_name: string;
  can_read: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export async function syncPermissions() {
  console.log('🔄 Iniciando sincronização de permissões...');

  try {
    // 1. Buscar todos os perfis
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, nome')
      .eq('is_active', true);

    if (profilesError) {
      throw new Error(`Erro ao buscar perfis: ${profilesError.message}`);
    }

    console.log(`📋 Encontrados ${profiles?.length} perfis ativos`);

    // 2. Sincronizar permissões de módulos
    await syncModulePermissions(profiles || []);

    // 3. Sincronizar permissões de entidades
    await syncEntityPermissions(profiles || []);

    console.log('✅ Sincronização de permissões concluída com sucesso!');
  } catch (error: any) {
    console.error('❌ Erro na sincronização:', error.message);
    throw error;
  }
}

async function syncModulePermissions(profiles: any[]) {
  console.log('🔧 Sincronizando permissões de módulos...');

  const modules = Object.keys(PERMISSION_CONFIG.MODULE_TO_MENU);
  
  for (const profile of profiles) {
    console.log(`  📝 Processando perfil: ${profile.nome}`);

    for (const module of modules) {
      // Verificar se já existe permissão para este módulo
      const { data: existingPermission, error: checkError } = await supabase
        .from('module_permissions')
        .select('id')
        .eq('profile_id', profile.id)
        .eq('module_name', module)
        .maybeSingle();

      if (!existingPermission) {
        // Criar permissão padrão (apenas leitura para usuários normais)
        const isAdmin = profile.nome.toLowerCase().includes('admin');
        const defaultPermission: ModulePermission = {
          profile_id: profile.id,
          module_name: module,
          can_read: true,
          can_create: isAdmin,
          can_edit: isAdmin,
          can_delete: isAdmin,
        };

        const { error } = await supabase
          .from('module_permissions')
          .insert(defaultPermission);

        if (error) {
          console.warn(`⚠️ Erro ao criar permissão para módulo ${module}:`, error.message);
        } else {
          console.log(`    ✅ Criada permissão para módulo: ${module}`);
        }
      }
    }
  }
}

async function syncEntityPermissions(profiles: any[]) {
  console.log('🔧 Sincronizando permissões de entidades...');

  const entities = Object.keys(PERMISSION_CONFIG.ENTITY_ACTIONS);
  
  for (const profile of profiles) {
    console.log(`  📝 Processando perfil: ${profile.nome}`);

    for (const entity of entities) {
      // Verificar se já existe permissão para esta entidade
      const { data: existingPermission, error: checkError } = await supabase
        .from('entity_permissions')
        .select('id')
        .eq('profile_id', profile.id)
        .eq('entity_name', entity)
        .maybeSingle();

      if (!existingPermission) {
        // Criar permissão padrão (apenas leitura para usuários normais)
        const isAdmin = profile.nome.toLowerCase().includes('admin');
        const defaultPermission: EntityPermission = {
          profile_id: profile.id,
          entity_name: entity,
          can_read: true,
          can_create: isAdmin,
          can_edit: isAdmin,
          can_delete: isAdmin,
        };

        const { error } = await supabase
          .from('entity_permissions')
          .insert(defaultPermission);

        if (error) {
          console.warn(`⚠️ Erro ao criar permissão para entidade ${entity}:`, error.message);
        } else {
          console.log(`    ✅ Criada permissão para entidade: ${entity}`);
        }
      }
    }
  }
}

// Função para verificar inconsistências
export async function checkPermissionInconsistencies() {
  console.log('🔍 Verificando inconsistências nas permissões...');

  try {
    const modules = Object.keys(PERMISSION_CONFIG.MODULE_TO_MENU);
    const entities = Object.keys(PERMISSION_CONFIG.ENTITY_ACTIONS);

    // Verificar módulos no banco que não estão no código
    const { data: dbModules } = await supabase
      .from('module_permissions')
      .select('module_name');

    const dbModuleNames = [...new Set(dbModules?.map(m => m.module_name) || [])];
    const missingInCode = dbModuleNames.filter(module => !modules.includes(module));
    
    if (missingInCode.length > 0) {
      console.warn('⚠️ Módulos no banco que não estão no código:', missingInCode);
    }

    // Verificar entidades no banco que não estão no código
    const { data: dbEntities } = await supabase
      .from('entity_permissions')
      .select('entity_name');

    const dbEntityNames = [...new Set(dbEntities?.map(e => e.entity_name) || [])];
    const missingEntitiesInCode = dbEntityNames.filter(entity => !entities.includes(entity));
    
    if (missingEntitiesInCode.length > 0) {
      console.warn('⚠️ Entidades no banco que não estão no código:', missingEntitiesInCode);
    }

    // Verificar módulos no código que não estão no banco
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('is_active', true);

    if (profiles && profiles.length > 0) {
      const profileId = profiles[0].id;
      
      for (const module of modules) {
        const { data: exists } = await supabase
          .from('module_permissions')
          .select('id')
          .eq('profile_id', profileId)
          .eq('module_name', module)
          .maybeSingle();

        if (!exists) {
          console.warn(`⚠️ Módulo no código que não está no banco: ${module}`);
        }
      }

      for (const entity of entities) {
        const { data: exists } = await supabase
          .from('entity_permissions')
          .select('id')
          .eq('profile_id', profileId)
          .eq('entity_name', entity)
          .maybeSingle();

        if (!exists) {
          console.warn(`⚠️ Entidade no código que não está no banco: ${entity}`);
        }
      }
    }

    console.log('✅ Verificação de inconsistências concluída');
  } catch (error: any) {
    console.error('❌ Erro na verificação:', error.message);
  }
}

// Executar sincronização se chamado diretamente
if (import.meta.hot) {
  // Apenas para desenvolvimento
  console.log('🚀 Script de sincronização carregado. Use syncPermissions() para executar.');
}
