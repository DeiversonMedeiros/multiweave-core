import { Payroll, PayrollEvent, Employee } from '@/integrations/supabase/rh-types';

// =====================================================
// SERVIÇO DE GERAÇÃO DE CONTRACHEQUE (PDF)
// =====================================================

export interface PayslipData {
  payroll: Payroll;
  employee: Employee;
  events: PayrollEvent[];
  company?: {
    name: string;
    cnpj?: string;
    address?: string;
  };
}

/**
 * Gera um contracheque em PDF para um funcionário
 * TODO: Implementar geração real de PDF usando jspdf ou react-pdf
 */
export async function generatePayslipPDF(data: PayslipData): Promise<Blob> {
  // Por enquanto, retorna um blob vazio
  // TODO: Implementar geração real de PDF
  // Sugestão: usar jspdf ou react-pdf
  
  const content = generatePayslipHTML(data);
  const blob = new Blob([content], { type: 'text/html' });
  
  // Para gerar PDF real, seria necessário:
  // 1. Instalar jspdf: npm install jspdf
  // 2. Usar html2canvas para converter HTML em imagem
  // 3. Ou usar react-pdf para criar PDF estruturado
  
  return blob;
}

/**
 * Gera HTML do contracheque (pode ser convertido para PDF depois)
 */
function generatePayslipHTML(data: PayslipData): string {
  const { payroll, employee, events, company } = data;
  
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  
  const monthName = monthNames[payroll.mes_referencia - 1];
  
  // Separar eventos por tipo
  const proventos = events.filter(e => e.tipo_rubrica === 'provento');
  const descontos = events.filter(e => e.tipo_rubrica === 'desconto');
  
  // Calcular bases de cálculo
  const inssEvent = descontos.find(e => e.codigo_rubrica === 'INSS' || e.descricao_rubrica.toLowerCase().includes('inss'));
  const irrfEvent = descontos.find(e => e.codigo_rubrica === 'IRRF' || e.descricao_rubrica.toLowerCase().includes('irrf'));
  const fgtsEvent = events.find(e => e.codigo_rubrica === 'FGTS' || e.descricao_rubrica.toLowerCase().includes('fgts'));
  
  // Base de cálculo INSS = Total de vencimentos (geralmente)
  const baseCalculoINSS = payroll.total_vencimentos || payroll.salario_base || 0;
  
  // Base de cálculo IRRF = Total vencimentos - INSS - Dedução por dependente
  const valorINSS = inssEvent?.valor_total || 0;
  const valorIRRF = irrfEvent?.valor_total || 0;
  const baseCalculoIRRF = Math.max(0, baseCalculoINSS - valorINSS);
  
  // Base de cálculo FGTS = Salário base (sem descontos)
  const baseCalculoFGTS = payroll.salario_base || 0;
  
  // FGTS do mês = Base FGTS × 8% (ou alíquota configurada)
  const valorFGTS = fgtsEvent?.valor_total || 0;
  const aliquotaFGTS = baseCalculoFGTS > 0 ? (valorFGTS / baseCalculoFGTS) * 100 : 0;
  
  // Faixa IRRF (se houver evento de IRRF, tentar identificar a faixa)
  let faixaIRRF = '-';
  if (irrfEvent && irrfEvent.percentual) {
    const aliquota = irrfEvent.percentual * 100;
    if (aliquota <= 0) faixaIRRF = '01';
    else if (aliquota <= 7.5) faixaIRRF = '02';
    else if (aliquota <= 15) faixaIRRF = '03';
    else if (aliquota <= 22.5) faixaIRRF = '04';
    else faixaIRRF = '05';
  }
  
  // Formatar valores monetários
  const formatCurrency = (value: number) => {
    return value.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };
  
  // Formatar percentual
  const formatPercent = (value: number) => {
    return value.toFixed(2).replace('.', ',') + '%';
  };
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Contracheque - ${employee.nome}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      color: #333;
      background-color: #f9f9f9;
    }
    .container {
      background-color: white;
      padding: 30px;
      max-width: 900px;
      margin: 0 auto;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #000;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: bold;
    }
    .company-info {
      font-size: 14px;
      margin-top: 10px;
    }
    .period-info {
      text-align: right;
      font-size: 16px;
      font-weight: bold;
      margin-top: 10px;
    }
    .employee-details {
      margin-bottom: 20px;
      padding: 15px;
      background-color: #f5f5f5;
      border: 1px solid #ddd;
    }
    .employee-details table {
      width: 100%;
      border-collapse: collapse;
    }
    .employee-details td {
      padding: 5px 10px;
      border: 1px solid #ddd;
      font-size: 12px;
    }
    .employee-details td.label {
      font-weight: bold;
      background-color: #e9e9e9;
      width: 120px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 12px;
    }
    th, td {
      border: 1px solid #333;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #e9e9e9;
      font-weight: bold;
      text-align: center;
    }
    td {
      text-align: left;
    }
    td.number {
      text-align: right;
    }
    .total-row {
      font-weight: bold;
      background-color: #f0f0f0;
    }
    .provento {
      color: #006400;
    }
    .desconto {
      color: #8B0000;
    }
    .summary-section {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 20px;
      margin: 20px 0;
    }
    .summary-box {
      border: 1px solid #333;
      padding: 15px;
      background-color: #fafafa;
    }
    .summary-box h4 {
      margin: 0 0 10px 0;
      font-size: 14px;
      font-weight: bold;
      border-bottom: 1px solid #333;
      padding-bottom: 5px;
    }
    .summary-item {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      font-size: 12px;
    }
    .summary-item.label {
      font-weight: bold;
    }
    .net-value {
      text-align: right;
      margin-top: 20px;
      font-size: 18px;
      font-weight: bold;
      border-top: 3px solid #000;
      padding-top: 10px;
    }
    .net-value span {
      color: #006400;
    }
    .declaration {
      margin-top: 30px;
      padding: 15px;
      border: 1px solid #333;
      text-align: center;
      font-size: 12px;
      background-color: #fafafa;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 11px;
      color: #666;
      border-top: 1px solid #ddd;
      padding-top: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>RECIBO DE PAGAMENTO DE SALÁRIO</h1>
      ${company ? `
        <div class="company-info">
          <strong>${company.name}</strong>
          ${company.cnpj ? `<br>CNPJ: ${company.cnpj}` : ''}
          ${company.address ? `<br>${company.address}` : ''}
        </div>
      ` : ''}
      <div class="period-info">${monthName}/${payroll.ano_referencia}</div>
    </div>
    
    <!-- Informações do Funcionário -->
    <div class="employee-details">
      <table>
        <tr>
          <td class="label">Código</td>
          <td>${employee.matricula || '-'}</td>
          <td class="label">Nome do Funcionário</td>
          <td colspan="5">${employee.nome}</td>
        </tr>
        <tr>
          <td class="label">CBO</td>
          <td>${employee.cargo?.nome || '-'}</td>
          <td class="label">Departamento</td>
          <td>${employee.departamento?.nome || '-'}</td>
          <td class="label">Setor</td>
          <td>-</td>
          <td class="label">CPF</td>
          <td>${employee.cpf || '-'}</td>
        </tr>
      </table>
    </div>
    
    <!-- Tabela Unificada de Vencimentos e Descontos -->
    <h3 style="margin-bottom: 10px;">VENCIMENTOS E DESCONTOS</h3>
    <table>
      <thead>
        <tr>
          <th style="width: 10%;">Cód.</th>
          <th style="width: 35%;">Descrição</th>
          <th style="width: 15%;">Referência</th>
          <th style="width: 20%;">Vencimentos</th>
          <th style="width: 20%;">Descontos</th>
        </tr>
      </thead>
      <tbody>
        ${proventos.map(event => {
          let referencia = '-';
          if (event.percentual && event.percentual > 0) {
            // Se percentual está em formato decimal (0.09 = 9%), converter
            const percent = event.percentual > 1 ? event.percentual : event.percentual * 100;
            referencia = formatPercent(percent);
          } else if (event.quantidade && event.quantidade !== 1) {
            referencia = event.quantidade.toString();
          }
          return `
          <tr>
            <td>${event.codigo_rubrica || '-'}</td>
            <td>${event.descricao_rubrica}</td>
            <td class="number">${referencia}</td>
            <td class="number provento">R$ ${formatCurrency(event.valor_total || 0)}</td>
            <td class="number">-</td>
          </tr>
        `;
        }).join('')}
        ${descontos.map(event => {
          let referencia = '-';
          if (event.percentual && event.percentual > 0) {
            // Se percentual está em formato decimal (0.09 = 9%), converter
            const percent = event.percentual > 1 ? event.percentual : event.percentual * 100;
            referencia = formatPercent(percent);
          } else if (event.quantidade && event.quantidade !== 1) {
            referencia = event.quantidade.toString();
          }
          return `
          <tr>
            <td>${event.codigo_rubrica || '-'}</td>
            <td>${event.descricao_rubrica}</td>
            <td class="number">${referencia}</td>
            <td class="number">-</td>
            <td class="number desconto">R$ ${formatCurrency(event.valor_total || 0)}</td>
          </tr>
        `;
        }).join('')}
        <tr class="total-row">
          <td colspan="3"><strong>TOTAIS</strong></td>
          <td class="number provento"><strong>R$ ${formatCurrency(payroll.total_vencimentos || 0)}</strong></td>
          <td class="number desconto"><strong>R$ ${formatCurrency(payroll.total_descontos || 0)}</strong></td>
        </tr>
      </tbody>
    </table>
    
    <!-- Resumo e Bases de Cálculo -->
    <div class="summary-section">
      <div class="summary-box">
        <h4>RESUMO</h4>
        <div class="summary-item">
          <span>Salário base</span>
          <span>R$ ${formatCurrency(payroll.salario_base || 0)}</span>
        </div>
        <div class="summary-item">
          <span>Sal. Contrat. INSS</span>
          <span>R$ ${formatCurrency(baseCalculoINSS)}</span>
        </div>
        <div class="summary-item">
          <span>Base de Cálc. FGTS</span>
          <span>R$ ${formatCurrency(baseCalculoFGTS)}</span>
        </div>
      </div>
      
      <div class="summary-box">
        <h4>VALORES</h4>
        <div class="summary-item">
          <span>FGTS do Mês</span>
          <span>R$ ${formatCurrency(valorFGTS)}</span>
        </div>
        <div class="summary-item">
          <span>Total de Venc.</span>
          <span>R$ ${formatCurrency(payroll.total_vencimentos || 0)}</span>
        </div>
        <div class="summary-item">
          <span>Total de descontos</span>
          <span>R$ ${formatCurrency(payroll.total_descontos || 0)}</span>
        </div>
      </div>
      
      <div class="summary-box">
        <h4>BASES DE CÁLCULO</h4>
        <div class="summary-item">
          <span>Base de cálculo IRRF</span>
          <span>R$ ${formatCurrency(baseCalculoIRRF)}</span>
        </div>
        <div class="summary-item">
          <span>Faixa IRRF</span>
          <span>${faixaIRRF}</span>
        </div>
        ${payroll.horas_trabalhadas ? `
        <div class="summary-item">
          <span>Horas Trabalhadas</span>
          <span>${payroll.horas_trabalhadas}h</span>
        </div>
        ` : ''}
      </div>
    </div>
    
    <!-- Valor Líquido -->
    <div class="net-value">
      <span>Valor líquido → R$ ${formatCurrency(payroll.salario_liquido || 0)}</span>
    </div>
    
    <!-- Declaração -->
    <div class="declaration">
      <p><strong>Declaro ter recebido a importância líquida discriminada neste recibo</strong></p>
      <p style="margin-top: 30px;">_________________________________</p>
      <p>Assinatura do Funcionário</p>
    </div>
    
    <div class="footer">
      <p>Este documento é uma representação do contracheque gerado pelo sistema.</p>
      <p>Data de geração: ${new Date().toLocaleString('pt-BR')}</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Gera contracheques em lote (múltiplos funcionários)
 */
export async function generateBatchPayslips(
  payrolls: Payroll[],
  eventsMap: Map<string, PayrollEvent[]>,
  employeesMap: Map<string, Employee>,
  company?: { name: string; cnpj?: string; address?: string }
): Promise<Blob[]> {
  const promises = payrolls.map(async (payroll) => {
    const employee = employeesMap.get(payroll.employee_id);
    const events = eventsMap.get(payroll.id) || [];
    
    if (!employee) {
      throw new Error(`Funcionário não encontrado para folha ${payroll.id}`);
    }
    
    return generatePayslipPDF({
      payroll,
      employee,
      events,
      company
    });
  });
  
  return Promise.all(promises);
}

/**
 * Faz download do contracheque
 */
export function downloadPayslip(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

