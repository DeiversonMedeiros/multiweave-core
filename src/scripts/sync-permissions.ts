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

// Lista de entidades do PermissionManager (lista completa)
const PERMISSION_MANAGER_ENTITIES = [
  'usuarios', 'empresas', 'perfis', 'projetos', 'materiais_equipamentos', 'parceiros', 'services', 'centros_custo',
  'employees', 'registros_ponto', 'time_records', 'vacations', 'reimbursement_requests', 'periodic_exams',
  'disciplinary_actions', 'trainings', 'positions', 'work_shifts', 'holidays', 'rubricas', 'units', 'dependents',
  'employment_contracts', 'medical_agreements', 'benefits', 'payroll_config', 'payroll', 'income_statements', 'esocial',
  'inss_brackets', 'irrf_brackets', 'fgts_config', 'delay_reasons', 'absence_types', 'cid_codes', 'allowance_types',
  'deficiency_types', 'awards_productivity', 'medical_plans', 'employee_medical_plans', 'unions', 'employee_union_memberships',
  'payroll_calculation', 'event_consolidation', 'contas_pagar', 'contas_receber', 'borderos', 'remessas_bancarias',
  'retornos_bancarios', 'contas_bancarias', 'conciliacoes_bancarias', 'fluxo_caixa', 'nfe', 'nfse', 'plano_contas',
  'lancamentos_contabeis', 'configuracoes_aprovacao', 'aprovacoes', 'accounts_payable', 'configuracao_fiscal',
  'configuracao_bancaria', 'estoque_atual', 'movimentacoes_estoque', 'entradas_materiais', 'entrada_itens',
  'checklist_recebimento', 'transferencias', 'transferencia_itens', 'inventarios', 'inventario_itens', 'almoxarifados',
  'localizacoes_fisicas', 'warehouse_transfers', 'material_exit_requests', 'inventory_dashboard', 'inventory_management',
  'warehouse_reports', 'solicitacoes_compra', 'cotacoes', 'pedidos_compra', 'aprovacoes_compra', 'fornecedores',
  'contratos_compra', 'historico_compras', 'avaliacao_fornecedores', 'fornecedores_dados', 'vehicles', 'vehicle_documents',
  'drivers', 'vehicle_assignments', 'vehicle_inspections', 'inspection_items', 'vehicle_maintenances', 'vehicle_occurrences',
  'vehicle_requests', 'vehicle_images',
  // Entidades específicas dos Portais
  'approval_center', 'approval_configs', 'approvals', 'exam_management', 'manager_dashboard', 'portal_colaborador',
  'time_tracking_management', 'vacation_approvals'
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

async function syncEntityPermissions(profiles: any[]) {
  console.log('🔧 Sincronizando permissões de entidades...');

  // Usar lista do PermissionManager (lista completa)
  const entities = PERMISSION_MANAGER_ENTITIES;
  
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
    // Usar listas do PermissionManager (nomes em português como no banco)
    const modules = PERMISSION_MANAGER_MODULES;
    const entities = PERMISSION_MANAGER_ENTITIES;
    
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

    // 2. Verificar entidades no banco que não estão no código
    const { data: dbEntities } = await supabase
      .from('entity_permissions')
      .select('entity_name');

    const dbEntityNames = [...new Set(dbEntities?.map(e => e.entity_name) || [])];
    const missingEntitiesInCode = dbEntityNames.filter(entity => !entities.includes(entity));
    
    if (missingEntitiesInCode.length > 0) {
      console.warn('⚠️ Entidades no banco que não estão no código:', missingEntitiesInCode);
      inconsistencies.push(`Entidades no banco não encontradas no código: ${missingEntitiesInCode.join(', ')}`);
    }

    // 3. Verificar módulos no código que não estão no banco (para todos os perfis)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nome')
      .eq('is_active', true);

    if (profiles && profiles.length > 0) {
      const missingModulesInDb: string[] = [];
      const missingEntitiesInDb: string[] = [];
      
      for (const profile of profiles) {
        // Verificar módulos faltantes para este perfil
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

        // Verificar entidades faltantes para este perfil
        for (const entity of entities) {
          const { data: exists } = await supabase
            .from('entity_permissions')
            .select('id')
            .eq('profile_id', profile.id)
            .eq('entity_name', entity)
            .maybeSingle();

          if (!exists && !missingEntitiesInDb.includes(entity)) {
            missingEntitiesInDb.push(entity);
          }
        }
      }
      
      if (missingModulesInDb.length > 0) {
        console.warn('⚠️ Módulos no código que não estão no banco:', missingModulesInDb);
        inconsistencies.push(`Módulos no código não encontrados no banco: ${missingModulesInDb.join(', ')}`);
      }
      
      if (missingEntitiesInDb.length > 0) {
        console.warn('⚠️ Entidades no código que não estão no banco:', missingEntitiesInDb);
        inconsistencies.push(`Entidades no código não encontradas no banco: ${missingEntitiesInDb.join(', ')}`);
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
