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
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    .company-info {
      font-size: 14px;
      margin-bottom: 10px;
    }
    .employee-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      padding: 15px;
      background-color: #f5f5f5;
    }
    .info-item {
      margin-bottom: 5px;
    }
    .info-label {
      font-weight: bold;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f2f2f2;
      font-weight: bold;
    }
    .total-row {
      font-weight: bold;
      background-color: #f9f9f9;
    }
    .provento {
      color: #28a745;
    }
    .desconto {
      color: #dc3545;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>RECIBO DE PAGAMENTO DE SALÁRIO</h1>
    ${company ? `
      <div class="company-info">
        <strong>${company.name}</strong>
        ${company.cnpj ? `<br>CNPJ: ${company.cnpj}` : ''}
        ${company.address ? `<br>${company.address}` : ''}
      </div>
    ` : ''}
  </div>
  
  <div class="employee-info">
    <div>
      <div class="info-item">
        <span class="info-label">Funcionário:</span> ${employee.nome}
      </div>
      ${employee.matricula ? `
        <div class="info-item">
          <span class="info-label">Matrícula:</span> ${employee.matricula}
        </div>
      ` : ''}
      ${employee.cpf ? `
        <div class="info-item">
          <span class="info-label">CPF:</span> ${employee.cpf}
        </div>
      ` : ''}
    </div>
    <div>
      <div class="info-item">
        <span class="info-label">Período:</span> ${monthName}/${payroll.ano_referencia}
      </div>
      ${payroll.data_pagamento ? `
        <div class="info-item">
          <span class="info-label">Data de Pagamento:</span> ${new Date(payroll.data_pagamento).toLocaleDateString('pt-BR')}
        </div>
      ` : ''}
    </div>
  </div>
  
  <h3>PROVENTOS</h3>
  <table>
    <thead>
      <tr>
        <th>Código</th>
        <th>Descrição</th>
        <th>Referência</th>
        <th>Vencimentos</th>
      </tr>
    </thead>
    <tbody>
      ${proventos.map(event => `
        <tr>
          <td>${event.codigo_rubrica}</td>
          <td>${event.descricao_rubrica}</td>
          <td>${event.quantidade || 1}</td>
          <td class="provento">R$ ${event.valor_total?.toFixed(2) || '0.00'}</td>
        </tr>
      `).join('')}
      <tr class="total-row">
        <td colspan="3"><strong>TOTAL DE PROVENTOS</strong></td>
        <td class="provento"><strong>R$ ${payroll.total_vencimentos?.toFixed(2) || '0.00'}</strong></td>
      </tr>
    </tbody>
  </table>
  
  <h3>DESCONTOS</h3>
  <table>
    <thead>
      <tr>
        <th>Código</th>
        <th>Descrição</th>
        <th>Referência</th>
        <th>Descontos</th>
      </tr>
    </thead>
    <tbody>
      ${descontos.map(event => `
        <tr>
          <td>${event.codigo_rubrica}</td>
          <td>${event.descricao_rubrica}</td>
          <td>${event.quantidade || 1}</td>
          <td class="desconto">R$ ${event.valor_total?.toFixed(2) || '0.00'}</td>
        </tr>
      `).join('')}
      <tr class="total-row">
        <td colspan="3"><strong>TOTAL DE DESCONTOS</strong></td>
        <td class="desconto"><strong>R$ ${payroll.total_descontos?.toFixed(2) || '0.00'}</strong></td>
      </tr>
    </tbody>
  </table>
  
  <div style="text-align: right; margin-top: 20px; font-size: 18px; font-weight: bold;">
    <div style="border-top: 2px solid #000; padding-top: 10px; display: inline-block; min-width: 300px;">
      <div style="display: flex; justify-content: space-between;">
        <span>LÍQUIDO A RECEBER:</span>
        <span style="color: #28a745;">R$ ${payroll.salario_liquido?.toFixed(2) || '0.00'}</span>
      </div>
    </div>
  </div>
  
  <div class="footer">
    <p>Este documento é uma representação do contracheque gerado pelo sistema.</p>
    <p>Data de geração: ${new Date().toLocaleString('pt-BR')}</p>
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

