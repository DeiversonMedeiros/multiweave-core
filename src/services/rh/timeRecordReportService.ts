import { TimeRecord } from '@/integrations/supabase/rh-types';
import { supabase } from '@/integrations/supabase/client';
import { EntityService } from '@/services/generic/entityService';

// =====================================================
// SERVIÇO DE GERAÇÃO DE RELATÓRIOS DE PONTO
// =====================================================

export interface TimeRecordReportData {
  employeeId: string;
  employeeName: string;
  employeeMatricula?: string;
  month: number;
  year: number;
  records: TimeRecord[];
  bankHoursBalance: number;
  dsr: number;
}

/**
 * Calcula o DSR (Descanso Semanal Remunerado) baseado nos registros do mês
 * DSR = (Total de horas extras + Adicional noturno) / Dias úteis * Domingos e feriados
 */
export function calculateDSR(
  records: TimeRecord[],
  month: number,
  year: number
): number {
  // Calcular total de horas extras e adicional noturno
  const totalExtras50 = records.reduce((sum, r) => sum + (r.horas_extras_50 || 0), 0);
  const totalExtras100 = records.reduce((sum, r) => sum + (r.horas_extras_100 || 0), 0);
  const totalNoturnas = records.reduce((sum, r) => sum + (r.horas_noturnas || 0), 0);
  
  // Total de horas que geram DSR (extras 50% + adicional noturno)
  // Nota: Extras 100% geralmente não geram DSR, mas pode variar por empresa
  const totalHorasDSR = totalExtras50 + totalNoturnas;
  
  if (totalHorasDSR === 0) return 0;
  
  // Calcular dias úteis do mês
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // Último dia do mês
  
  let diasUteis = 0;
  let domingosFeriados = 0;
  
  const current = new Date(startDate);
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    
    // Contar domingos (0) e sábados (6) - pode ser ajustado conforme política da empresa
    if (dayOfWeek === 0) {
      domingosFeriados++;
    } else if (dayOfWeek !== 6) {
      // Segunda a Sexta são dias úteis
      diasUteis++;
    }
    
    current.setDate(current.getDate() + 1);
  }
  
  // DSR = (Total horas DSR / Dias úteis) * Domingos e feriados
  // Nota: Feriados devem ser verificados separadamente, aqui contamos apenas domingos
  const dsr = (totalHorasDSR / diasUteis) * domingosFeriados;
  
  return Math.round(dsr * 100) / 100; // Arredondar para 2 casas decimais
}

/**
 * Busca o saldo do banco de horas até uma data específica
 */
export async function getBankHoursBalanceUntilDate(
  employeeId: string,
  companyId: string,
  untilDate: Date
): Promise<number> {
  try {
    // Buscar saldo atual
    const { data, error } = await (supabase as any)
      .rpc('get_bank_hours_balance', {
        p_employee_id: employeeId,
        p_company_id: companyId,
      });

    if (error) {
      console.error('[getBankHoursBalanceUntilDate] Erro ao buscar saldo:', error);
      return 0;
    }

    const balance = data?.[0]?.current_balance || 0;
    
    // Se a data solicitada é no futuro, retornar saldo atual
    // Se for no passado, precisaríamos calcular o saldo histórico
    // Por enquanto, retornamos o saldo atual
    // TODO: Implementar cálculo histórico se necessário
    return balance;
  } catch (err) {
    console.error('[getBankHoursBalanceUntilDate] Erro:', err);
    return 0;
  }
}

/**
 * Gera folha de ponto em HTML (pode ser convertido para PDF)
 */
export function generateTimeRecordReportHTML(data: TimeRecordReportData): string {
  const { employeeName, employeeMatricula, month, year, records, bankHoursBalance, dsr } = data;
  
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  
  const monthName = monthNames[month - 1];
  
  // Calcular totais
  const totalHorasTrabalhadas = records.reduce((sum, r) => sum + (r.horas_trabalhadas || 0), 0);
  const totalHorasNegativas = records.reduce((sum, r) => sum + (r.horas_negativas || 0), 0);
  const totalExtras50 = records.reduce((sum, r) => sum + (r.horas_extras_50 || 0), 0);
  const totalExtras100 = records.reduce((sum, r) => sum + (r.horas_extras_100 || 0), 0);
  const totalNoturnas = records.reduce((sum, r) => sum + (r.horas_noturnas || 0), 0);
  
  // Formatar horas
  const formatHours = (hours: number) => {
    return hours.toFixed(2).replace('.', ',');
  };
  
  // Formatar data
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  };
  
  // Formatar hora
  const formatTime = (time?: string) => {
    if (!time) return '--:--';
    return time;
  };
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Folha de Ponto - ${employeeName}</title>
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
      max-width: 1000px;
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
    .period-info {
      text-align: right;
      font-size: 16px;
      font-weight: bold;
      margin-top: 10px;
    }
    .employee-info {
      margin-bottom: 20px;
      padding: 15px;
      background-color: #f5f5f5;
      border: 1px solid #ddd;
    }
    .employee-info table {
      width: 100%;
      border-collapse: collapse;
    }
    .employee-info td {
      padding: 5px 10px;
      border: 1px solid #ddd;
      font-size: 12px;
    }
    .employee-info td.label {
      font-weight: bold;
      background-color: #e9e9e9;
      width: 150px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 11px;
    }
    th, td {
      border: 1px solid #333;
      padding: 6px;
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
    td.number, td.time {
      text-align: right;
    }
    .summary-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
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
    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 11px;
      color: #666;
      border-top: 1px solid #ddd;
      padding-top: 10px;
    }
    @media print {
      body {
        background-color: white;
      }
      .container {
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>FOLHA DE PONTO</h1>
      <div class="period-info">${monthName}/${year}</div>
    </div>
    
    <!-- Informações do Funcionário -->
    <div class="employee-info">
      <table>
        <tr>
          <td class="label">Nome do Funcionário</td>
          <td>${employeeName}</td>
          <td class="label">Matrícula</td>
          <td>${employeeMatricula || '-'}</td>
        </tr>
      </table>
    </div>
    
    <!-- Tabela de Registros -->
    <h3 style="margin-bottom: 10px;">REGISTROS DE PONTO</h3>
    <table>
      <thead>
        <tr>
          <th style="width: 8%;">Data</th>
          <th style="width: 8%;">Entrada</th>
          <th style="width: 8%;">Início Almoço</th>
          <th style="width: 8%;">Fim Almoço</th>
          <th style="width: 8%;">Saída</th>
          <th style="width: 8%;">Horas Trabalhadas</th>
          <th style="width: 8%;">Extras 50%</th>
          <th style="width: 8%;">Extras 100%</th>
          <th style="width: 8%;">Adicional Noturno</th>
          <th style="width: 8%;">Horas Negativas</th>
          <th style="width: 10%;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${records
          .sort((a, b) => new Date(a.data_registro).getTime() - new Date(b.data_registro).getTime())
          .map(record => `
          <tr>
            <td>${formatDate(record.data_registro)}</td>
            <td class="time">${formatTime(record.entrada)}</td>
            <td class="time">${formatTime(record.entrada_almoco)}</td>
            <td class="time">${formatTime(record.saida_almoco)}</td>
            <td class="time">${formatTime(record.saida)}</td>
            <td class="number">${formatHours(record.horas_trabalhadas || 0)}h</td>
            <td class="number">${formatHours(record.horas_extras_50 || 0)}h</td>
            <td class="number">${formatHours(record.horas_extras_100 || 0)}h</td>
            <td class="number">${formatHours(record.horas_noturnas || 0)}h</td>
            <td class="number">${formatHours(record.horas_negativas || 0)}h</td>
            <td>${record.status || 'pendente'}</td>
          </tr>
        `).join('')}
        <tr style="font-weight: bold; background-color: #f0f0f0;">
          <td colspan="5"><strong>TOTAIS</strong></td>
          <td class="number"><strong>${formatHours(totalHorasTrabalhadas)}h</strong></td>
          <td class="number"><strong>${formatHours(totalExtras50)}h</strong></td>
          <td class="number"><strong>${formatHours(totalExtras100)}h</strong></td>
          <td class="number"><strong>${formatHours(totalNoturnas)}h</strong></td>
          <td class="number"><strong>${formatHours(totalHorasNegativas)}h</strong></td>
          <td></td>
        </tr>
      </tbody>
    </table>
    
    <!-- Resumo -->
    <div class="summary-section">
      <div class="summary-box">
        <h4>RESUMO DE HORAS</h4>
        <div class="summary-item">
          <span>Total de Horas Trabalhadas</span>
          <span>${formatHours(totalHorasTrabalhadas)}h</span>
        </div>
        <div class="summary-item">
          <span>Horas Extras 50%</span>
          <span>${formatHours(totalExtras50)}h</span>
        </div>
        <div class="summary-item">
          <span>Horas Extras 100%</span>
          <span>${formatHours(totalExtras100)}h</span>
        </div>
        <div class="summary-item">
          <span>Adicional Noturno</span>
          <span>${formatHours(totalNoturnas)}h</span>
        </div>
        <div class="summary-item">
          <span>Horas Negativas</span>
          <span>${formatHours(totalHorasNegativas)}h</span>
        </div>
        <div class="summary-item">
          <span>DSR (Descanso Semanal Remunerado)</span>
          <span>${formatHours(dsr)}h</span>
        </div>
      </div>
      
      <div class="summary-box">
        <h4>BANCO DE HORAS</h4>
        <div class="summary-item">
          <span>Saldo até ${monthName}/${year}</span>
          <span>${formatHours(bankHoursBalance)}h</span>
        </div>
      </div>
    </div>
    
    <div class="footer">
      <p>Este documento é uma representação da folha de ponto gerada pelo sistema.</p>
      <p>Data de geração: ${new Date().toLocaleString('pt-BR')}</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Gera CSV com os dados do funcionário (apenas nome, data e registros de ponto)
 */
export function generateTimeRecordReportCSV(data: TimeRecordReportData): string {
  const { employeeName, records } = data;
  
  // Cabeçalho da tabela
  const lines: string[] = [];
  lines.push('Funcionário,Data,Entrada,Início Almoço,Fim Almoço,Saída');
  
  // Registros
  records
    .sort((a, b) => new Date(a.data_registro).getTime() - new Date(b.data_registro).getTime())
    .forEach(record => {
      const date = new Date(record.data_registro).toLocaleDateString('pt-BR');
      const entrada = record.entrada || '';
      const entradaAlmoco = record.entrada_almoco || '';
      const saidaAlmoco = record.saida_almoco || '';
      const saida = record.saida || '';
      
      lines.push(`${employeeName},${date},${entrada},${entradaAlmoco},${saidaAlmoco},${saida}`);
    });
  
  return lines.join('\n');
}

/**
 * Faz download de um arquivo
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

