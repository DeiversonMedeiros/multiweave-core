#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Configuração dos módulos e suas páginas
const moduleConfig = {
  'rh': {
    pages: [
      'src/pages/rh/TimeRecordsPage.tsx',
      'src/pages/rh/VacationsPage.tsx',
      'src/pages/rh/TrainingPage.tsx',
      'src/pages/rh/RHDashboard.tsx',
      'src/pages/rh/EmployeeManagement.tsx',
      'src/pages/rh/DisciplinaryActionsPage.tsx',
      'src/pages/rh/BenefitsPageNew.tsx',
      'src/pages/rh/MedicalCertificatesPage.tsx',
      'src/pages/rh/UnionsPage.tsx',
      'src/pages/rh/PositionsPage.tsx',
      'src/pages/rh/UnitsPage.tsx',
      'src/pages/rh/HolidaysPage.tsx',
      'src/pages/rh/WorkShiftsPage.tsx',
      'src/pages/rh/EmployeeShiftsPage.tsx',
      'src/pages/rh/EmploymentContractsPage.tsx',
      'src/pages/rh/InssBracketsPage.tsx',
      'src/pages/rh/IrrfBracketsPage.tsx',
      'src/pages/rh/FgtsConfigPage.tsx',
      'src/pages/rh/AbsenceTypesPage.tsx',
      'src/pages/rh/AllowanceTypesPage.tsx',
      'src/pages/rh/DeficiencyTypesPage.tsx',
      'src/pages/rh/DelayReasonsPage.tsx',
      'src/pages/rh/CidCodesPage.tsx',
      'src/pages/rh/CompensationRequestsPage.tsx',
      'src/pages/rh/AwardsProductivityPage.tsx',
      'src/pages/rh/AnalyticsPage.tsx',
      'src/pages/rh/EventConsolidationPage.tsx',
      'src/pages/rh/EsocialPage.tsx',
      'src/pages/rh/EsocialIntegrationPage.tsx',
      'src/pages/rh/MedicalAgreementsPage.tsx',
      'src/pages/rh/PeriodicExamsPage.tsx',
      'src/pages/rh/RecruitmentPage.tsx',
      'src/pages/rh/RubricasPage.tsx',
      'src/pages/rh/SchedulePlanningPage.tsx',
      'src/pages/rh/TrainingManagement.tsx',
      'src/pages/rh/VacationsManagement.tsx',
      'src/pages/rh/DependentsManagement.tsx',
      'src/pages/rh/EmployeeUserLinks.tsx',
      'src/pages/rh/OrganogramaPage.tsx',
      'src/pages/rh/EmployeesPageNew.tsx',
      'src/pages/rh/PositionsPageNew.tsx',
      'src/pages/rh/UnitsPageNew.tsx',
      'src/pages/rh/MedicalPlanNewPage.tsx',
      'src/pages/rh/EmployeeMedicalPlanNewPage.tsx',
      'src/pages/rh/EmployeeUnionMembershipNewPage.tsx',
      'src/pages/rh/UnionNewPage.tsx',
      'src/pages/rh/MedicalAgreementNewPage.tsx',
      'src/pages/rh/MedicalAgreementEditPage.tsx',
      'src/pages/rh/MedicalAgreementDetailPage.tsx',
      'src/pages/rh/AwardProductivityNewPage.tsx',
      'src/pages/rh/AwardProductivityEditPage.tsx',
      'src/pages/rh/AwardProductivityDetailPage.tsx',
      'src/pages/rh/PayrollPageNew.tsx',
      'src/pages/rh/TimeRecordsPageNew.tsx',
      'src/pages/rh/BenefitsPageNew.tsx',
      'src/pages/rh/EmployeeForm.tsx',
      'src/pages/rh/TestModal.tsx',
      'src/pages/rh/RubricasManagement.tsx',
      'src/pages/rh/PayrollCalculationPage.tsx',
      'src/pages/rh/PayrollCalculationPageNew.tsx'
    ]
  },
  'almoxarifado': {
    pages: [
      'src/pages/almoxarifado/EntradasMateriaisPage.tsx',
      'src/pages/almoxarifado/HistoricoMovimentacoesPage.tsx',
      'src/pages/almoxarifado/InventarioPage.tsx',
      'src/pages/almoxarifado/RelatoriosPage.tsx',
      'src/pages/almoxarifado/SaidasTransferenciasPage.tsx',
      'src/pages/almoxarifado/TestPage.tsx'
    ]
  },
  'cadastros': {
    pages: [
      'src/pages/cadastros/Materiais.tsx',
      'src/pages/cadastros/Parceiros.tsx',
      'src/pages/cadastros/Projetos.tsx',
      'src/pages/cadastros/CentrosCusto.tsx',
      'src/pages/cadastros/UserCompanies.tsx'
    ]
  },
  'portal_colaborador': {
    pages: [
      'src/pages/portal-colaborador/ColaboradorDashboard.tsx',
      'src/pages/portal-colaborador/RegistroPontoPage.tsx',
      'src/pages/portal-colaborador/FeriasPage.tsx',
      'src/pages/portal-colaborador/AtestadosPage.tsx',
      'src/pages/portal-colaborador/BancoHorasPage.tsx',
      'src/pages/portal-colaborador/ComprovantesPage.tsx',
      'src/pages/portal-colaborador/ExamesPage.tsx',
      'src/pages/portal-colaborador/HoleritesPage.tsx',
      'src/pages/portal-colaborador/ReembolsosPage.tsx',
      'src/pages/portal-colaborador/TestPortal.tsx'
    ]
  },
  'portal_gestor': {
    pages: [
      'src/pages/portal-gestor/GestorDashboard.tsx',
      'src/pages/portal-gestor/CentralAprovacoes.tsx',
      'src/pages/portal-gestor/AcompanhamentoExames.tsx',
      'src/pages/portal-gestor/AcompanhamentoPonto.tsx',
      'src/pages/portal-gestor/AprovacaoAtestados.tsx',
      'src/pages/portal-gestor/AprovacaoCompensacoes.tsx',
      'src/pages/portal-gestor/AprovacaoCorrecoesPonto.tsx',
      'src/pages/portal-gestor/AprovacaoEquipamentos.tsx',
      'src/pages/portal-gestor/AprovacaoFerias.tsx',
      'src/pages/portal-gestor/AprovacaoReembolsos.tsx'
    ]
  },
  'financeiro': {
    pages: [
      'src/pages/FinancialPage.tsx'
    ]
  }
};

// Imports padrão para adicionar
const standardImports = `
import { RequireModule } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';`;

// Função para aplicar permissões em uma página
function applyPermissionsToPage(filePath, moduleName) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Arquivo não encontrado: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    
    // Verificar se já tem permissões aplicadas
    if (content.includes('RequireModule') || content.includes('usePermissions')) {
      console.log(`✅ ${filePath} já tem permissões aplicadas`);
      return true;
    }

    // Adicionar imports se não existirem
    if (!content.includes('RequireModule')) {
      // Encontrar a última importação
      const importLines = content.split('\n').filter(line => line.trim().startsWith('import'));
      const lastImportIndex = content.lastIndexOf(importLines[importLines.length - 1]);
      const insertIndex = content.indexOf('\n', lastImportIndex) + 1;
      
      content = content.slice(0, insertIndex) + standardImports + '\n' + content.slice(insertIndex);
    }

    // Adicionar usePermissions na função principal
    const functionMatch = content.match(/export\s+(default\s+)?function\s+(\w+)/);
    if (functionMatch) {
      const functionName = functionMatch[2];
      const functionStart = content.indexOf(`function ${functionName}`);
      const openBrace = content.indexOf('{', functionStart);
      const nextLine = content.indexOf('\n', openBrace) + 1;
      
      // Adicionar usePermissions
      const permissionsHook = `  const { canCreateModule, canEditModule, canDeleteModule } = usePermissions();\n`;
      content = content.slice(0, nextLine) + permissionsHook + content.slice(nextLine);
    }

    // Envolver o return com RequireModule
    const returnMatch = content.match(/return\s*\(\s*<div/);
    if (returnMatch) {
      const returnIndex = returnMatch.index;
      const divIndex = content.indexOf('<div', returnIndex);
      
      // Adicionar RequireModule
      content = content.slice(0, divIndex) + 
        `<RequireModule moduleName="${moduleName}" action="read">\n      ` + 
        content.slice(divIndex);
      
      // Fechar RequireModule no final
      const lastDivIndex = content.lastIndexOf('</div>');
      if (lastDivIndex !== -1) {
        content = content.slice(0, lastDivIndex) + 
          '</div>\n    </RequireModule>' + 
          content.slice(lastDivIndex + 6);
      }
    }

    // Salvar arquivo
    fs.writeFileSync(filePath, content);
    console.log(`✅ Permissões aplicadas em: ${filePath}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Erro ao processar ${filePath}:`, error.message);
    return false;
  }
}

// Função principal
function main() {
  console.log('🚀 Iniciando aplicação de permissões nas páginas...\n');
  
  let totalProcessed = 0;
  let totalSuccess = 0;
  
  Object.entries(moduleConfig).forEach(([moduleName, config]) => {
    console.log(`📁 Processando módulo: ${moduleName}`);
    
    config.pages.forEach(pagePath => {
      totalProcessed++;
      if (applyPermissionsToPage(pagePath, moduleName)) {
        totalSuccess++;
      }
    });
    
    console.log(`✅ Módulo ${moduleName} processado\n`);
  });
  
  console.log('📊 Resumo:');
  console.log(`   Total de páginas processadas: ${totalProcessed}`);
  console.log(`   Sucessos: ${totalSuccess}`);
  console.log(`   Falhas: ${totalProcessed - totalSuccess}`);
  console.log(`   Taxa de sucesso: ${((totalSuccess / totalProcessed) * 100).toFixed(1)}%`);
}

// Executar se chamado diretamente
main();

export { applyPermissionsToPage, moduleConfig };
