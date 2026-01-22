// Script para analisar perfil Gestor Qualidade no banco remoto
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wmtftyaqucwfsnnjepiy.supabase.co';
// Usar service_role key para ter acesso total (necessário para ler todas as tabelas)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtdGZ0eWFxdWN3ZnNubmplcGl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0ODczNTcsImV4cCI6MjA3NTA2MzM1N30.BERqAYRXe2AZmBKfq8_UK4YDjGrkCXi7vsCC2rBDzZE';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function analisarPerfilQualidade() {
  console.log('🔍 Iniciando análise do perfil "Gestor Qualidade"...\n');

  try {
    // 1. Buscar perfil
    console.log('1️⃣ Buscando perfil...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, nome, is_active, created_at')
      .or('nome.ilike.%qualidade%,nome.ilike.%gestor%qualidade%')
      .order('nome');

    if (profilesError) {
      console.error('❌ Erro ao buscar perfis:', profilesError);
      return;
    }

    if (!profiles || profiles.length === 0) {
      console.log('⚠️ Nenhum perfil encontrado com "qualidade" no nome');
      return;
    }

    console.log(`✅ Encontrados ${profiles.length} perfil(is):`);
    profiles.forEach(p => {
      console.log(`   - ${p.nome} (ID: ${p.id}, Ativo: ${p.is_active})`);
    });

    const profileId = profiles[0].id;
    console.log(`\n📌 Analisando perfil ID: ${profileId}\n`);

    // 2. Permissões de módulos (RH)
    console.log('2️⃣ Permissões de Módulos (RH/Treinamento):');
    const { data: modulePerms, error: moduleError } = await supabase
      .from('module_permissions')
      .select('module_name, can_read, can_create, can_edit, can_delete, profile_id')
      .eq('profile_id', profileId)
      .in('module_name', ['rh', 'treinamento']);

    if (moduleError) {
      console.error('❌ Erro ao buscar permissões de módulos:', moduleError);
    } else {
      if (modulePerms && modulePerms.length > 0) {
        modulePerms.forEach(mp => {
          const status = mp.module_name === 'rh' && mp.can_read 
            ? '🚨 PROBLEMA: Tem acesso ao módulo RH completo'
            : '✅ OK';
          console.log(`   - ${mp.module_name}: read=${mp.can_read}, create=${mp.can_create}, edit=${mp.can_edit}, delete=${mp.can_delete} ${status}`);
        });
      } else {
        console.log('   ℹ️ Nenhuma permissão de módulo RH/treinamento encontrada');
      }
    }

    // 3. Permissões de entidades (treinamento)
    console.log('\n3️⃣ Permissões de Entidades (Treinamento):');
    const { data: entityPerms, error: entityError } = await supabase
      .from('entity_permissions')
      .select('entity_name, can_read, can_create, can_edit, can_delete')
      .eq('profile_id', profileId)
      .or('entity_name.ilike.%trein%,entity_name.ilike.%training%');

    if (entityError) {
      console.error('❌ Erro ao buscar permissões de entidades:', entityError);
    } else {
      if (entityPerms && entityPerms.length > 0) {
        entityPerms.forEach(ep => {
          const status = ep.entity_name === 'treinamentos' 
            ? '✅ CORRETO (português)'
            : ep.entity_name === 'trainings'
            ? '⚠️ INCONSISTENTE (inglês)'
            : '❓ DESCONHECIDO';
          console.log(`   - ${ep.entity_name}: read=${ep.can_read}, create=${ep.can_create}, edit=${ep.can_edit}, delete=${ep.can_delete} ${status}`);
        });
      } else {
        console.log('   ⚠️ Nenhuma permissão de entidade de treinamento encontrada');
      }
    }

    // 4. Outras entidades do RH
    console.log('\n4️⃣ Outras Entidades do RH com Acesso:');
    const { data: otherEntities, error: otherError } = await supabase
      .from('entity_permissions')
      .select('entity_name, can_read')
      .eq('profile_id', profileId)
      .in('entity_name', ['employees', 'funcionarios', 'positions', 'cargos', 'units', 'unidades', 'time_records', 'registros_ponto']);

    if (otherError) {
      console.error('❌ Erro ao buscar outras entidades:', otherError);
    } else {
      if (otherEntities && otherEntities.length > 0) {
        console.log(`   🚨 PROBLEMA: Encontradas ${otherEntities.length} entidades do RH com acesso:`);
        otherEntities.forEach(oe => {
          console.log(`      - ${oe.entity_name}: read=${oe.can_read}`);
        });
      } else {
        console.log('   ✅ OK: Nenhuma outra entidade do RH com acesso');
      }
    }

    // 5. Diagnóstico final
    console.log('\n5️⃣ DIAGNÓSTICO FINAL:');
    const temModuloRH = modulePerms?.some(mp => mp.module_name === 'rh' && mp.can_read);
    const temEntidadeTreinamento = entityPerms?.some(ep => 
      ['treinamentos', 'trainings', 'training'].includes(ep.entity_name) && ep.can_read
    );
    const temOutrasEntidadesRH = otherEntities && otherEntities.length > 0;

    if (temModuloRH && !temOutrasEntidadesRH && temEntidadeTreinamento) {
      console.log('   🚨 PROBLEMA IDENTIFICADO:');
      console.log('      - Tem acesso ao módulo RH completo');
      console.log('      - Isso permite ver TODAS as páginas do RH');
      console.log('      - Mesmo sem permissão nas entidades específicas');
      console.log('\n   💡 SOLUÇÃO:');
      console.log('      - Remover permissão do módulo RH');
      console.log('      - Manter apenas permissão na entidade "treinamentos"');
    } else if (!temModuloRH && temEntidadeTreinamento) {
      console.log('   ✅ CONFIGURAÇÃO CORRETA:');
      console.log('      - Não tem acesso ao módulo RH');
      console.log('      - Tem acesso apenas à entidade treinamento');
    } else {
      console.log('   ⚠️ CONFIGURAÇÃO INCOMPLETA:');
      if (!temEntidadeTreinamento) {
        console.log('      - Não tem permissão na entidade de treinamento');
      }
      if (temOutrasEntidadesRH) {
        console.log('      - Tem acesso a outras entidades do RH que não deveria');
      }
    }

    console.log('\n✅ Análise concluída!');

  } catch (error) {
    console.error('❌ Erro na análise:', error);
  }
}

analisarPerfilQualidade();
