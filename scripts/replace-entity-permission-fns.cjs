const fs = require('fs');
const path = require('path');

// Mapeamento: arquivo -> pagePath para permissões
const fileToPageMap = {
  'TimeRecordSettingsPage.tsx': '/rh/ponto-eletronico-config*',
  'VacationsManagement.tsx': '/rh/vacations*',
  'UnitsPage.tsx': '/rh/units*',
  'TimeRecordsPageNew.tsx': '/rh/time-records*',
  'RubricasPage.tsx': '/rh/rubricas*',
  'RubricasManagement.tsx': '/rh/rubricas*',
  'RHDashboard.tsx': '/rh*',
  'RecruitmentPage.tsx': '/rh/recruitment*',
  'PositionsPageNew.tsx': '/rh/positions*',
  'PositionsPage.tsx': '/rh/positions*',
  'PeriodicExamsPage.tsx': '/rh/periodic-exams*',
  'PayrollPage.tsx': '/rh/payroll*',
  'PayrollIndividualPage.tsx': '/rh/payroll-individual*',
  'PayrollConfigPage.tsx': '/rh/payroll-config*',
  'OnlineTrainingsListPage.tsx': '/rh/treinamentos*',
  'LocationZonesPage.tsx': '/rh/location-zones*',
  'InssBracketsPage.tsx': '/rh/inss-brackets*',
  'HolidaysPage.tsx': '/rh/holidays*',
  'EsocialPage.tsx': '/rh/esocial*',
  'EmploymentContractsPage.tsx': '/rh/employment-contracts*',
  'EmployeesPageNew.tsx': '/rh/employees*',
  'EmployeesPage.tsx': '/rh/employees*'
};

function replaceInFile(filePath) {
  const fileName = path.basename(filePath);
  const pagePath = fileToPageMap[fileName];
  if (!pagePath) return false;

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Substituir destructuring
  content = content.replace(
    /const \{ canCreateEntity, canEditEntity, canDeleteEntity \} = usePermissions\(\);/g,
    `const { canCreatePage, canEditPage, canDeletePage } = usePermissions();`
  );
  if (content.includes('canCreatePage')) modified = true;

  content = content.replace(
    /const \{ canEditEntity \} = usePermissions\(\);/g,
    `const { canEditPage } = usePermissions();`
  );
  if (content.includes('canEditPage')) modified = true;

  content = content.replace(
    /const \{ canEditEntity, canCreateEntity \} = usePermissions\(\);/g,
    `const { canEditPage, canCreatePage } = usePermissions();`
  );

  // Substituir usos: canEditEntity -> canEditPage(pagePath), etc.
  const esc = pagePath.replace(/\*/g, '\\*');
  const re1 = new RegExp(`canEditEntity\\(['"][^'"]*['"]\\)`, 'g');
  content = content.replace(re1, `canEditPage('${pagePath}')`);

  const re2 = new RegExp(`canCreateEntity\\(['"][^'"]*['"]\\)`, 'g');
  content = content.replace(re2, `canCreatePage('${pagePath}')`);

  const re3 = new RegExp(`canDeleteEntity\\(['"][^'"]*['"]\\)`, 'g');
  content = content.replace(re3, `canDeletePage('${pagePath}')`);

  // canEditEntity / canCreateEntity / canDeleteEntity sem chamada (boolean)
  content = content.replace(/\bcanEditEntity\b/g, `canEditPage('${pagePath}')`);
  content = content.replace(/\bcanCreateEntity\b/g, `canCreatePage('${pagePath}')`);
  content = content.replace(/\bcanDeleteEntity\b/g, `canDeletePage('${pagePath}')`);

  // canCreateEntity('treinamentos', 'create') -> canCreatePage(pagePath)
  content = content.replace(/canCreateEntity\s*\(\s*['"][^'"]*['"]\s*,\s*['"]create['"]\s*\)/g, `canCreatePage('${pagePath}')`);
  content = content.replace(/canEditEntity\s*\(\s*['"][^'"]*['"]\s*,\s*['"]edit['"]\s*\)/g, `canEditPage('${pagePath}')`);

  // Debug logs
  content = content.replace(
    /console\.log\s*\(\s*['"]🔍 \[DEBUG\] Permissões:['"],\s*\{\s*canCreateEntity,\s*canEditEntity,\s*canDeleteEntity\s*\}\s*\)/g,
    `console.log('🔍 [DEBUG] Permissões:', { canCreatePage: canCreatePage('${pagePath}'), canEditPage: canEditPage('${pagePath}'), canDeletePage: canDeletePage('${pagePath}') })`
  );
  content = content.replace(
    /console\.log\s*\(\s*['"]🔍 \[DEBUG\] canCreateEntity\(['"][^'"]*['"]\):['"],\s*canCreateEntity\(['"][^'"]*['"]\)\s*\)/g,
    `console.log('🔍 [DEBUG] canCreatePage:', canCreatePage('${pagePath}'))`
  );

  if (modified || content.includes("canEditPage('") || content.includes("canCreatePage('") || content.includes("canDeletePage('")) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${fileName}`);
    return true;
  }
  return false;
}

const rhDir = path.join(__dirname, '../src/pages/rh');
let count = 0;
for (const f of fs.readdirSync(rhDir)) {
  const fp = path.join(rhDir, f);
  if (fs.statSync(fp).isFile() && (f.endsWith('.tsx') || f.endsWith('.ts'))) {
    if (replaceInFile(fp)) count++;
  }
}
console.log(`\n✅ Atualizados: ${count} arquivos`);
