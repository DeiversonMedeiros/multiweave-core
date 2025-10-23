#!/usr/bin/env node

import fs from 'fs';
import { execSync } from 'child_process';

// Lista de arquivos que foram modificados com permissões
const modifiedFiles = [
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

// Função para reverter um arquivo
function revertFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Arquivo não encontrado: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // 1. Remover imports de permissões
    const permissionImports = [
      "import { RequireModule } from '@/components/RequireAuth';",
      "import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';",
      "import { usePermissions } from '@/hooks/usePermissions';"
    ];

    permissionImports.forEach(importLine => {
      if (content.includes(importLine)) {
        console.log(`🔧 Removendo import: ${importLine}`);
        content = content.replace(importLine + '\n', '');
        modified = true;
      }
    });

    // 2. Remover usePermissions hook
    if (content.includes('usePermissions()')) {
      console.log(`🔧 Removendo usePermissions hook`);
      content = content.replace(/const\s*{\s*[^}]*usePermissions[^}]*}\s*=\s*usePermissions\(\);\s*\n?/g, '');
      modified = true;
    }

    // 3. Remover RequireModule wrapper
    if (content.includes('<RequireModule')) {
      console.log(`🔧 Removendo RequireModule wrapper`);
      
      // Remover abertura do RequireModule
      content = content.replace(/<RequireModule[^>]*>\s*\n?/g, '');
      
      // Remover fechamento do RequireModule
      content = content.replace(/<\/RequireModule>\s*\n?/g, '');
      
      modified = true;
    }

    // 4. Remover PermissionButton e PermissionGuard
    if (content.includes('<PermissionButton') || content.includes('<PermissionGuard')) {
      console.log(`🔧 Removendo PermissionButton e PermissionGuard`);
      
      // Remover PermissionButton
      content = content.replace(/<PermissionButton[^>]*>[\s\S]*?<\/PermissionButton>/g, '');
      
      // Remover PermissionGuard
      content = content.replace(/<PermissionGuard[^>]*>[\s\S]*?<\/PermissionGuard>/g, '');
      
      modified = true;
    }

    // 5. Limpar linhas vazias excessivas
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

    // Salvar se houve modificações
    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Revertido: ${filePath}`);
      return true;
    } else {
      console.log(`✅ Sem alterações: ${filePath}`);
      return true;
    }
    
  } catch (error) {
    console.error(`❌ Erro ao reverter ${filePath}:`, error.message);
    return false;
  }
}

// Função principal
function main() {
  console.log('🔄 Revertendo alterações de permissões...\n');
  
  let totalProcessed = 0;
  let totalReverted = 0;
  
  modifiedFiles.forEach(filePath => {
    totalProcessed++;
    if (revertFile(filePath)) {
      totalReverted++;
    }
  });
  
  console.log('\n📊 Resumo:');
  console.log(`   Total de arquivos processados: ${totalProcessed}`);
  console.log(`   Arquivos revertidos: ${totalReverted}`);
  console.log(`   Taxa de sucesso: ${((totalReverted / totalProcessed) * 100).toFixed(1)}%`);
  
  console.log('\n🎯 Próximos passos:');
  console.log('   1. Testar se os erros 500 foram resolvidos');
  console.log('   2. Aplicar permissões de forma gradual');
  console.log('   3. Testar cada alteração individualmente');
}

// Executar
main();

export { revertFile };
