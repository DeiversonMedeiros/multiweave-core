#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Mapeamento de módulos por diretório
const moduleMapping = {
  'src/pages/almoxarifado': 'almoxarifado',
  'src/pages/rh': 'rh',
  'src/pages/portal-colaborador': 'portal_colaborador',
  'src/pages/portal-gestor': 'portal_gestor',
  'src/pages/cadastros': 'cadastros',
  'src/pages': 'dashboard' // para arquivos na raiz de pages
};

// Lista de todos os arquivos com erro
const filesWithErrors = [
  'src/pages/almoxarifado/EntradasMateriaisPage.tsx',
  'src/pages/almoxarifado/HistoricoMovimentacoesPage.tsx',
  'src/pages/portal-gestor/AprovacaoCompensacoes.tsx',
  'src/pages/portal-gestor/AprovacaoEquipamentos.tsx',
  'src/pages/portal-gestor/AprovacaoReembolsos.tsx',
  'src/pages/portal-gestor/AprovacaoAtestados.tsx',
  'src/pages/portal-gestor/AprovacaoCorrecoesPonto.tsx',
  'src/pages/rh/AnalyticsPage.tsx',
  'src/pages/portal-colaborador/RegistroPontoPage.tsx',
  'src/pages/portal-colaborador/BancoHorasPage.tsx',
  'src/pages/portal-colaborador/ColaboradorDashboard.tsx',
  'src/pages/portal-colaborador/FeriasPage.tsx',
  'src/pages/portal-colaborador/HoleritesPage.tsx',
  'src/pages/portal-colaborador/ReembolsosPage.tsx',
  'src/pages/portal-colaborador/AtestadosPage.tsx',
  'src/pages/portal-colaborador/ExamesPage.tsx',
  'src/pages/portal-colaborador/ComprovantesPage.tsx',
  'src/pages/rh/RHDashboard.tsx',
  'src/pages/rh/PositionsPageNew.tsx',
  'src/pages/rh/EmployeesPageNew.tsx',
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
  'src/pages/rh/SchedulePlanningPage.tsx'
];

// Função para obter o nome do módulo baseado no caminho do arquivo
function getModuleName(filePath) {
  for (const [dir, moduleName] of Object.entries(moduleMapping)) {
    if (filePath.startsWith(dir)) {
      return moduleName;
    }
  }
  return 'dashboard'; // fallback
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

    // Problema 1: module_name genérico
    if (content.includes('moduleName="module_name"')) {
      console.log(`🔧 Corrigindo module_name genérico em: ${filePath}`);
      content = content.replace(/moduleName="module_name"/g, `moduleName="${moduleName}"`);
      modified = true;
    }

    // Problema 2: Imports no lugar errado
    const importInFunctionRegex = /export\s+(default\s+)?function\s+\w+\([^)]*\)\s*\{[^}]*import\s+/;
    if (importInFunctionRegex.test(content)) {
      console.log(`🔧 Corrigindo imports no lugar errado em: ${filePath}`);
      
      // Extrair imports que estão dentro da função
      const functionMatch = content.match(/export\s+(default\s+)?function\s+(\w+)/);
      if (functionMatch) {
        const functionName = functionMatch[2];
        const functionStart = content.indexOf(`function ${functionName}`);
        const openBrace = content.indexOf('{', functionStart);
        
        // Encontrar imports dentro da função
        const insideFunction = content.slice(openBrace);
        const importMatches = insideFunction.match(/import\s+[^;]+;/g);
        
        if (importMatches) {
          // Mover imports para o topo
          const imports = importMatches.join('\n');
          const newContent = imports + '\n\n' + content.replace(imports, '').replace(/\n\s*\n\s*\n/g, '\n\n');
          content = newContent;
          modified = true;
        }
      }
    }

    // Problema 3: RequireModule sem fechamento
    const requireModuleOpen = (content.match(/<RequireModule/g) || []).length;
    const requireModuleClose = (content.match(/<\/RequireModule>/g) || []).length;
    
    if (requireModuleOpen > requireModuleClose) {
      console.log(`🔧 Corrigindo RequireModule sem fechamento em: ${filePath}`);
      
      // Adicionar fechamento no final do último return
      const lastReturnIndex = content.lastIndexOf('return (');
      if (lastReturnIndex !== -1) {
        const lastDivIndex = content.lastIndexOf('</div>');
        if (lastDivIndex !== -1 && lastDivIndex > lastReturnIndex) {
          content = content.slice(0, lastDivIndex) + 
            '</div>\n    </RequireModule>' + 
            content.slice(lastDivIndex + 6);
          modified = true;
        }
      }
    }

    // Problema 4: Múltiplos returns sem RequireModule
    const returnMatches = content.match(/return\s*\(/g);
    if (returnMatches && returnMatches.length > 1) {
      const requireModuleMatches = content.match(/<RequireModule/g);
      if (!requireModuleMatches || requireModuleMatches.length < returnMatches.length) {
        console.log(`🔧 Corrigindo múltiplos returns sem RequireModule em: ${filePath}`);
        
        // Adicionar RequireModule nos returns que não têm
        const returns = content.split('return (');
        for (let i = 1; i < returns.length; i++) {
          const returnContent = returns[i];
          if (!returnContent.includes('<RequireModule')) {
            const divMatch = returnContent.match(/<div/);
            if (divMatch) {
              const divIndex = returnContent.indexOf('<div');
              returns[i] = returnContent.slice(0, divIndex) + 
                `<RequireModule moduleName="${moduleName}" action="read">\n      ` + 
                returnContent.slice(divIndex);
            }
          }
        }
        content = returns.join('return (');
        modified = true;
      }
    }

    // Problema 5: usePermissions sem import
    if (content.includes('usePermissions') && !content.includes('import { usePermissions }')) {
      console.log(`🔧 Adicionando import usePermissions em: ${filePath}`);
      
      // Adicionar import no topo
      const firstImport = content.match(/import\s+[^;]+;/);
      if (firstImport) {
        const importIndex = content.indexOf(firstImport[0]);
        const insertIndex = content.indexOf('\n', importIndex) + 1;
        content = content.slice(0, insertIndex) + 
          "import { usePermissions } from '@/hooks/usePermissions';\n" + 
          content.slice(insertIndex);
        modified = true;
      }
    }

    // Problema 6: RequireModule sem import
    if (content.includes('<RequireModule') && !content.includes('import { RequireModule }')) {
      console.log(`🔧 Adicionando import RequireModule em: ${filePath}`);
      
      // Adicionar imports necessários
      const imports = `import { RequireModule } from '@/components/RequireAuth';\nimport { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';\nimport { usePermissions } from '@/hooks/usePermissions';\n`;
      
      const firstImport = content.match(/import\s+[^;]+;/);
      if (firstImport) {
        const importIndex = content.indexOf(firstImport[0]);
        const insertIndex = content.indexOf('\n', importIndex) + 1;
        content = content.slice(0, insertIndex) + imports + content.slice(insertIndex);
        modified = true;
      } else {
        // Se não há imports, adicionar no início
        content = imports + '\n' + content;
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
  console.log('🔧 Corrigindo todos os erros de permissões em massa...\n');
  
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
