import { Employee } from '@/integrations/supabase/rh-types';

/**
 * Dados necessários para gerar o recibo/aviso de férias
 */
export interface VacationReceiptData {
  company: any; // Registro da tabela companies (usamos campos principais)
  employee: Employee | null;
  positionName?: string | null;
  vacation: {
    data_inicio: string;
    data_fim: string;
    dias_solicitados: number;
    tipo: string;
    ano_aquisitivo?: number;
    periodo_aquisitivo_inicio?: string;
    periodo_aquisitivo_fim?: string;
  };
}

function formatDate(date: string | Date | undefined | null): string {
  if (!date) return '';

  let dateObj: Date;

  if (typeof date === 'string') {
    if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = date.split('-').map(Number);
      dateObj = new Date(year, month - 1, day);
    } else {
      dateObj = new Date(date);
    }
  } else {
    dateObj = date;
  }

  if (isNaN(dateObj.getTime())) return '';

  return dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatCNPJ(cnpj?: string | null): string {
  if (!cnpj) return '';
  const cleaned = cnpj.replace(/\D/g, '');
  if (cleaned.length === 14) {
    return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }
  return cnpj;
}

function formatMatricula(matricula?: string | null): string {
  if (!matricula) return '';
  return matricula;
}

function formatEndereco(endereco: any): string {
  if (!endereco) return '';
  const parts: string[] = [];
  if (endereco.logradouro) parts.push(endereco.logradouro);
  if (endereco.numero) parts.push(endereco.numero);
  if (endereco.bairro) parts.push(endereco.bairro);

  const cidadeUf: string[] = [];
  if (endereco.cidade) cidadeUf.push(endereco.cidade);
  if (endereco.uf) cidadeUf.push(endereco.uf);

  if (cidadeUf.length > 0) {
    parts.push(cidadeUf.join(' - '));
  }

  if (endereco.cep) {
    const cleaned = String(endereco.cep).replace(/\D/g, '');
    const formatted =
      cleaned.length === 8
        ? cleaned.replace(/^(\d{5})(\d{3})$/, '$1-$2')
        : endereco.cep;
    parts.push(`CEP: ${formatted}`);
  }

  return parts.join(', ');
}

function getEmployeeSection(employee: Employee | null): string {
  if (!employee) return '';
  if ((employee as any).departamento_nome) {
    return (employee as any).departamento_nome;
  }
  if (employee.departamento && (employee.departamento as any).nome) {
    return (employee.departamento as any).nome;
  }
  return '';
}

function addDays(dateString: string, days: number): string | null {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (isNaN(date.getTime())) return null;
  date.setDate(date.getDate() + days);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Gera HTML para o recibo/aviso de férias (aviso de gozo).
 * O HTML pode ser impresso ou salvo como PDF pelo navegador.
 */
export function generateVacationReceiptHTML(data: VacationReceiptData): string {
  const { company, employee, positionName, vacation } = data;

  const companyName = company?.razao_social || company?.nome_fantasia || '';
  const companyCnpj = formatCNPJ(company?.cnpj);
  const companyEndereco = formatEndereco(company?.endereco || {});
  const companyLogo = company?.logo_url || '';

  const employeeName = employee?.nome || '';
  const employeeMatricula = formatMatricula(employee?.matricula);
  const employeeCtps = employee?.ctps || '';
  const employeeCtpsSerie = employee?.ctps_serie || '';
  const employeeCtpsUf = employee?.ctps_uf || '';
  const employeeAdmissionDate = formatDate(employee?.data_admissao);
  const employeeRole = positionName || employee?.cargo?.nome || '';
  const employeeSection = getEmployeeSection(employee);

  const periodoAquisitivoInicio = vacation.periodo_aquisitivo_inicio
    ? formatDate(vacation.periodo_aquisitivo_inicio)
    : '';
  const periodoAquisitivoFim = vacation.periodo_aquisitivo_fim
    ? formatDate(vacation.periodo_aquisitivo_fim)
    : '';

  const periodoGozoInicio = formatDate(vacation.data_inicio);
  const periodoGozoFim = formatDate(vacation.data_fim);

  const retornoTrabalhoRaw = addDays(vacation.data_fim, 1);
  const retornoTrabalho = retornoTrabalhoRaw ? formatDate(retornoTrabalhoRaw) : '';

  const hoje = formatDate(new Date());

  const cidadeEmpresa = company?.endereco?.cidade || '';
  const ufEmpresa = company?.endereco?.uf || '';

  const localDataLinha = [cidadeEmpresa, ufEmpresa].filter(Boolean).join(' - ');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Aviso de Férias - ${employeeName}</title>
    <style>
      * {
        box-sizing: border-box;
        font-family: Arial, Helvetica, sans-serif;
      }
      body {
        margin: 20px;
        font-size: 12px;
        color: #333;
        background-color: #f5f5f5;
      }
      .container {
        background-color: #ffffff;
        max-width: 900px;
        margin: 0 auto;
        padding: 24px 32px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.08);
        border-radius: 4px;
      }
      .header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 2px solid #111827;
        font-size: 11px;
      }
      .header strong {
        font-weight: 600;
      }
      .header-left {
        display: flex;
        gap: 16px;
        align-items: flex-start;
      }
      .logo-container img {
        max-width: 100px;
        max-height: 80px;
        object-fit: contain;
      }
      .company-info {
        font-size: 11px;
      }
      .company-info-line {
        margin: 2px 0;
      }
      .header-right {
        text-align: right;
        font-size: 11px;
      }
      .line {
        border-top: 1px solid #000;
        margin: 8px 0 12px;
      }
      .title {
        text-align: center;
        letter-spacing: 4px;
        font-weight: 700;
        margin: 16px 0 12px;
        font-size: 14px;
      }
      .subtitle {
        text-align: center;
        font-size: 11px;
        color: #4b5563;
      }
      .section-text {
        margin: 12px 0;
        line-height: 1.5;
      }
      .section-text span.label {
        font-weight: 600;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 12px;
        font-size: 11px;
      }
      th, td {
        border: 1px solid #000;
        padding: 6px 8px;
        text-align: center;
      }
      th {
        font-weight: 600;
      }
      .footer-text {
        margin-top: 16px;
        font-size: 11px;
      }
      .signature-section {
        margin-top: 32px;
      }
      .signatures-row {
        display: flex;
        justify-content: space-between;
        gap: 32px;
        margin-top: 24px;
      }
      .signature-block {
        flex: 1;
        text-align: center;
      }
      .signature-line {
        margin-top: 32px;
        border-top: 1px solid #000;
        width: 260px;
        margin-left: auto;
        margin-right: auto;
        padding-top: 4px;
      }
      .small {
        font-size: 10px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="header-left">
          ${companyLogo ? `<div class="logo-container"><img src="${companyLogo}" alt="Logo" /></div>` : ''}
          <div class="company-info">
            <div class="company-info-line"><strong>${companyName || '&nbsp;'}</strong></div>
            <div class="company-info-line">${companyEndereco || '&nbsp;'}</div>
            <div class="company-info-line">CNPJ: ${companyCnpj || '&nbsp;'}</div>
          </div>
        </div>
        <div class="header-right">
          <div><strong>Aviso de Férias</strong></div>
          <div>${periodoGozoInicio && periodoGozoFim ? `${periodoGozoInicio} a ${periodoGozoFim}` : '&nbsp;'}</div>
        </div>
      </div>

      <div class="line"></div>

      <div style="font-size: 11px; margin-bottom: 8px;">
        <div><strong>Empregado:</strong> ${employeeMatricula ? employeeMatricula + ' - ' : ''}${employeeName || '&nbsp;'}</div>
        <div><strong>CTPS/Série:</strong> ${employeeCtps || '&nbsp;'} ${employeeCtpsSerie ? ' - ' + employeeCtpsSerie : ''} ${employeeCtpsUf ? ' / ' + employeeCtpsUf : ''}</div>
        <div><strong>Admissão:</strong> ${employeeAdmissionDate || '&nbsp;'} &nbsp;&nbsp;&nbsp; <strong>Função:</strong> ${employeeRole || '&nbsp;'} &nbsp;&nbsp;&nbsp; <strong>Seção:</strong> ${employeeSection || '&nbsp;'}</div>
      </div>

      <div class="line"></div>

      <div class="title">A V I S O &nbsp;&nbsp; D E &nbsp;&nbsp; F É R I A S</div>
      <div class="subtitle">
        Documento para ciência e assinatura do empregado e do empregador.
      </div>

      <div class="section-text">
        Comunicamos a <strong>${employeeName || '&nbsp;'}</strong>, Matrícula: <strong>${employeeMatricula || '&nbsp;'}</strong>, portador(a) da CTPS nº <strong>${employeeCtps || '________'}</strong> Série <strong>${employeeCtpsSerie || '____'}</strong>, que gozará férias conforme discriminado abaixo.
      </div>

      <table>
        <thead>
          <tr>
            <th>Período Aquisitivo</th>
            <th>Período de Gozo</th>
            <th>Licença remunerada</th>
            <th>Retorno ao Trabalho</th>
            <th>Abono</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${periodoAquisitivoInicio && periodoAquisitivoFim ? `${periodoAquisitivoInicio} a ${periodoAquisitivoFim}` : '&nbsp;'}</td>
            <td>${periodoGozoInicio && periodoGozoFim ? `${periodoGozoInicio} a ${periodoGozoFim}` : '&nbsp;'}</td>
            <td>&nbsp;</td>
            <td>${retornoTrabalho || '&nbsp;'}</td>
            <td>&nbsp;</td>
          </tr>
        </tbody>
      </table>

      <div class="footer-text">
        A remuneração correspondente às férias deverá ser recebida em: ____/____/_______.
      </div>

      <div class="signature-section">
        <div class="small">
          ${localDataLinha ? localDataLinha + ',' : ''} ${hoje || '&nbsp;'}
        </div>
        <div class="signatures-row">
          <div class="signature-block">
            <div class="signature-line small">
              Assinatura do Empregado
            </div>
          </div>
          <div class="signature-block">
            <div class="signature-line small">
              Assinatura do Empregador
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>
`;
}

/**
 * Evento financeiro relacionado ao pagamento de férias,
 * normalmente vindo da tabela `rh.payroll_events`.
 */
export interface VacationPaymentEvent {
  codigo: string;
  descricao: string;
  referencia?: string;
  valor: number;
  tipo: 'provento' | 'desconto';
  mes_referencia?: number;
  ano_referencia?: number;
}

export interface VacationPaymentReceiptData {
  company: any;
  employee: Employee | null;
  positionName?: string | null;
  vacation: {
    data_inicio: string;
    data_fim: string;
    dias_solicitados: number;
    tipo: string;
    ano_aquisitivo?: number;
    periodo_aquisitivo_inicio?: string;
    periodo_aquisitivo_fim?: string;
  };
  /** Eventos filtrados de folha (apenas rubricas de férias) */
  events: VacationPaymentEvent[];
  totals: {
    totalProventos: number;
    totalDescontos: number;
    liquido: number;
  };
}

/**
 * Gera HTML para o RECIBO DE FÉRIAS (pagamento),
 * usando lançamentos da folha de pagamento relacionados às férias.
 *
 * O layout é inspirado em modelos tradicionais de recibo,
 * semelhante ao anexo fornecido, mas genérico o suficiente
 * para funcionar com qualquer conjunto de rubricas de férias.
 */
export function generateVacationPaymentReceiptHTML(
  data: VacationPaymentReceiptData,
): string {
  const { company, employee, positionName, vacation, events, totals } = data;

  const companyName = company?.razao_social || company?.nome_fantasia || '';
  const companyCnpj = formatCNPJ(company?.cnpj);
  const companyEndereco = formatEndereco(company?.endereco || {});

  const employeeName = employee?.nome || '';
  const employeeMatricula = formatMatricula(employee?.matricula);
  const employeeCtps = employee?.ctps || '';
  const employeeCtpsSerie = employee?.ctps_serie || '';
  const employeeCtpsUf = employee?.ctps_uf || '';
  const employeeAdmissionDate = formatDate(employee?.data_admissao);
  const employeeRole = positionName || employee?.cargo?.nome || '';
  const employeeSection = getEmployeeSection(employee);

  const periodoAquisitivoInicio = vacation.periodo_aquisitivo_inicio
    ? formatDate(vacation.periodo_aquisitivo_inicio)
    : '';
  const periodoAquisitivoFim = vacation.periodo_aquisitivo_fim
    ? formatDate(vacation.periodo_aquisitivo_fim)
    : '';

  const periodoGozoInicio = formatDate(vacation.data_inicio);
  const periodoGozoFim = formatDate(vacation.data_fim);

  const hoje = formatDate(new Date());

  const cidadeEmpresa = company?.endereco?.cidade || '';
  const ufEmpresa = company?.endereco?.uf || '';
  const localDataLinha = [cidadeEmpresa, ufEmpresa].filter(Boolean).join(' - ');

  // Formatar moeda em BRL
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value || 0);

  // Normalizar eventos para incluir mês/ano amigável
  const normalizedEvents = events.map((ev) => ({
    ...ev,
    referencia: ev.referencia || '',
    mesAno:
      ev.mes_referencia && ev.ano_referencia
        ? `${String(ev.mes_referencia).padStart(2, '0')}/${ev.ano_referencia}`
        : '',
  }));

  return `
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Recibo de Férias - ${employeeName}</title>
    <style>
      * {
        box-sizing: border-box;
        font-family: Arial, Helvetica, sans-serif;
      }
      body {
        margin: 20px;
        font-size: 12px;
        color: #111827;
        background-color: #f5f5f5;
      }
      .container {
        background-color: #ffffff;
        max-width: 900px;
        margin: 0 auto;
        padding: 24px 32px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.08);
        border-radius: 4px;
      }
      .header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 2px solid #111827;
      }
      .header-left {
        font-size: 11px;
      }
      .header-left strong {
        font-weight: 600;
      }
      .header-right {
        text-align: right;
        font-size: 11px;
      }
      .title {
        text-align: center;
        font-size: 14px;
        font-weight: 700;
        margin: 12px 0 8px;
      }
      .subheader {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        margin-bottom: 8px;
      }
      .section {
        margin-top: 10px;
        font-size: 11px;
      }
      .section-title {
        font-weight: 600;
        margin-bottom: 4px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 8px;
        font-size: 11px;
      }
      th, td {
        border: 1px solid #000;
        padding: 4px 6px;
        text-align: center;
      }
      th {
        font-weight: 600;
        background-color: #f3f4f6;
      }
      td.text-left {
        text-align: left;
      }
      td.number {
        text-align: right;
        white-space: nowrap;
      }
      .totals-row {
        font-weight: 600;
        background-color: #f9fafb;
      }
      .footer-text {
        margin-top: 16px;
        font-size: 11px;
      }
      .signature-section {
        margin-top: 28px;
      }
      .signature-line {
        margin-top: 28px;
        border-top: 1px solid #000;
        width: 260px;
        margin-left: auto;
        margin-right: auto;
        padding-top: 4px;
        text-align: center;
        font-size: 10px;
      }
      .signatures-row {
        display: flex;
        justify-content: space-between;
        gap: 32px;
        margin-top: 16px;
      }
      .signature-block {
        flex: 1;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="header-left">
          <div><strong>${companyName || '&nbsp;'}</strong></div>
          <div>${companyEndereco || '&nbsp;'}</div>
          <div>CNPJ: ${companyCnpj || '&nbsp;'}</div>
        </div>
        <div class="header-right">
          <div><strong>RECIBO DE FÉRIAS</strong></div>
          <div>Data de emissão: ${hoje || '&nbsp;'}</div>
        </div>
      </div>

      <div class="subheader">
        <div>
          <div><strong>Empregado:</strong> ${employeeMatricula ? employeeMatricula + ' - ' : ''}${employeeName || '&nbsp;'}</div>
          <div><strong>Função:</strong> ${employeeRole || '&nbsp;'} &nbsp;&nbsp; <strong>Seção:</strong> ${employeeSection || '&nbsp;'}</div>
        </div>
        <div style="text-align: right;">
          <div><strong>CTPS:</strong> ${employeeCtps || '____'} ${employeeCtpsSerie ? ' - ' + employeeCtpsSerie : ''} ${employeeCtpsUf ? ' / ' + employeeCtpsUf : ''}</div>
          <div><strong>Admissão:</strong> ${employeeAdmissionDate || '&nbsp;'}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Períodos</div>
        <div>
          <strong>Período Aquisitivo:</strong>
          ${periodoAquisitivoInicio && periodoAquisitivoFim ? `${periodoAquisitivoInicio} a ${periodoAquisitivoFim}` : '&nbsp;'}
        </div>
        <div>
          <strong>Período de Gozo:</strong>
          ${periodoGozoInicio && periodoGozoFim ? `${periodoGozoInicio} a ${periodoGozoFim}` : '&nbsp;'}
          &nbsp;&nbsp; <strong>Dias:</strong> ${vacation.dias_solicitados || 0}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Demonstrativo de Proventos e Descontos de Férias</div>
        <table>
          <thead>
            <tr>
              <th style="width: 32%;">Verba</th>
              <th style="width: 14%;">Referência</th>
              <th style="width: 14%;">Mês/Ano</th>
              <th style="width: 20%;">Proventos</th>
              <th style="width: 20%;">Descontos</th>
            </tr>
          </thead>
          <tbody>
            ${
              normalizedEvents.length === 0
                ? `<tr><td colspan="5">Nenhum lançamento de férias encontrado na folha.</td></tr>`
                : normalizedEvents
                    .map(
                      (ev) => `
              <tr>
                <td class="text-left">${ev.descricao}</td>
                <td>${ev.referencia || '&nbsp;'}</td>
                <td>${ev.mesAno || '&nbsp;'}</td>
                <td class="number">${
                  ev.tipo === 'provento' ? formatCurrency(ev.valor) : '&nbsp;'
                }</td>
                <td class="number">${
                  ev.tipo === 'desconto' ? formatCurrency(ev.valor) : '&nbsp;'
                }</td>
              </tr>
            `,
                    )
                    .join('')
            }
            <tr class="totals-row">
              <td colspan="3" class="text-left"><strong>Totais</strong></td>
              <td class="number"><strong>${formatCurrency(
                totals.totalProventos || 0,
              )}</strong></td>
              <td class="number"><strong>${formatCurrency(
                totals.totalDescontos || 0,
              )}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="footer-text">
          <strong>Valor líquido de férias a receber:</strong>
          ${formatCurrency(totals.liquido || 0)}
        </div>
      </div>

      <div class="footer-text">
        Recebi de <strong>${companyName || '&nbsp;'}</strong> a importância líquida de
        <strong>${formatCurrency(
          totals.liquido || 0,
        )}</strong> referente ao pagamento de férias conforme demonstrativo acima.
      </div>

      <div class="signature-section">
        <div style="font-size: 11px;">
          ${localDataLinha ? localDataLinha + ',' : ''} ${hoje || '&nbsp;'}
        </div>
        <div class="signatures-row">
          <div class="signature-block">
            <div class="signature-line">Assinatura do Empregado</div>
          </div>
          <div class="signature-block">
            <div class="signature-line">Assinatura do Empregador</div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>
`;
}
