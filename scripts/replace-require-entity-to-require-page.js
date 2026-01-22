const fs = require('fs');
const path = require('path');

// Mapeamento de entidades para páginas
const entityToPageMap = {
  // Portal Colaborador
  'time_records': '/portal-colaborador/historico-marcacoes*',
  'periodic_exams': '/portal-colaborador/exames*',
  'income_statements': '/portal-colaborador/comprovantes*',
  'vacations': '/portal-colaborador/ferias*',
  'reimbursement_requests': '/portal-colaborador/reembolsos*',
  'medical_certificates': '/portal-colaborador/atestados*',
  
  // Portal Gestor
  'time_tracking_management': '/portal-gestor/acompanhamento/ponto*',
  'approval_center': '/portal-gestor/aprovacoes*',
  'approvals': '/portal-gestor/aprovacoes*',
  'approval_configs': '/portal-gestor/aprovacoes*',
  'vacation_approvals': '/portal-gestor/aprovacoes/ferias*',
  'exam_management': '/portal-gestor/acompanhamento/exames*',
  'manager_dashboard': '/portal-gestor*',
  
  // RH
  'employees': '/rh/employees*',
  'funcionarios': '/rh/employees*',
  'positions': '/rh/positions*',
  'cargos': '/rh/positions*',
  'units': '/rh/units*',
  'departamentos': '/rh/units*',
  'dependents': '/rh/dependents*',
  'unions': '/rh/unions*',
  'work_shifts': '/rh/work-shifts*',
  'turnos_trabalho': '/rh/work-shifts*',
  'registros_ponto': '/rh/time-records*',
  'holidays': '/rh/holidays*',
  'feriados': '/rh/holidays*',
  'benefits': '/rh/benefits*',
  'beneficios': '/rh/benefits*',
  'medical_agreements': '/rh/medical-agreements*',
  'convenios_medicos': '/rh/medical-agreements*',
  'periodic_exams': '/rh/periodic-exams*',
  'exames_periodicos': '/rh/periodic-exams*',
  'rubricas': '/rh/rubricas*',
  'inss_brackets': '/rh/inss-brackets*',
  'irrf_brackets': '/rh/irrf-brackets*',
  'fgts_config': '/rh/fgts-config*',
  'absence_types': '/rh/absence-types*',
  'delay_reasons': '/rh/delay-reasons*',
  'cid_codes': '/rh/cid-codes*',
  'allowance_types': '/rh/allowance-types*',
  'deficiency_types': '/rh/deficiency-types*',
  'payroll': '/rh/payroll*',
  'folha': '/rh/payroll*',
  'esocial': '/rh/esocial*',
  'treinamentos': '/rh/treinamentos*',
  'trainings': '/rh/training*',
  'vacations': '/rh/vacations*',
  'ferias': '/rh/vacations*',
  'disciplinary_actions': '/rh/disciplinary-actions*',
  'acoes_disciplinares': '/rh/disciplinary-actions*',
  
  // Financeiro
  'contas_pagar': '/financeiro/contas-pagar*',
  'contas_receber': '/financeiro/contas-receber*',
  'borderos': '/financeiro/lotes-pagamento*',
  'conciliacoes_bancarias': '/financeiro/conciliacao-bancaria*',
  'fluxo_caixa': '/financeiro/tesouraria*',
  'nfe': '/financeiro/fiscal*',
  'plano_contas': '/financeiro/contabilidade*',
  'accounts_payable': '/financeiro/contas-pagar*',
  'configuracao_fiscal': '/financeiro/fiscal*',
  'configuracao_bancaria': '/financeiro/bancaria*',
  
  // Compras
  'solicitacoes_compra': '/compras/requisicoes*',
  'cotacoes': '/compras/cotacoes*',
  'pedidos_compra': '/compras/pedidos*',
  'avaliacao_fornecedores': '/compras/fornecedores*',
  'contratos_compra': '/compras/contratos*',
  'historico_compras': '/compras/historico*',
  
  // Almoxarifado
  'estoque_atual': '/almoxarifado/estoque*',
  'entradas_materiais': '/almoxarifado/entradas*',
  'transferencias': '/almoxarifado/saidas*',
  'inventarios': '/almoxarifado/inventario*',
  'almoxarifados': '/almoxarifado/almoxarifados*',
  'localizacoes_fisicas': '/almoxarifado/localizacoes*',
  'movimentacoes_estoque': '/almoxarifado/historico*',
  'materials_equipment': '/almoxarifado/materiais*',
  'materiais_equipamentos': '/almoxarifado/materiais*',
  
  // Cadastros
  'services': '/cadastros/servicos*',
  'servicos': '/cadastros/servicos*',
  'projects': '/cadastros/projetos*',
  'projetos': '/cadastros/projetos*',
  'partners': '/cadastros/parceiros*',
  'parceiros': '/cadastros/parceiros*',
  'cost_centers': '/cadastros/centros-custo*',
  'centros_custo': '/cadastros/centros-custo*',
  'users': '/cadastros/usuarios*',
  'usuarios': '/cadastros/usuarios*',
  'companies': '/cadastros/empresas*',
  'empresas': '/cadastros/empresas*',
  'profiles': '/cadastros/perfis*',
  'perfis': '/cadastros/perfis*',
  
  // Configurações
  'configuracoes_aprovacao': '/configuracoes/aprovacoes*'
};

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Substituir import
  if (content.includes("import { RequireEntity }")) {
    content = content.replace(
      /import \{ RequireEntity \} from ['"]@\/components\/RequireAuth['"];?/g,
      "import { RequirePage } from '@/components/RequireAuth';"
    );
    modified = true;
  }

  // Substituir uso do componente - padrão mais flexível
  const entityPattern = /<RequireEntity\s+entityName=["']([^"']+)["']\s+action=["']([^"']+)["']\s*>/g;
  const closingPattern = /<\/RequireEntity>/g;

  content = content.replace(entityPattern, (match, entityName, action) => {
    let pagePath = entityToPageMap[entityName];
    
    // Se não encontrou no mapa, tentar inferir do caminho do arquivo
    if (!pagePath) {
      // Extrair caminho relativo do arquivo
      const relativePath = filePath.replace(/.*\/src\/pages\//, '').replace(/\.tsx?$/, '');
      pagePath = `/${relativePath.replace(/\\/g, '/')}*`;
    }
    
    return `<RequirePage pagePath="${pagePath}" action="${action}">`;
  });

  content = content.replace(closingPattern, '</RequirePage>');
  
  // Verificar se houve substituição
  if (content.includes('<RequirePage')) {
    modified = true;
  }

  if (modified || content.includes('<RequirePage')) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Atualizado: ${filePath}`);
    return true;
  }

  return false;
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  let count = 0;

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && !filePath.includes('node_modules')) {
      count += walkDir(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      if (replaceInFile(filePath)) {
        count++;
      }
    }
  });

  return count;
}

const srcDir = path.join(__dirname, '../src/pages');
console.log('🔄 Substituindo RequireEntity por RequirePage...\n');
const count = walkDir(srcDir);
console.log(`\n✅ Total de arquivos atualizados: ${count}`);
