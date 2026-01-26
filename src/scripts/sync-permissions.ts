// =====================================================
// SCRIPT DE SINCRONIZAÇÃO DE PERMISSÕES
// =====================================================
// Este script sincroniza as permissões entre o código e o banco de dados

import { supabase } from '@/integrations/supabase/client';

interface ModulePermission {
  profile_id: string;
  module_name: string;
  can_read: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

// Lista de módulos do PermissionManager (nomes em português como estão no banco)
const PERMISSION_MANAGER_MODULES = [
  'dashboard',
  'cadastros',
  'usuarios',
  'empresas',
  'projetos',
  'materiais_equipamentos',
  'parceiros',
  'centros_custo',
  'portal_colaborador',
  'portal_gestor',
  'financeiro',
  'compras',
  'almoxarifado',
  'frota',
  'logistica',
  'rh',
  'recrutamento',
  'treinamento',
  'combustivel',
  'metalurgica',
  'comercial',
  'implantacao',
  'configuracoes'
];

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

    // Permissões por página: gerenciadas via PermissionManager (cadastros/perfis) e migrate_all_entities_to_pages_complete.sql

    console.log('✅ Sincronização de permissões concluída com sucesso!');
  } catch (error: any) {
    console.error('❌ Erro na sincronização:', error.message);
    throw error;
  }
}

async function syncModulePermissions(profiles: any[]) {
  console.log('🔧 Sincronizando permissões de módulos...');

  // Usar lista do PermissionManager (nomes em português como no banco)
  const modules = PERMISSION_MANAGER_MODULES;
  
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

// Função para verificar inconsistências
export async function checkPermissionInconsistencies() {
  console.log('🔍 Verificando inconsistências nas permissões...');

  try {
    const modules = PERMISSION_MANAGER_MODULES;
    const inconsistencies: string[] = [];

    // 1. Verificar módulos no banco que não estão no código
    const { data: dbModules } = await supabase
      .from('module_permissions')
      .select('module_name');

    const dbModuleNames = [...new Set(dbModules?.map(m => m.module_name) || [])];
    const missingInCode = dbModuleNames.filter(module => !modules.includes(module));
    
    if (missingInCode.length > 0) {
      console.warn('⚠️ Módulos no banco que não estão no código:', missingInCode);
      inconsistencies.push(`Módulos no banco não encontrados no código: ${missingInCode.join(', ')}`);
    }

    // 2. Verificar módulos no código que não estão no banco (para todos os perfis)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nome')
      .eq('is_active', true);

    if (profiles && profiles.length > 0) {
      const missingModulesInDb: string[] = [];

      for (const profile of profiles) {
        for (const module of modules) {
          const { data: exists } = await supabase
            .from('module_permissions')
            .select('id')
            .eq('profile_id', profile.id)
            .eq('module_name', module)
            .maybeSingle();

          if (!exists && !missingModulesInDb.includes(module)) {
            missingModulesInDb.push(module);
          }
        }
      }

      if (missingModulesInDb.length > 0) {
        console.warn('⚠️ Módulos no código que não estão no banco:', missingModulesInDb);
        inconsistencies.push(`Módulos no código não encontrados no banco: ${missingModulesInDb.join(', ')}`);
      }
    }

    if (inconsistencies.length === 0) {
      console.log('✅ Nenhuma inconsistência encontrada!');
    } else {
      console.log(`⚠️ Encontradas ${inconsistencies.length} inconsistência(s):`);
      inconsistencies.forEach(inc => console.log(`  - ${inc}`));
    }

    console.log('✅ Verificação de inconsistências concluída');
    return inconsistencies;
  } catch (error: any) {
    console.error('❌ Erro na verificação:', error.message);
    throw error;
  }
}

// Executar sincronização se chamado diretamente
if (import.meta.hot) {
  // Apenas para desenvolvimento
  console.log('🚀 Script de sincronização carregado. Use syncPermissions() para executar.');
}
