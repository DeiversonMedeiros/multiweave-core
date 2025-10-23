#!/usr/bin/env node

import fs from 'fs';
import { execSync } from 'child_process';

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

// Função para verificar sintaxe de um arquivo
function checkFileSyntax(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Arquivo não encontrado: ${filePath}`);
      return false;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    
    // Verificações básicas de sintaxe
    const issues = [];
    
    // 1. Verificar parênteses balanceados
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      issues.push(`Parênteses desbalanceados: ${openParens} abertos, ${closeParens} fechados`);
    }
    
    // 2. Verificar chaves balanceadas
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      issues.push(`Chaves desbalanceadas: ${openBraces} abertas, ${closeBraces} fechadas`);
    }
    
    // 3. Verificar colchetes balanceados
    const openBrackets = (content.match(/\[/g) || []).length;
    const closeBrackets = (content.match(/\]/g) || []).length;
    if (openBrackets !== closeBrackets) {
      issues.push(`Colchetes desbalanceados: ${openBrackets} abertos, ${closeBrackets} fechados`);
    }
    
    // 4. Verificar tags JSX balanceadas
    const openTags = (content.match(/<[A-Z][^>]*>/g) || []).length;
    const closeTags = (content.match(/<\/[A-Z][^>]*>/g) || []).length;
    if (openTags !== closeTags) {
      issues.push(`Tags JSX desbalanceadas: ${openTags} abertas, ${closeTags} fechadas`);
    }
    
    // 5. Verificar RequireModule balanceado
    const requireModuleOpen = (content.match(/<RequireModule/g) || []).length;
    const requireModuleClose = (content.match(/<\/RequireModule>/g) || []).length;
    if (requireModuleOpen !== requireModuleClose) {
      issues.push(`RequireModule desbalanceado: ${requireModuleOpen} abertos, ${requireModuleClose} fechados`);
    }
    
    // 6. Verificar imports mal posicionados
    const importInFunction = /export\s+(default\s+)?function\s+\w+\([^)]*\)\s*\{[^}]*import\s+/;
    if (importInFunction.test(content)) {
      issues.push('Imports dentro de função');
    }
    
    // 7. Verificar module_name genérico
    if (content.includes('moduleName="module_name"')) {
      issues.push('module_name genérico encontrado');
    }
    
    // 8. Verificar usePermissions sem import
    if (content.includes('usePermissions') && !content.includes('import { usePermissions }')) {
      issues.push('usePermissions sem import');
    }
    
    // 9. Verificar RequireModule sem import
    if (content.includes('<RequireModule') && !content.includes('import { RequireModule }')) {
      issues.push('RequireModule sem import');
    }
    
    if (issues.length > 0) {
      console.log(`❌ ${filePath}:`);
      issues.forEach(issue => console.log(`   - ${issue}`));
      return false;
    } else {
      console.log(`✅ ${filePath}: Sem problemas de sintaxe`);
      return true;
    }
    
  } catch (error) {
    console.error(`❌ Erro ao verificar ${filePath}:`, error.message);
    return false;
  }
}

// Função principal
function main() {
  console.log('🔍 Verificando sintaxe de todos os arquivos com erro...\n');
  
  let totalProcessed = 0;
  let totalValid = 0;
  
  filesWithErrors.forEach(filePath => {
    totalProcessed++;
    if (checkFileSyntax(filePath)) {
      totalValid++;
    }
  });
  
  console.log('\n📊 Resumo:');
  console.log(`   Total de arquivos verificados: ${totalProcessed}`);
  console.log(`   Arquivos válidos: ${totalValid}`);
  console.log(`   Arquivos com problemas: ${totalProcessed - totalValid}`);
  console.log(`   Taxa de validade: ${((totalValid / totalProcessed) * 100).toFixed(1)}%`);
}

// Executar
main();

export { checkFileSyntax };
