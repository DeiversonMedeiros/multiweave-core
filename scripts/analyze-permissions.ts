// Script temporário para analisar permissões no banco
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wmtftyaqucwfsnnjepiy.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzePermissions() {
  console.log('🔍 Analisando permissões no banco de dados...\n');

  // 1. Buscar perfil "Gestor Qualidade"
  console.log('📋 1. Buscando perfil "Gestor Qualidade"...');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .ilike('nome', '%qualidade%');

  if (profilesError) {
    console.error('❌ Erro ao buscar perfis:', profilesError);
    return;
  }

  console.log('✅ Perfis encontrados:', profiles?.length || 0);
  profiles?.forEach(p => {
    console.log(`   - ${p.nome} (ID: ${p.id}, Ativo: ${p.is_active})`);
  });

  if (!profiles || profiles.length === 0) {
    console.log('⚠️ Nenhum perfil encontrado com "qualidade" no nome');
    return;
  }

  const profileId = profiles[0].id;
  console.log(`\n🔍 Analisando perfil ID: ${profileId}\n`);

  // 2. Buscar permissões de módulos
  console.log('📋 2. Permissões de Módulos:');
  const { data: modulePerms, error: moduleError } = await supabase
    .from('module_permissions')
    .select('*')
    .eq('profile_id', profileId);

  if (moduleError) {
    console.error('❌ Erro ao buscar permissões de módulos:', moduleError);
  } else {
    const rhModules = modulePerms?.filter(m => 
      m.module_name === 'rh' || m.module_name === 'treinamento'
    ) || [];
    console.log(`   Total de módulos: ${modulePerms?.length || 0}`);
    console.log(`   Módulos RH/Treinamento:`);
    rhModules.forEach(m => {
      console.log(`   - ${m.module_name}: read=${m.can_read}, create=${m.can_create}, edit=${m.can_edit}, delete=${m.can_delete}`);
    });
  }

  // 3. Buscar permissões de entidades
  console.log('\n📋 3. Permissões de Entidades:');
  const { data: entityPerms, error: entityError } = await supabase
    .from('entity_permissions')
    .select('*')
    .eq('profile_id', profileId);

  if (entityError) {
    console.error('❌ Erro ao buscar permissões de entidades:', entityError);
  } else {
    const trainingEntities = entityPerms?.filter(e => 
      e.entity_name?.toLowerCase().includes('trein') || 
      e.entity_name?.toLowerCase().includes('training')
    ) || [];
    
    console.log(`   Total de entidades: ${entityPerms?.length || 0}`);
    console.log(`   Entidades de treinamento:`);
    trainingEntities.forEach(e => {
      console.log(`   - ${e.entity_name}: read=${e.can_read}, create=${e.can_create}, edit=${e.can_edit}, delete=${e.can_delete}`);
    });

    // Todas as entidades do RH
    console.log(`\n   Todas as entidades RH (primeiras 20):`);
    const rhEntities = [
      'employees', 'funcionarios',
      'positions', 'cargos',
      'units', 'unidades',
      'trainings', 'treinamentos',
      'time_records', 'registros_ponto',
      'vacations', 'ferias'
    ];
    
    entityPerms?.filter(e => 
      rhEntities.some(re => e.entity_name?.toLowerCase().includes(re.toLowerCase()))
    ).slice(0, 20).forEach(e => {
      console.log(`   - ${e.entity_name}: read=${e.can_read}`);
    });
  }

  // 4. Verificar todas as entidades no banco relacionadas a treinamento
  console.log('\n📋 4. Todas as entidades "treinamento" no banco:');
  const { data: allTrainingEntities, error: allError } = await supabase
    .from('entity_permissions')
    .select('entity_name')
    .or('entity_name.ilike.%trein%,entity_name.ilike.%training%');

  if (!allError && allTrainingEntities) {
    const unique = [...new Set(allTrainingEntities.map(e => e.entity_name))];
    console.log(`   Encontradas ${unique.length} entidades únicas:`);
    unique.forEach(name => {
      console.log(`   - ${name}`);
    });
  }

  // 5. Verificar nomes de entidades no banco vs código
  console.log('\n📋 5. Comparação Banco vs Código:');
  const codeEntities = ['treinamentos', 'trainings', 'training'];
  const dbEntities = allTrainingEntities ? [...new Set(allTrainingEntities.map(e => e.entity_name))] : [];
  
  console.log('   No código (após correção): treinamentos');
  console.log('   No banco:');
  dbEntities.forEach(e => {
    const match = e === 'treinamentos' ? '✅' : '⚠️';
    console.log(`   ${match} ${e}`);
  });
}

// Executar análise
analyzePermissions().catch(console.error);
