#!/usr/bin/env node

import fs from 'fs';

// Lista de arquivos com erro
const filesWithErrors = [
  'src/pages/almoxarifado/EntradasMateriaisPage.tsx',
  'src/pages/almoxarifado/HistoricoMovimentacoesPage.tsx',
  'src/pages/portal-colaborador/ColaboradorDashboard.tsx',
  'src/pages/portal-colaborador/RegistroPontoPage.tsx',
  'src/pages/portal-colaborador/BancoHorasPage.tsx',
  'src/pages/portal-colaborador/FeriasPage.tsx',
  'src/pages/portal-colaborador/HoleritesPage.tsx',
  'src/pages/portal-colaborador/ReembolsosPage.tsx',
  'src/pages/portal-colaborador/AtestadosPage.tsx',
  'src/pages/portal-colaborador/ExamesPage.tsx',
  'src/pages/portal-colaborador/ComprovantesPage.tsx',
  'src/pages/portal-gestor/AprovacaoCompensacoes.tsx',
  'src/pages/portal-gestor/AprovacaoReembolsos.tsx',
  'src/pages/portal-gestor/AprovacaoAtestados.tsx',
  'src/pages/portal-gestor/AprovacaoEquipamentos.tsx',
  'src/pages/portal-gestor/AprovacaoCorrecoesPonto.tsx',
  'src/pages/rh/RHDashboard.tsx',
  'src/pages/rh/EmployeesPageNew.tsx',
  'src/pages/rh/PositionsPageNew.tsx',
  'src/pages/rh/UnitsPageNew.tsx',
  'src/pages/rh/TimeRecordsPageNew.tsx',
  'src/pages/rh/BenefitsPageNew.tsx',
  'src/pages/rh/PayrollPageNew.tsx',
  'src/pages/rh/IrrfBracketsPage.tsx',
  'src/pages/rh/FgtsConfigPage.tsx',
  'src/pages/rh/PayrollCalculationPage.tsx',
  'src/pages/rh/AwardsProductivityPage.tsx',
  'src/pages/rh/AwardProductivityEditPage.tsx',
  'src/pages/rh/AwardProductivityDetailPage.tsx',
  'src/pages/rh/MedicalAgreementsPage.tsx',
  'src/pages/rh/MedicalAgreementEditPage.tsx',
  'src/pages/rh/MedicalAgreementDetailPage.tsx',
  'src/pages/rh/MedicalCertificatesPage.tsx',
  'src/pages/rh/OrganogramaPage.tsx',
  'src/pages/rh/CompensationRequestsPage.tsx',
  'src/pages/rh/EmployeeShiftsPage.tsx',
  'src/pages/rh/AnalyticsPage.tsx',
  'src/pages/rh/SchedulePlanningPage.tsx'
];

// Mapeamento de módulos por diretório
const moduleMapping = {
  'src/pages/almoxarifado': 'almoxarifado',
  'src/pages/rh': 'rh',
  'src/pages/portal-colaborador': 'portal_colaborador',
  'src/pages/portal-gestor': 'portal_gestor',
  'src/pages/cadastros': 'cadastros',
  'src/pages': 'dashboard'
};

// Função para obter o nome do módulo
function getModuleName(filePath) {
  for (const [dir, moduleName] of Object.entries(moduleMapping)) {
    if (filePath.startsWith(dir)) {
      return moduleName;
    }
  }
  return 'dashboard';
}

// Função para corrigir um arquivo
function fixFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Arquivo não encontrado: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    const moduleName = getModuleName(filePath);

    // 1. Remover todos os RequireModule existentes (mal formados)
    console.log(`🔧 Removendo RequireModule mal formados em: ${filePath}`);
    content = content.replace(/<RequireModule[^>]*>/g, '');
    content = content.replace(/<\/RequireModule>/g, '');
    modified = true;

    // 2. Encontrar o return principal e envolver com RequireModule
    const returnMatch = content.match(/return\s*\(\s*$/m);
    if (returnMatch) {
      console.log(`🔧 Adicionando RequireModule correto em: ${filePath}`);
      const returnIndex = returnMatch.index;
      const returnEnd = returnIndex + returnMatch[0].length;
      
      // Adicionar RequireModule no início do return
      content = content.slice(0, returnEnd) + 
        `\n    <RequireModule moduleName="${moduleName}" action="read">` + 
        content.slice(returnEnd);
      
      // Adicionar fechamento no final
      const lastDivIndex = content.lastIndexOf('</div>');
      if (lastDivIndex !== -1) {
        content = content.slice(0, lastDivIndex) + 
          '</div>\n    </RequireModule>' + 
          content.slice(lastDivIndex + 6);
      }
      modified = true;
    }

    // 3. Garantir que os imports estão corretos
    if (!content.includes('import { RequireModule }')) {
      console.log(`🔧 Adicionando imports necessários em: ${filePath}`);
      const imports = `import { RequireModule } from '@/components/RequireAuth';\nimport { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';\nimport { usePermissions } from '@/hooks/usePermissions';\n`;
      
      const firstImport = content.match(/import\s+[^;]+;/);
      if (firstImport) {
        const importIndex = content.indexOf(firstImport[0]);
        const insertIndex = content.indexOf('\n', importIndex) + 1;
        content = content.slice(0, insertIndex) + imports + content.slice(insertIndex);
      } else {
        content = imports + '\n' + content;
      }
      modified = true;
    }

    // 4. Adicionar usePermissions na função se não existir
    if (content.includes('export') && content.includes('function') && !content.includes('usePermissions()')) {
      console.log(`🔧 Adicionando usePermissions em: ${filePath}`);
      const functionMatch = content.match(/export\s+(default\s+)?function\s+(\w+)/);
      if (functionMatch) {
        const functionName = functionMatch[2];
        const functionStart = content.indexOf(`function ${functionName}`);
        const openBrace = content.indexOf('{', functionStart);
        const nextLine = content.indexOf('\n', openBrace) + 1;
        
        const permissionsHook = `  const { canCreateModule, canEditModule, canDeleteModule } = usePermissions();\n`;
        content = content.slice(0, nextLine) + permissionsHook + content.slice(nextLine);
        modified = true;
      }
    }

    // Salvar se houve modificações
    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Corrigido: ${filePath}`);
      return true;
    } else {
      console.log(`✅ Sem problemas: ${filePath}`);
      return true;
    }
    
  } catch (error) {
    console.error(`❌ Erro ao processar ${filePath}:`, error.message);
    return false;
  }
}

// Função principal
function main() {
  console.log('🔧 Corrigindo balanceamento JSX com precisão...\n');
  
  let totalProcessed = 0;
  let totalFixed = 0;
  
  filesWithErrors.forEach(filePath => {
    totalProcessed++;
    if (fixFile(filePath)) {
      totalFixed++;
    }
  });
  
  console.log('\n📊 Resumo:');
  console.log(`   Total de arquivos processados: ${totalProcessed}`);
  console.log(`   Arquivos corrigidos: ${totalFixed}`);
  console.log(`   Taxa de sucesso: ${((totalFixed / totalProcessed) * 100).toFixed(1)}%`);
}

// Executar
main();

export { fixFile, getModuleName };
