#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Configuração dos módulos por prioridade
const modulePhases = {
  phase1_critical: {
    name: "Módulos Críticos",
    modules: {
      'rh': {
        pages: [
          'RHDashboard.tsx',
          'EmployeesPageNew.tsx', 
          'PositionsPageNew.tsx',
          'UnitsPageNew.tsx',
          'TimeRecordsPageNew.tsx',
          'BenefitsPageNew.tsx',
          'PayrollPageNew.tsx',
          'IrrfBracketsPage.tsx',
          'FgtsConfigPage.tsx',
          'PayrollCalculationPage.tsx',
          'AwardsProductivityPage.tsx',
          'AwardProductivityEditPage.tsx',
          'AwardProductivityDetailPage.tsx',
          'MedicalAgreementsPage.tsx',
          'MedicalAgreementEditPage.tsx'
        ],
        basePath: 'src/pages/rh',
        moduleName: 'rh'
      },
      'cadastros': {
        pages: [
          'Materiais.tsx',
          'Parceiros.tsx', 
          'Projetos.tsx',
          'CentrosCusto.tsx',
          'UserCompanies.tsx'
        ],
        basePath: 'src/pages/cadastros',
        moduleName: 'cadastros'
      }
    }
  },
  phase2_secondary: {
    name: "Módulos Secundários", 
    modules: {
      'portal_colaborador': {
        pages: [
          'ColaboradorDashboard.tsx',
          'RegistroPontoPage.tsx',
          'BancoHorasPage.tsx',
          'FeriasPage.tsx',
          'HoleritesPage.tsx',
          'ReembolsosPage.tsx',
          'AtestadosPage.tsx',
          'ExamesPage.tsx',
          'ComprovantesPage.tsx'
        ],
        basePath: 'src/pages/portal-colaborador',
        moduleName: 'portal_colaborador'
      },
      'portal_gestor': {
        pages: [
          'AprovacaoCompensacoes.tsx',
          'AprovacaoReembolsos.tsx',
          'AprovacaoAtestados.tsx',
          'AprovacaoEquipamentos.tsx',
          'AprovacaoCorrecoesPonto.tsx'
        ],
        basePath: 'src/pages/portal-gestor',
        moduleName: 'portal_gestor'
      },
      'almoxarifado': {
        pages: [
          'EntradasMateriaisPage.tsx',
          'HistoricoMovimentacoesPage.tsx',
          'InventarioPage.tsx',
          'RelatoriosPage.tsx',
          'SaidasTransferenciasPage.tsx',
          'TestPage.tsx'
        ],
        basePath: 'src/pages/almoxarifado',
        moduleName: 'almoxarifado'
      }
    }
  },
  phase3_optional: {
    name: "Módulos Opcionais",
    modules: {
      'financeiro': {
        pages: ['FinancialPage.tsx'],
        basePath: 'src/pages',
        moduleName: 'financeiro'
      }
    }
  }
};

// Função para aplicar permissões a um arquivo
function applyPermissionsToFile(filePath, moduleName) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Arquivo não encontrado: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // 1. Adicionar imports necessários
    const permissionImports = [
      "import { RequireModule } from '@/components/RequireAuth';",
      "import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';",
      "import { usePermissions } from '@/hooks/usePermissions';"
    ];

    // Verificar se os imports já existem
    const hasImports = permissionImports.every(imp => content.includes(imp));
    if (!hasImports) {
      // Encontrar a posição para inserir os imports
      const importRegex = /^import\s+.*from\s+['"].*['"];$/gm;
      const imports = content.match(importRegex) || [];
      
      if (imports.length > 0) {
        // Inserir após o último import
        const lastImport = imports[imports.length - 1];
        const lastImportIndex = content.lastIndexOf(lastImport) + lastImport.length;
        const newImports = '\n' + permissionImports.join('\n') + '\n';
        content = content.slice(0, lastImportIndex) + newImports + content.slice(lastImportIndex);
        modified = true;
        console.log(`🔧 Adicionados imports de permissões em: ${filePath}`);
      }
    }

    // 2. Adicionar usePermissions hook se não existir
    if (!content.includes('usePermissions()')) {
      // Encontrar onde adicionar o hook (após outros hooks)
      const hookRegex = /const\s+\{[^}]*\}\s*=\s*use[A-Z][a-zA-Z]*\(\);/g;
      const hooks = content.match(hookRegex) || [];
      
      if (hooks.length > 0) {
        const lastHook = hooks[hooks.length - 1];
        const lastHookIndex = content.lastIndexOf(lastHook) + lastHook.length;
        const newHook = '\n  const { canReadModule, canCreateModule, canEditModule, canDeleteModule } = usePermissions();';
        content = content.slice(0, lastHookIndex) + newHook + content.slice(lastHookIndex);
        modified = true;
        console.log(`🔧 Adicionado usePermissions hook em: ${filePath}`);
      }
    }

    // 3. Envolver o return principal com RequireModule
    if (!content.includes('<RequireModule')) {
      // Encontrar o return principal
      const returnRegex = /return\s*\(\s*<div[^>]*className[^>]*>/;
      const match = content.match(returnRegex);
      
      if (match) {
        const returnIndex = content.indexOf(match[0]);
        const divIndex = content.indexOf('<div', returnIndex);
        
        // Adicionar RequireModule antes do div
        const requireModuleOpen = `    <RequireModule moduleName="${moduleName}" action="read">\n      `;
        content = content.slice(0, divIndex) + requireModuleOpen + content.slice(divIndex);
        
        // Encontrar o fechamento do return
        const returnEndRegex = /^\s*\);\s*$/m;
        const returnEndMatch = content.match(returnEndRegex);
        
        if (returnEndMatch) {
          const returnEndIndex = content.lastIndexOf(returnEndMatch[0]);
          const requireModuleClose = '\n    </RequireModule>';
          content = content.slice(0, returnEndIndex) + requireModuleClose + content.slice(returnEndIndex);
        }
        
        modified = true;
        console.log(`🔧 Adicionado RequireModule wrapper em: ${filePath}`);
      }
    }

    // Salvar se houve modificações
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Permissões aplicadas: ${filePath}`);
      return true;
    } else {
      console.log(`✅ Sem alterações necessárias: ${filePath}`);
      return true;
    }
    
  } catch (error) {
    console.error(`❌ Erro ao aplicar permissões em ${filePath}:`, error.message);
    return false;
  }
}

// Função para aplicar permissões a um módulo
function applyPermissionsToModule(moduleConfig, moduleName) {
  console.log(`\n🎯 Aplicando permissões ao módulo: ${moduleName}`);
  console.log(`📁 Caminho: ${moduleConfig.basePath}`);
  console.log(`📄 Arquivos: ${moduleConfig.pages.length}`);
  
  let successCount = 0;
  let totalCount = moduleConfig.pages.length;
  
  for (const page of moduleConfig.pages) {
    const filePath = path.join(moduleConfig.basePath, page);
    if (applyPermissionsToFile(filePath, moduleConfig.moduleName)) {
      successCount++;
    }
  }
  
  console.log(`\n📊 Resultado do módulo ${moduleName}:`);
  console.log(`   Sucessos: ${successCount}/${totalCount}`);
  console.log(`   Taxa: ${((successCount / totalCount) * 100).toFixed(1)}%`);
  
  return successCount === totalCount;
}

// Função para aplicar permissões a uma fase
function applyPermissionsToPhase(phase) {
  console.log(`\n🚀 INICIANDO ${phase.name.toUpperCase()}`);
  console.log(`📋 Módulos: ${Object.keys(phase.modules).length}`);
  
  let phaseSuccess = true;
  
  for (const [moduleKey, moduleConfig] of Object.entries(phase.modules)) {
    const moduleSuccess = applyPermissionsToModule(moduleConfig, moduleKey);
    if (!moduleSuccess) {
      phaseSuccess = false;
      console.log(`⚠️  Módulo ${moduleKey} teve problemas`);
    }
    
    // Pausa entre módulos
    console.log(`⏳ Aguardando 2 segundos antes do próximo módulo...`);
    // Em um ambiente real, você poderia usar setTimeout ou await
  }
  
  return phaseSuccess;
}

// Função principal
function main() {
  console.log('🎯 APLICAÇÃO GRADUAL DE PERMISSÕES');
  console.log('=====================================\n');
  
  let totalPhases = 0;
  let successfulPhases = 0;
  
  // Aplicar Fase 1 - Críticos
  totalPhases++;
  if (applyPermissionsToPhase(modulePhases.phase1_critical)) {
    successfulPhases++;
    console.log('\n✅ FASE 1 CONCLUÍDA COM SUCESSO');
  } else {
    console.log('\n❌ FASE 1 TEVE PROBLEMAS');
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESUMO GERAL:');
  console.log(`   Fases concluídas: ${successfulPhases}/${totalPhases}`);
  console.log(`   Taxa de sucesso: ${((successfulPhases / totalPhases) * 100).toFixed(1)}%`);
  
  console.log('\n🎯 PRÓXIMOS PASSOS:');
  console.log('   1. Testar módulos da Fase 1');
  console.log('   2. Se tudo OK, executar Fase 2');
  console.log('   3. Continuar gradualmente');
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { applyPermissionsToFile, applyPermissionsToModule, applyPermissionsToPhase, modulePhases };
