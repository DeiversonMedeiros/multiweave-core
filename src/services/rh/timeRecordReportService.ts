import { TimeRecord } from '@/integrations/supabase/rh-types';
import { supabase } from '@/integrations/supabase/client';
import { EntityService } from '@/services/generic/entityService';
import { formatDecimalHoursToHhMm } from '@/lib/utils';

// =====================================================
// SERVIÇO DE GERAÇÃO DE RELATÓRIOS DE PONTO
// =====================================================

export interface CompanyData {
  id: string;
  razao_social?: string;
  nome_fantasia?: string;
  cnpj?: string;
  inscricao_estadual?: string;
  logo_url?: string | null;
  endereco?: any;
  contato?: any;
  numero_empresa?: string;
}

export interface EmployeeData {
  id: string;
  nome: string;
  matricula?: string;
  cpf?: string;
  cargo?: { nome?: string } | null;
  estado?: string;
}

export interface TimeRecordReportData {
  employeeId: string;
  employeeName: string;
  employeeMatricula?: string;
  month: number;
  year: number;
  records: TimeRecord[];
  bankHoursBalance: number;
  dsr: number;
  companyId?: string; // Adicionar companyId para buscar informações de dias
  company?: CompanyData; // Dados da empresa
  employee?: EmployeeData; // Dados completos do funcionário
  /** Mapa data (YYYY-MM-DD) -> natureza do dia (override manual) para o relatório PDF/CSV */
  dayNatureOverrides?: Record<string, string>;
}

/** Opções de Natureza do Dia para exibição e edição */
export const DAY_NATURE_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'dsr', label: 'DSR' },
  { value: 'folga', label: 'Folga' },
  { value: 'folga_debito', label: 'Folga Débito' },
  { value: 'feriado', label: 'Feriado' },
  { value: 'ferias', label: 'Férias' },
  { value: 'atestado', label: 'Atestado' },
  { value: 'compensacao', label: 'Compensação' },
  { value: 'falta', label: 'Falta' },
  { value: 'outros', label: 'Outros' },
] as const;

export type DayNatureValue = typeof DAY_NATURE_OPTIONS[number]['value'];

/** Labels por valor interno (para exibição) */
const DAY_NATURE_LABELS: Record<string, string> = {
  normal: 'Normal',
  dsr: 'DSR',
  folga: 'Folga',
  folga_debito: 'Folga Débito',
  feriado: 'Feriado',
  ferias: 'Férias',
  atestado: 'Atestado',
  compensacao: 'Compensação',
  falta: 'Falta',
  outros: 'Outros',
};

/** Horas padrão a debitar quando a natureza é "Folga Débito" (jornada diária típica) */
export const DEFAULT_DEBIT_HOURS_FOLGA_DEBITO = 8;

/** Naturezas que geram horas negativas (débito) no dia, mesmo sem registro de falta. */
export function isDayNatureDebitHours(natureValue: string | null | undefined): boolean {
  return natureValue === 'folga_debito';
}

/**
 * Retorna as horas diárias do turno do colaborador (cadastrado em rh/work-shifts).
 * Usado para débito de Folga Débito e Falta quando o registro não tem horas_negativas.
 * Retorna 8 se o turno não for encontrado.
 * Usa EntityService.list (mesmo caminho que completeRecordsWithRestDays) para respeitar RLS e permissões.
 */
export async function getEmployeeDailyHours(employeeId: string, companyId: string): Promise<number> {
  console.log('[FOLGA-DEBITO] getEmployeeDailyHours chamado', { employeeId, companyId });
  try {
    const employeeResult = await EntityService.list({
      schema: 'rh',
      table: 'employees',
      companyId,
      filters: { id: employeeId },
      pageSize: 1,
    });
    const employee = employeeResult.data?.[0] as { work_shift_id?: string } | undefined;
    if (!employee?.work_shift_id) {
      console.log('[FOLGA-DEBITO] getEmployeeDailyHours: sem work_shift_id, retornando 8', { employeeId });
      return DEFAULT_DEBIT_HOURS_FOLGA_DEBITO;
    }
    const shiftResult = await EntityService.list({
      schema: 'rh',
      table: 'work_shifts',
      companyId,
      filters: { id: employee.work_shift_id },
      pageSize: 1,
    });
    const shift = shiftResult.data?.[0] as { horas_diarias?: number } | undefined;
    if (shift?.horas_diarias != null) {
      const hours = Number(shift.horas_diarias);
      console.log('[FOLGA-DEBITO] getEmployeeDailyHours: turno encontrado', { employeeId, horas_diarias: hours });
      return hours;
    }
  } catch (err) {
    console.warn('[getEmployeeDailyHours] Erro ao buscar turno:', err);
  }
  console.log('[FOLGA-DEBITO] getEmployeeDailyHours: fallback 8', { employeeId });
  return DEFAULT_DEBIT_HOURS_FOLGA_DEBITO;
}

/** Opções para cálculo de horas a debitar (ex.: horas diárias do turno do colaborador). */
export interface DebitHoursOptions {
  /** Horas diárias do turno do colaborador (cadastrado em rh/work-shifts). Usado para Folga Débito e Falta quando o registro não tem horas_negativas. */
  employeeDailyHours?: number;
}

/** Retorna as horas a debitar para o dia: para Folga Débito prioriza horas do turno (employeeDailyHours), depois record.horas_negativas, depois 8h. */
export function getDebitHoursForDay(
  record: TimeRecord,
  natureValue: string | null | undefined,
  options?: DebitHoursOptions
): number {
  if (!isDayNatureDebitHours(natureValue)) return Number(record.horas_negativas) || 0;
  // Folga Débito: usar horas do turno do colaborador quando disponível; senão valor do registro; senão 8h
  const result = options?.employeeDailyHours ?? (Number(record.horas_negativas) || DEFAULT_DEBIT_HOURS_FOLGA_DEBITO);
  if (natureValue === 'folga_debito') {
    console.log('[FOLGA-DEBITO] getDebitHoursForDay', {
      recordId: record.id,
      data_registro: (record as any).data_registro,
      record_horas_negativas: record.horas_negativas,
      employeeDailyHours: options?.employeeDailyHours,
      result,
    });
  }
  return result;
}

/**
 * Prioridade da natureza do dia (maior = maior prioridade na exibição).
 * Regra: não sobrepor dias com registro de ponto — quem tem entrada/saída é sempre "normal".
 * Ordem: 1-Normal(com ponto) 2-Férias 3-Atestado 4-Feriado 5-Folga 6-Folga Débito 7-Falta 8-Compensação 9-DSR 10-Outros
 */
export const DAY_NATURE_PRIORITY_ORDER = [
  'normal',
  'ferias',
  'atestado',
  'feriado',
  'folga',
  'folga_debito',
  'falta',
  'compensacao',
  'dsr',
  'outros',
] as const;

/**
 * Obtém a natureza do dia a partir do registro (detecção automática).
 * Considera registro virtual (id virtual-*), is_dia_folga, is_feriado, etc.
 * Prioridade: registro com ponto → Normal; depois Férias > Atestado > Feriado > Folga > Folga Débito > Falta > Compensação > DSR > Outros.
 */
export function getDayNatureFromRecord(record: TimeRecord): string {
  const isVirtual = record.id.startsWith('virtual-');
  const hasPunch = !!(record.entrada || record.saida);
  if (hasPunch) return 'normal';

  const isRestDay = (record as any).is_dia_folga || (isVirtual && record.id.includes('-dsr'));
  const isVacation = isVirtual && record.id.includes('-ferias');
  const isMedicalCertificate = isVirtual && record.id.includes('-atestado');
  const isCompensation = isVirtual && record.id.includes('-compensacao');
  const isFalta = isVirtual && record.id.includes('-falta');
  const isFeriadoVirtual = isVirtual && record.id.includes('-feriado');
  const isFeriado = (record as any).is_feriado === true || isFeriadoVirtual;

  if (isVacation) return 'ferias';
  if (isMedicalCertificate) return 'atestado';
  if (isFeriado) return 'feriado';
  if (isRestDay && !record.entrada) {
    if ((record as any).natureza_dia === 'folga_debito') return 'folga_debito';
    return 'dsr';
  }
  if ((record as any).natureza_dia === 'folga_debito') return 'folga_debito';
  if (isFalta) return 'falta';
  if (isCompensation) return 'compensacao';
  return 'normal';
}

/** Retorna o label de exibição da natureza do dia (valor interno -> texto) */
export function getDayNatureLabel(value: string): string {
  return DAY_NATURE_LABELS[value] ?? value;
}

/** Naturezas em que não se contabilizam nem exibem horas negativas: Feriado, DSR e Folga. Compensação e Folga Débito podem gerar débito. */
const DAY_NATURE_NO_NEGATIVE_HOURS = ['feriado', 'dsr', 'folga'] as const;

export function isDayNatureNoNegativeHours(natureValue: string | null | undefined): boolean {
  return !!natureValue && (DAY_NATURE_NO_NEGATIVE_HOURS as readonly string[]).includes(natureValue);
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
 * Busca o saldo do banco de horas até uma data específica.
 * Nota: atualmente retorna o saldo atual da tabela (não histórico por data).
 * Para relatório mensal (PDF/CSV), use getMonthlyBankHoursBalance para alinhar ao card.
 */
export async function getBankHoursBalanceUntilDate(
  employeeId: string,
  companyId: string,
  untilDate: Date
): Promise<number> {
  try {
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
    return balance;
  } catch (err) {
    console.error('[getBankHoursBalanceUntilDate] Erro:', err);
    return 0;
  }
}

/**
 * Saldo do banco de horas apenas do mês indicado (impacto do mês: extras 50% - horas negativas).
 * Mesma fonte do card "Saldo Banco de Horas" na aba Resumo por Funcionário.
 * Use este valor no PDF/CSV da folha de ponto para que "Saldo até Mês/Ano" coincida com o card.
 */
export async function getMonthlyBankHoursBalance(
  employeeId: string,
  companyId: string,
  year: number,
  month: number
): Promise<number> {
  try {
    const { data, error } = await (supabase as any).rpc('get_monthly_bank_hours_balance', {
      p_employee_id: employeeId,
      p_company_id: companyId,
      p_year: year,
      p_month: month,
    });

    if (error) {
      console.error('[getMonthlyBankHoursBalance] Erro ao buscar saldo mensal:', error);
      return 0;
    }

    let value = 0;
    if (typeof data === 'number') value = data;
    else if (typeof data === 'string') value = parseFloat(data) || 0;
    else if (Array.isArray(data) && data.length > 0) value = Number(data[0]) || 0;
    return Math.round(value * 100) / 100;
  } catch (err) {
    console.error('[getMonthlyBankHoursBalance] Erro:', err);
    return 0;
  }
}

/**
 * Busca informações sobre todos os dias do mês (folga, feriado, domingo, atestado, férias)
 */
export interface DayInfo {
  isRestDay: boolean;
  isHoliday: boolean;
  isSunday: boolean;
  isMedicalCertificate: boolean;
  isVacation: boolean;
  hasAbsence: boolean; // Indica se tem falta registrada (horas_faltas > 0)
  compensationType?: string; // Tipo de compensação se houver
  compensationDescription?: string; // Descrição da compensação
  // Informações de atestado de comparecimento
  medicalCertificateHours?: number; // Horas de comparecimento do atestado (se for atestado de comparecimento)
  isMedicalCertificateAttendance?: boolean; // Indica se é atestado de comparecimento
}

/** Tamanho do lote para chamadas RPC por dia (evita ERR_INSUFFICIENT_RESOURCES no navegador) */
const DAYS_INFO_BATCH_SIZE = 6;

/** Opções para getMonthDaysInfo (cache de feriados evita dezenas de RPCs por funcionário) */
export interface GetMonthDaysInfoOptions {
  /** Conjunto de datas (YYYY-MM-DD) que são feriados no mês; quando informado, não chama is_holiday por dia */
  holidayDatesSet?: Set<string>;
}

/**
 * Retorna o conjunto de datas (YYYY-MM-DD) que são feriados para a empresa no mês.
 * Use para passar em getMonthDaysInfo e evitar centenas de chamadas is_holiday na aba Resumo.
 */
export async function getHolidayDatesForMonth(
  companyId: string,
  month: number,
  year: number
): Promise<Set<string>> {
  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0);
  const lastDayStr = lastDay.toISOString().split('T')[0];
  const set = new Set<string>();
  try {
    const { data } = await EntityService.list<{ data: string }>({
      schema: 'rh',
      table: 'holidays',
      companyId,
      filters: { data_gte: firstDay, data_lte: lastDayStr, ativo: true },
      pageSize: 100,
    });
    (data || []).forEach((row) => {
      const d = typeof row.data === 'string' ? row.data.split('T')[0] : row.data;
      if (d) set.add(d);
    });
  } catch (err) {
    console.warn('[getHolidayDatesForMonth] Erro ao buscar feriados:', err);
  }
  return set;
}

export async function getMonthDaysInfo(
  employeeId: string,
  companyId: string,
  month: number,
  year: number,
  options?: GetMonthDaysInfoOptions
): Promise<Map<string, DayInfo>> {
  const daysInfo = new Map<string, DayInfo>();
  const holidayDatesSet = options?.holidayDatesSet;
  
  try {
    // Gerar todos os dias do mês
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Último dia do mês
    
    const current = new Date(startDate);
    const dates: string[] = [];
    
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      dates.push(dateStr);
      current.setDate(current.getDate() + 1);
    }
    
    // Buscar atestados médicos, férias e compensações do mês de uma vez (mais eficiente)
    // Buscar todos que podem se sobrepor ao período do mês
    // NOTA: Tabelas estão no schema 'rh', então usamos EntityService ou acesso direto com schema
    // CORREÇÃO: get_entity_data não suporta filtro com array (status vira string e não retorna nada).
    // Buscar atestados apenas por employee_id e filtrar status no frontend.
    const [medicalCertificatesResult, vacationsResult, compensationsResult] = await Promise.all([
      EntityService.list({
        schema: 'rh',
        table: 'medical_certificates',
        companyId: companyId,
        filters: { employee_id: employeeId }
      }).catch(() => ({ data: [], totalCount: 0, hasMore: false })),
      EntityService.list({
        schema: 'rh',
        table: 'vacations',
        companyId: companyId,
        filters: { employee_id: employeeId }
      }).catch(() => ({ data: [], totalCount: 0, hasMore: false })),
      EntityService.list({
        schema: 'rh',
        table: 'compensation_requests',
        companyId: companyId,
        filters: {
          employee_id: employeeId,
          status: 'aprovado'
        }
      }).catch(() => ({ data: [], totalCount: 0, hasMore: false }))
    ]);
    
    // Filtrar resultados que se sobrepõem ao período do mês
    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];
    
    // Filtrar atestados: apenas aprovado, em_andamento, concluido ou pendente (excluir rejeitado)
    const medicalCertificatesStatusOk = ['aprovado', 'em_andamento', 'concluido', 'pendente'];
    const medicalCertificates = (medicalCertificatesResult.data || []).filter((mc: any) => {
      return medicalCertificatesStatusOk.includes(mc.status) && mc.data_inicio <= lastDate && mc.data_fim >= firstDate;
    });
    // CORREÇÃO: Apenas férias aprovadas devem ser marcadas como "Férias" na folha de ponto
    const vacationsStatusOk = ['aprovado'];
    const vacations = (vacationsResult.data || []).filter((v: any) => {
      return vacationsStatusOk.includes(v.status) && v.data_inicio <= lastDate && v.data_fim >= firstDate;
    });
    const compensations = (compensationsResult.data || []).filter((comp: any) => {
      return comp.data_inicio <= lastDate && (comp.data_fim === null || comp.data_fim >= firstDate);
    });
    
    // Buscar períodos de férias fracionadas para férias aprovadas
    // Como vacations já foi filtrado apenas para 'aprovado', todos os IDs são de férias aprovadas
    const approvedVacationIds = vacations.map((v: any) => v.id);
    
    let vacationPeriods: any[] = [];
    if (approvedVacationIds.length > 0) {
      try {
        // Buscar todos os períodos e filtrar pelos IDs das férias aprovadas
        // (EntityService não suporta filtro IN diretamente)
        const vacationPeriodsResult = await EntityService.list({
          schema: 'rh',
          table: 'vacation_periods',
          companyId: companyId,
          filters: {},
          pageSize: 1000 // Aumentar limite para garantir que busca todos os períodos
        });
        
        // Filtrar períodos que pertencem às férias aprovadas e que se sobrepõem ao mês
        vacationPeriods = (vacationPeriodsResult.data || []).filter((vp: any) => {
          if (!approvedVacationIds.includes(vp.vacation_id)) return false;
          // Verificar se o período se sobrepõe ao mês
          return vp.data_inicio <= lastDate && vp.data_fim >= firstDate;
        });
      } catch (err) {
        console.warn('[getMonthDaysInfo] Erro ao buscar períodos de férias:', err);
      }
    }
    
    // Criar maps para verificação rápida e armazenar informações adicionais
    // Map para armazenar informações completas do atestado por data
    const medicalCertificateInfoByDate = new Map<string, { 
      isAttendance: boolean; 
      hours: number | null;
      status: string;
    }>();
    const medicalCertificateDates = new Set<string>();
    medicalCertificates.forEach((mc: any) => {
      const start = new Date(mc.data_inicio);
      const end = new Date(mc.data_fim);
      const current = new Date(start);
      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        // CORREÇÃO: Sempre adicionar à lista de datas de atestado, mesmo se pendente
        medicalCertificateDates.add(dateStr);
        // Armazenar informações do atestado (se for de comparecimento, armazenar horas)
        if (mc.atestado_comparecimento && mc.horas_comparecimento) {
          // Se já existe informação para esta data, manter a que tem mais horas (ou aprovada)
          const existing = medicalCertificateInfoByDate.get(dateStr);
          if (!existing || 
              (mc.status === 'aprovado' && existing.status !== 'aprovado') ||
              (mc.horas_comparecimento > (existing.hours || 0))) {
            medicalCertificateInfoByDate.set(dateStr, {
              isAttendance: true,
              hours: mc.horas_comparecimento,
              status: mc.status
            });
          }
        } else {
          // Atestado normal (não de comparecimento)
          // CORREÇÃO: Sempre armazenar informações do atestado, mesmo se pendente
          if (!medicalCertificateInfoByDate.has(dateStr)) {
            medicalCertificateInfoByDate.set(dateStr, {
              isAttendance: false,
              hours: null,
              status: mc.status
            });
          }
        }
        current.setDate(current.getDate() + 1);
      }
    });
    
    const vacationDates = new Set<string>();
    
    // Criar um Set com IDs de férias que têm períodos (férias fracionadas)
    const vacationIdsWithPeriods = new Set(vacationPeriods.map((vp: any) => vp.vacation_id));
    
    // Processar férias integrais (usar data_inicio e data_fim da tabela vacations)
    // Férias fracionadas serão processadas pelos períodos
    vacations.forEach((v: any) => {
      // Se esta férias tem períodos, não processar aqui (será processado pelos períodos)
      if (vacationIdsWithPeriods.has(v.id)) {
        return;
      }
      
      // Férias integrais: usar data_inicio e data_fim diretamente
      const start = new Date(v.data_inicio);
      const end = new Date(v.data_fim);
      const current = new Date(start);
      while (current <= end) {
        vacationDates.add(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
    });
    
    // Processar períodos de férias fracionadas aprovadas
    vacationPeriods.forEach((vp: any) => {
      const start = new Date(vp.data_inicio);
      const end = new Date(vp.data_fim);
      const current = new Date(start);
      while (current <= end) {
        vacationDates.add(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
    });
    
    // Map de compensações por data (pode ter múltiplas compensações no mesmo dia)
    const compensationDates = new Map<string, { tipo: string; descricao: string }[]>();
    compensations.forEach((comp: any) => {
      const start = new Date(comp.data_inicio);
      const end = comp.data_fim ? new Date(comp.data_fim) : start; // Se não tem data_fim, usar apenas data_inicio
      const current = new Date(start);
      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        if (!compensationDates.has(dateStr)) {
          compensationDates.set(dateStr, []);
        }
        compensationDates.get(dateStr)!.push({
          tipo: comp.tipo || 'outros',
          descricao: comp.descricao || ''
        });
        current.setDate(current.getDate() + 1);
      }
    });
    
    // Buscar informações para cada dia: feriado (cache ou RPC) e dia de folga (RPC em lotes para evitar ERR_INSUFFICIENT_RESOURCES)
    const { callSchemaFunction } = await import('@/services/generic/entityService');
    
    const results: { dateStr: string; dayInfo: DayInfo }[] = [];
    for (let i = 0; i < dates.length; i += DAYS_INFO_BATCH_SIZE) {
      const batch = dates.slice(i, i + DAYS_INFO_BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (dateStr): Promise<{ dateStr: string; dayInfo: DayInfo }> => {
          try {
            const date = new Date(dateStr + 'T12:00:00');
            const isSunday = date.getDay() === 0;
            let isHoliday = holidayDatesSet ? holidayDatesSet.has(dateStr) : false;
            let isRestDay = false;
            
            if (!holidayDatesSet) {
              try {
                const holidayData = await callSchemaFunction<boolean>('rh', 'is_holiday', {
                  p_date: dateStr,
                  p_company_id: companyId
                });
                isHoliday = holidayData === true;
              } catch {
                // manter isHoliday false
              }
            }
            try {
              const restDayData = await callSchemaFunction<boolean>('rh', 'is_rest_day', {
                p_employee_id: employeeId,
                p_company_id: companyId,
                p_date: dateStr
              });
              isRestDay = restDayData === true;
            } catch (err) {
              console.error(`[getMonthDaysInfo] ❌ Erro ao chamar is_rest_day para ${dateStr}:`, err);
            }
            
            const isMedicalCertificate = medicalCertificateDates.has(dateStr);
            const isVacation = vacationDates.has(dateStr);
            const compensationsForDay = compensationDates.get(dateStr) || [];
            const medicalCertInfo = medicalCertificateInfoByDate.get(dateStr);
            const compensationType = compensationsForDay.length > 0 
              ? compensationsForDay.map(c => c.tipo).join(', ')
              : undefined;
            const compensationDescription = compensationsForDay.length > 0
              ? compensationsForDay.map(c => c.descricao).filter(d => d).join('; ')
              : undefined;
            
            return {
              dateStr,
              dayInfo: {
                isRestDay,
                isHoliday,
                isSunday,
                isMedicalCertificate,
                isVacation,
                hasAbsence: false,
                compensationType,
                compensationDescription,
                medicalCertificateHours: medicalCertInfo?.hours || undefined,
                isMedicalCertificateAttendance: medicalCertInfo?.isAttendance || false
              }
            };
          } catch (err) {
            console.warn(`[getMonthDaysInfo] Erro ao buscar info para ${dateStr}:`, err);
            const date = new Date(dateStr + 'T12:00:00');
            return {
              dateStr,
              dayInfo: {
                isRestDay: false,
                isHoliday: false,
                isSunday: date.getDay() === 0,
                isMedicalCertificate: false,
                isVacation: false,
                hasAbsence: false,
                compensationType: undefined,
                compensationDescription: undefined,
                medicalCertificateHours: undefined,
                isMedicalCertificateAttendance: false
              }
            };
          }
        })
      );
      results.push(...batchResults);
    }
    let restDaysCount = 0;
    let vacationDaysCount = 0;
    let medicalCertificateDaysCount = 0;
    let compensationDaysCount = 0;
    
    results.forEach(({ dateStr, dayInfo }) => {
      daysInfo.set(dateStr, dayInfo);
      if (dayInfo.isRestDay) restDaysCount++;
      if (dayInfo.isVacation) vacationDaysCount++;
      if (dayInfo.isMedicalCertificate) medicalCertificateDaysCount++;
      if (dayInfo.compensationType) compensationDaysCount++;
    });
    
  } catch (err) {
    console.error('[getMonthDaysInfo] ❌ Erro geral:', err);
  }
  
  return daysInfo;
}

/**
 * Completa os registros com dias que não têm registro mas são dias de folga (DSR)
 * Não inclui dias de atestado, férias ou faltas
 * 
 * LÓGICA HÍBRIDA PARA ESCALAS FLEXÍVEIS:
 * 1. Se é dia de folga no ciclo E não tem registro → DSR
 * 2. Se não é dia de folga no ciclo MAS é o primeiro dia sem registro em uma sequência → DSR (até limite de dias_folga)
 * 3. Se exceder dias_folga dias consecutivos sem registro → Falta
 */
export async function completeRecordsWithRestDays(
  records: TimeRecord[],
  month: number,
  year: number,
  daysInfo: Map<string, DayInfo>,
  employeeId: string,
  companyId: string
): Promise<TimeRecord[]> {
  // Buscar informações da escala do funcionário
  let tipoEscala: string = 'fixa';
  let diasFolga: number = 2; // Padrão para escalas fixas
  let employeeHorasDiarias = 8; // Horas diárias do turno para falta/folga débito (padrão 8h)

  try {
      // Buscar informações da escala do funcionário usando EntityService
      const employeeResult = await EntityService.list({
        schema: 'rh',
        table: 'employees',
        companyId: companyId,
        filters: { id: employeeId }
      });
      
      const employeeData = employeeResult.data?.[0] as any;
      
      if (employeeData?.work_shift_id) {
        // Buscar informações da escala
        const workShiftResult = await EntityService.list({
          schema: 'rh',
          table: 'work_shifts',
          companyId: companyId,
          filters: { id: employeeData.work_shift_id }
        });
        
        const workShiftData = workShiftResult.data?.[0] as any;
        if (workShiftData) {
          tipoEscala = workShiftData.tipo_escala || 'fixa';
          diasFolga = workShiftData.dias_folga || 2;
          if (workShiftData.horas_diarias != null) {
            employeeHorasDiarias = Number(workShiftData.horas_diarias);
          }
        } else {
          // Escala não encontrada - usar padrão (não é erro crítico)
          // console.warn(`[completeRecordsWithRestDays] ⚠️ Escala não encontrada para work_shift_id ${employeeData.work_shift_id}`);
        }
      } else {
        // Funcionário sem work_shift_id - usar padrão (não é erro crítico)
        // O sistema ainda pode calcular DSR baseado em isRestDay do getMonthDaysInfo
        // console.warn(`[completeRecordsWithRestDays] ⚠️ Funcionário sem work_shift_id`);
      }
  } catch (err) {
    console.warn('[completeRecordsWithRestDays] Erro ao buscar escala, usando padrão:', err);
  }

  // Verificar se é escala flexível/rotativa
  const isFlexibleScale = tipoEscala !== 'fixa';
  // Criar um mapa de registros por data e verificar faltas
  const recordsByDate = new Map<string, TimeRecord>();
  records.forEach(record => {
    const dateStr = record.data_registro.split('T')[0];
    recordsByDate.set(dateStr, record);
    
    // Marcar como falta se horas_faltas > 0
    if (record.horas_faltas && record.horas_faltas > 0) {
      const dayInfo = daysInfo.get(dateStr);
      if (dayInfo) {
        dayInfo.hasAbsence = true;
      }
    }
  });
  
  // Gerar todos os dias do mês em ordem cronológica
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  const allDays: TimeRecord[] = [];
  const allDates: string[] = [];
  
  const current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    allDates.push(dateStr);
    current.setDate(current.getDate() + 1);
  }
  
  // Para escalas flexíveis: detectar sequências de dias sem registro
  const sequencesWithoutRecord: { start: number; length: number }[] = [];
  if (isFlexibleScale) {
    let sequenceStart = -1;
    for (let i = 0; i < allDates.length; i++) {
      const dateStr = allDates[i];
      const hasRecord = recordsByDate.has(dateStr);
      const dayInfo = daysInfo.get(dateStr);
      const canBeDSR = dayInfo && 
        !dayInfo.isMedicalCertificate && 
        !dayInfo.isVacation && 
        !dayInfo.hasAbsence;
      
      if (!hasRecord && canBeDSR) {
        if (sequenceStart === -1) {
          sequenceStart = i;
        }
      } else {
        if (sequenceStart !== -1) {
          sequencesWithoutRecord.push({
            start: sequenceStart,
            length: i - sequenceStart
          });
          sequenceStart = -1;
        }
      }
    }
    // Adicionar última sequência se terminar no último dia do mês
    if (sequenceStart !== -1) {
      sequencesWithoutRecord.push({
        start: sequenceStart,
        length: allDates.length - sequenceStart
      });
    }
  }
  
  // Processar cada dia do mês
  let virtualRecordsCreated = 0;
  let virtualRecordsByType: Record<string, number> = { dsr: 0, ferias: 0, atestado: 0, compensacao: 0, feriado: 0, falta: 0 };
  
  for (let i = 0; i < allDates.length; i++) {
    const dateStr = allDates[i];
    const dayInfo = daysInfo.get(dateStr);
    const existingRecord = recordsByDate.get(dateStr);
    
    // Se já existe registro, ajustar horas negativas se houver atestado de comparecimento
    // CORREÇÃO: Se é dia de férias aprovadas, garantir que a natureza do dia seja "Férias"
    if (existingRecord) {
      let recordToAdd = { ...existingRecord };
      
      // CORREÇÃO: Se é dia de férias aprovadas, marcar natureza do dia como "ferias"
      if (dayInfo.isVacation) {
        recordToAdd = {
          ...recordToAdd,
          natureza_dia: 'ferias' as any
        };
      }
      
      // CORREÇÃO: Se há registro com horas negativas e existe atestado de comparecimento, reduzir horas negativas
      if (dayInfo.isMedicalCertificateAttendance && 
          dayInfo.medicalCertificateHours && 
          existingRecord.horas_negativas && 
          existingRecord.horas_negativas > 0) {
        const horasNegativasAjustadas = Math.max(0, existingRecord.horas_negativas - dayInfo.medicalCertificateHours);
        recordToAdd = {
          ...recordToAdd,
          horas_negativas: horasNegativasAjustadas,
          horas_faltas: horasNegativasAjustadas > 0 ? horasNegativasAjustadas : 0
        };
      }
      
      allDays.push(recordToAdd);
      continue;
    }
    
    // Se não tem registro e não tem informações do dia, pular
    if (!dayInfo) {
      // Dia sem dayInfo - pulando
      continue;
    }
    
    // Verificar se precisa criar registro virtual para férias, atestado, compensação, feriado, DSR ou falta
    let shouldCreateVirtualRecord = false;
    let virtualRecordType: 'dsr' | 'ferias' | 'atestado' | 'compensacao' | 'feriado' | 'falta' | null = null;
    let virtualRecordLabel = '';
    
    // CORREÇÃO: Verificar se a data é futura (não deve criar faltas para dias futuros)
    const recordDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Zerar horas para comparação apenas de data
    const isFutureDate = recordDate > today;
    
    // Horas diárias esperadas para cálculo de horas negativas em falta (do turno do colaborador em rh/work-shifts)
    const horasDiariasFalta = employeeHorasDiarias;
    
    // CORREÇÃO: Calcular horas negativas ajustadas se houver atestado de comparecimento
    let horasNegativasAjustadas = horasDiariasFalta;
    if (dayInfo.isMedicalCertificateAttendance && dayInfo.medicalCertificateHours) {
      // Se há atestado de comparecimento, reduzir horas negativas
      horasNegativasAjustadas = Math.max(0, horasDiariasFalta - dayInfo.medicalCertificateHours);
    }
    
    // Prioridade: Férias > Atestado > Compensação > Feriado > DSR > Falta (dia útil sem registro).
    // Feriado (retroativo): se a empresa tem feriado na data e não há registro de ponto, criar virtual "feriado" em vez de falta/dsr.
    // CORREÇÃO: Verificar atestado de comparecimento pendente mesmo quando isMedicalCertificate pode não estar setado
    if (dayInfo.isVacation) {
      shouldCreateVirtualRecord = true;
      virtualRecordType = 'ferias';
      virtualRecordLabel = 'Férias';
    } else if (dayInfo.isMedicalCertificate || (dayInfo.isMedicalCertificateAttendance && dayInfo.medicalCertificateHours)) {
      // CORREÇÃO: Verificar tanto isMedicalCertificate quanto isMedicalCertificateAttendance
      shouldCreateVirtualRecord = true;
      virtualRecordType = 'atestado';
      virtualRecordLabel = dayInfo.isMedicalCertificateAttendance 
        ? `Atestado Médico (Comparecimento - ${dayInfo.medicalCertificateHours}h)`
        : 'Atestado Médico';
    } else if (dayInfo.compensationType) {
      shouldCreateVirtualRecord = true;
      virtualRecordType = 'compensacao';
      // Mapear tipos de compensação para labels mais amigáveis
      const compensationLabels: Record<string, string> = {
        'horas_extras': 'Comp. Horas Extras',
        'banco_horas': 'Comp. Banco de Horas',
        'adicional_noturno': 'Comp. Adicional Noturno',
        'adicional_periculosidade': 'Comp. Periculosidade',
        'adicional_insalubridade': 'Comp. Insalubridade',
        'dsr': 'Comp. DSR',
        'feriado': 'Comp. Feriado',
        'outros': 'Compensação'
      };
      virtualRecordLabel = compensationLabels[dayInfo.compensationType] || 'Compensação';
    } else if (dayInfo.isHoliday) {
      // Feriado: dia sem registro de ponto em data de feriado da empresa (retroativo; não sobrepõe dias com ponto)
      shouldCreateVirtualRecord = true;
      virtualRecordType = 'feriado';
      virtualRecordLabel = 'Feriado';
    } else if (!dayInfo.hasAbsence) {
      // Verificar se pode ser DSR (não está em atestado, férias, compensação ou feriado)
      let shouldCreateDSR = false;
      let sequence: { start: number; length: number } | undefined = undefined;
      
      if (isFlexibleScale) {
        // LÓGICA HÍBRIDA PARA ESCALAS FLEXÍVEIS
        // Prioridade 1: Se é dia de folga no ciclo → DSR
        if (dayInfo.isRestDay) {
          shouldCreateDSR = true;
        } else {
          // Prioridade 2: Se não é folga no ciclo, mas é primeiro dia de sequência sem registro
          sequence = sequencesWithoutRecord.find(seq => 
            i >= seq.start && i < seq.start + seq.length
          );
          
          if (sequence) {
            const positionInSequence = i - sequence.start;
            // Se está dentro do limite de dias_folga, é DSR
            if (positionInSequence < diasFolga) {
              shouldCreateDSR = true;
            }
          } else {
          }
        }
      } else {
        // LÓGICA PARA ESCALAS FIXAS
        if (dayInfo.isRestDay) {
          shouldCreateDSR = true;
        } else if (!dayInfo.isVacation && !dayInfo.isMedicalCertificate && !dayInfo.compensationType && !isFutureDate) {
          // CORREÇÃO: Dia útil sem registro e sem atestado/férias/compensação E não é data futura → Falta (horas negativas)
          // Mas se há atestado de comparecimento pendente, criar registro virtual de atestado sem horas negativas
          if (dayInfo.isMedicalCertificateAttendance && dayInfo.medicalCertificateHours) {
            // Há atestado de comparecimento: criar registro virtual de atestado (sem horas negativas, pois não há registro de ponto)
            shouldCreateVirtualRecord = true;
            virtualRecordType = 'atestado';
            virtualRecordLabel = `Atestado Médico (Comparecimento - ${dayInfo.medicalCertificateHours}h)`;
            horasNegativasAjustadas = 0; // Sem registro de ponto = sem horas negativas
          } else {
            shouldCreateVirtualRecord = true;
            virtualRecordType = 'falta';
            virtualRecordLabel = 'Falta';
          }
        }
      }
      
      if (shouldCreateDSR) {
        shouldCreateVirtualRecord = true;
        virtualRecordType = 'dsr';
        // Escala fixa: sábado = Folga, domingo = DSR (não gerar horas negativas)
        virtualRecordLabel = dayInfo.isSunday ? 'DSR' : 'Folga';
      } else if (!shouldCreateVirtualRecord && !dayInfo.isRestDay && !dayInfo.isVacation && !dayInfo.isMedicalCertificate && !dayInfo.compensationType && !isFutureDate) {
        // CORREÇÃO: Escala flexível: não foi DSR (ex.: posição excedeu dias_folga) E não é data futura → Falta
        // Mas se há atestado de comparecimento pendente, criar registro virtual de atestado sem horas negativas
        // CORREÇÃO: Verificar também isMedicalCertificateAttendance antes de criar falta
        if (dayInfo.isMedicalCertificate || (dayInfo.isMedicalCertificateAttendance && dayInfo.medicalCertificateHours)) {
          // Há atestado (normal ou de comparecimento): criar registro virtual de atestado
          shouldCreateVirtualRecord = true;
          virtualRecordType = 'atestado';
          virtualRecordLabel = dayInfo.isMedicalCertificateAttendance 
            ? `Atestado Médico (Comparecimento - ${dayInfo.medicalCertificateHours}h)`
            : 'Atestado Médico';
          horasNegativasAjustadas = 0; // Sem registro de ponto = sem horas negativas
        } else {
          shouldCreateVirtualRecord = true;
          virtualRecordType = 'falta';
          virtualRecordLabel = 'Falta';
        }
      }
    }
    
    if (shouldCreateVirtualRecord && virtualRecordType) {
      const isFalta = virtualRecordType === 'falta';
      const isFeriado = virtualRecordType === 'feriado';
      const isAtestadoComparecimento = virtualRecordType === 'atestado' && dayInfo.isMedicalCertificateAttendance;
      
      // CORREÇÃO: Para atestado de comparecimento sem registro, calcular horas negativas reduzidas. Feriado não gera débito.
      let horasNegativasFinais = 0;
      if (isFalta) {
        horasNegativasFinais = horasDiariasFalta;
      } else if (isFeriado) {
        horasNegativasFinais = 0;
      } else if (isAtestadoComparecimento && dayInfo.medicalCertificateHours) {
        // Se há atestado de comparecimento e não há registro, pode haver horas negativas reduzidas
        // (exemplo: deveria trabalhar 8h, mas só compareceu 3.35h → 4.65h negativas)
        horasNegativasFinais = horasNegativasAjustadas;
      }
      
      // Para dia de folga/DSR: natureza_dia 'folga' (sábado) ou 'dsr' (domingo) para exibição correta no resumo
      const naturezaDiaVirtual =
        virtualRecordType === 'dsr'
          ? (dayInfo.isSunday ? 'dsr' : 'folga')
          : undefined;

      // Criar registro virtual
      const virtualRecord: TimeRecord = {
        id: `virtual-${dateStr}-${virtualRecordType}`,
        employee_id: records[0]?.employee_id || employeeId,
        company_id: records[0]?.company_id || companyId,
        data_registro: dateStr,
        entrada: undefined,
        saida: undefined,
        entrada_almoco: undefined,
        saida_almoco: undefined,
        horas_trabalhadas: 0,
        horas_extras: 0,
        horas_extras_50: 0,
        horas_extras_100: 0,
        horas_negativas: horasNegativasFinais,
        horas_noturnas: 0,
        horas_faltas: (isFalta ? horasDiariasFalta : (isFeriado ? 0 : (horasNegativasFinais > 0 ? horasNegativasFinais : 0))),
        status: 'aprovado' as const,
        is_feriado: dayInfo.isHoliday,
        is_domingo: dayInfo.isSunday,
        is_dia_folga: virtualRecordType === 'dsr',
        ...(naturezaDiaVirtual && { natureza_dia: naturezaDiaVirtual }),
        observacoes: virtualRecordType === 'compensacao' && dayInfo.compensationDescription
          ? dayInfo.compensationDescription
          : virtualRecordLabel,
        created_at: dateStr,
        updated_at: dateStr
      };
      allDays.push(virtualRecord);
      virtualRecordsCreated++;
      virtualRecordsByType[virtualRecordType]++;
    }
  }
  
  return allDays;
}

/**
 * Gera folha de ponto em HTML (pode ser convertido para PDF)
 */
export async function generateTimeRecordReportHTML(data: TimeRecordReportData): Promise<string> {
  const { employeeName, employeeMatricula, month, year, records, bankHoursBalance, dsr, employeeId, companyId, company, employee } = data;
  
  // Buscar informações sobre todos os dias do mês (incluindo dias passados - retroativo)
  let daysInfo = new Map<string, DayInfo>();
  if (employeeId && companyId) {
    try {
      daysInfo = await getMonthDaysInfo(employeeId, companyId, month, year);
    } catch (err) {
      console.warn('[generateTimeRecordReportHTML] Erro ao buscar informações dos dias:', err);
    }
  }
  
  // Completar registros com dias de folga, DSR, atestado, férias e faltas (dias úteis sem registro)
  const completeRecords = await completeRecordsWithRestDays(records, month, year, daysInfo, employeeId!, companyId!);
  
  // Horas diárias do turno para débito de Folga Débito (e exibição consistente com Falta)
  const employeeDailyHours = (employeeId && companyId) ? await getEmployeeDailyHours(employeeId, companyId) : DEFAULT_DEBIT_HOURS_FOLGA_DEBITO;
  const debitOptions: DebitHoursOptions = { employeeDailyHours };
  
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  
  const monthName = monthNames[month - 1];
  
  // Buscar assinatura do funcionário para o mês (portal do colaborador) — data/hora e desenho (dataURL) para o PDF.
  let signatureTimestamp: string | null = null;
  let signatureDataUrl: string | null = null;
  if (employeeId && companyId) {
    try {
      const monthYear = `${year}-${String(month).padStart(2, '0')}`;
      const result = await EntityService.list({
        schema: 'rh',
        table: 'time_record_signatures',
        companyId,
        filters: { employee_id: employeeId, month_year: monthYear },
        pageSize: 1,
      });
      if (!result.error && result.data?.length) {
        const row = result.data[0] as { status?: string; signature_timestamp?: string; signature_data?: { dataURL?: string } };
        if (row && (row.status === 'signed' || row.status === 'approved') && row.signature_timestamp) {
          signatureTimestamp = row.signature_timestamp;
          if (row.signature_data?.dataURL) {
            signatureDataUrl = row.signature_data.dataURL;
          }
        }
      }
    } catch (err) {
      console.warn('[generateTimeRecordReportHTML] Erro ao buscar assinatura:', err);
    }
  }
  
  // Calcular totais a partir dos registros completos (inclui faltas virtuais = dias úteis sem registro)
  // Horas negativas: não incluir Feriado nem DSR; Folga e Compensação contam
  const totalHorasTrabalhadas = completeRecords.reduce((sum, r) => sum + (r.horas_trabalhadas || 0), 0);
  const totalHorasNegativas = completeRecords.reduce((sum, r) => {
    const dateStr = r.data_registro.split('T')[0];
    const natureValue = data.dayNatureOverrides?.[dateStr] ?? (r as any).natureza_dia ?? getDayNatureFromRecord(r);
    if (isDayNatureNoNegativeHours(natureValue)) return sum;
    const debit = getDebitHoursForDay(r, natureValue, debitOptions);
    return sum + debit;
  }, 0);
  const totalExtras50 = completeRecords.reduce((sum, r) => sum + (r.horas_extras_50 || 0), 0);
  const totalExtras100 = completeRecords.reduce((sum, r) => sum + (r.horas_extras_100 || 0), 0);
  const totalNoturnas = completeRecords.reduce((sum, r) => sum + (r.horas_noturnas || 0), 0);
  
  // Formatar horas em decimal para formato legível (ex: 8.5 → "8h30")
  const formatHours = (hours: number) => formatDecimalHoursToHhMm(hours);

  // Formatar data (sem conversão de timezone para evitar problema de um dia a menos)
  const formatDate = (dateStr: string) => {
    // Se a data já está no formato YYYY-MM-DD, extrair diretamente
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
      const [year, month, day] = dateStr.split('T')[0].split('-');
      return `${day}/${month}/${year}`;
    }
    // Fallback: usar Date mas com timezone local explícito
    const date = new Date(dateStr + 'T12:00:00'); // Usar meio-dia para evitar problemas de timezone
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };
  
  // Formatar hora
  const formatTime = (time?: string) => {
    if (!time) return '--:--';
    return time;
  };

  // Função para formatar horário com data - sempre mostra a data quando disponível
  const formatTimeWithDate = (time?: string, date?: string, baseDate?: string) => {
    if (!time) return '--:--';
    const timeOnly = time.substring(0, 5);
    
    // Determinar qual data usar
    let dateToUse: string | undefined;
    if (date) {
      dateToUse = date;
    } else if (baseDate) {
      dateToUse = baseDate;
    } else {
      return timeOnly;
    }
    
    // SEMPRE mostrar a data quando disponível
    const [year, month, day] = dateToUse.split('-');
    if (year && month && day) {
      return `${timeOnly} (${day.padStart(2, '0')}/${month.padStart(2, '0')})`;
    }
    
    return timeOnly;
  };
  
  // Funções auxiliares para formatar dados
  const formatCNPJ = (cnpj?: string) => {
    if (!cnpj) return '-';
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length === 14) {
      return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    }
    return cnpj;
  };

  const formatCPF = (cpf?: string) => {
    if (!cpf) return '-';
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    }
    return cpf;
  };

  const formatEndereco = (endereco?: any) => {
    if (!endereco) return '-';
    const parts: string[] = [];
    if (endereco.logradouro) parts.push(endereco.logradouro);
    if (endereco.numero) parts.push(endereco.numero);
    if (endereco.complemento) parts.push(endereco.complemento);
    if (endereco.bairro) parts.push(endereco.bairro);
    if (endereco.cidade) parts.push(endereco.cidade);
    if (endereco.uf) parts.push(endereco.uf);
    if (endereco.cep) parts.push(`CEP: ${endereco.cep}`);
    return parts.length > 0 ? parts.join(', ') : '-';
  };

  const logoUrl = company?.logo_url || '';
  const empresaNome = company?.nome_fantasia || company?.razao_social || 'Empresa';
  const empresaCNPJ = formatCNPJ(company?.cnpj);
  const empresaEndereco = formatEndereco(company?.endereco);
  const funcionarioCPF = formatCPF(employee?.cpf);
  const funcionarioCargo = employee?.cargo?.nome || '-';
  const funcionarioEstado = employee?.estado || '-';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Cartão Ponto - ${employeeName}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      color: #333;
      background-color: #f9f9f9;
      font-size: 12px;
    }
    .container {
      background-color: white;
      padding: 20px;
      max-width: 1000px;
      margin: 0 auto;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }
    .header {
      border-bottom: 3px solid #000;
      padding-bottom: 12px;
      margin-bottom: 16px;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
    }
    .header-left {
      display: flex;
      align-items: flex-start;
      gap: 20px;
      flex: 1;
    }
    .logo-container {
      flex-shrink: 0;
    }
    .logo-container img {
      max-width: 80px;
      max-height: 80px;
      object-fit: contain;
    }
    .header-title {
      flex: 1;
    }
    .header h1 {
      margin: 0;
      font-size: 18px;
      font-weight: bold;
      text-align: left;
    }
    .period-info {
      text-align: right;
      font-size: 12px;
      font-weight: bold;
      margin-top: 0;
    }
    .company-info {
      margin-bottom: 12px;
      padding: 8px 10px;
      background-color: #f5f5f5;
      border: 1px solid #ddd;
    }
    .company-info table {
      width: 100%;
      border-collapse: collapse;
    }
    .company-info td {
      padding: 3px 6px;
      border: 1px solid #ddd;
      font-size: 10px;
    }
    .company-info td.label {
      font-weight: bold;
      background-color: #e9e9e9;
      width: 130px;
    }
    .employee-info {
      margin-bottom: 12px;
      padding: 8px 10px;
      background-color: #f5f5f5;
      border: 1px solid #ddd;
    }
    .employee-info table {
      width: 100%;
      border-collapse: collapse;
    }
    .employee-info td {
      padding: 3px 6px;
      border: 1px solid #ddd;
      font-size: 10px;
    }
    .employee-info td.label {
      font-weight: bold;
      background-color: #e9e9e9;
      width: 130px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 9px;
    }
    th, td {
      border: 1px solid #333;
      padding: 4px 5px;
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
      gap: 12px;
      margin: 12px 0;
    }
    .summary-box {
      border: 1px solid #333;
      padding: 8px 10px;
      background-color: #fafafa;
    }
    .summary-box h4 {
      margin: 0 0 6px 0;
      font-size: 11px;
      font-weight: bold;
      border-bottom: 1px solid #333;
      padding-bottom: 3px;
    }
    .summary-item {
      display: flex;
      justify-content: space-between;
      padding: 2px 0;
      font-size: 10px;
    }
    .summary-item.label {
      font-weight: bold;
    }
    .signature-section {
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid #333;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }
    .signature-section .signature-label {
      font-size: 10px;
      font-weight: bold;
      color: #333;
    }
    .signature-section .signature-date {
      font-size: 9px;
      color: #666;
    }
    .signature-section .signature-image {
      display: block;
      max-width: 200px;
      max-height: 56px;
      margin-top: 4px;
      object-fit: contain;
    }
    .doc-ready-banner {
      position: fixed;
      bottom: 12px;
      left: 50%;
      transform: translateX(-50%);
      padding: 8px 16px;
      background: #0f766e;
      color: #fff;
      font-size: 12px;
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      z-index: 9999;
      max-width: 90%;
      text-align: center;
    }
    @media print {
      .doc-ready-banner { display: none !important; }
      .doc-loading-overlay { display: none !important; }
    }
    .doc-loading-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(255,255,255,0.95);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9998;
      font-size: 14px;
      color: #333;
    }
    .doc-loading-overlay[aria-hidden="true"] {
      display: none;
    }
    .footer {
      margin-top: 12px;
      text-align: center;
      font-size: 9px;
      color: #666;
      border-top: 1px solid #ddd;
      padding-top: 6px;
    }
    @media print {
      html, body {
        background-color: white;
        margin: 0;
        padding: 4px;
        font-size: 9px;
        height: auto;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .container {
        box-shadow: none;
        padding: 8px;
        max-width: 100%;
        margin: 0;
      }
      .header {
        padding-bottom: 6px;
        margin-bottom: 8px;
        border-bottom-width: 2px;
      }
      .header h1 {
        font-size: 14px;
      }
      .period-info {
        font-size: 9px;
      }
      .logo-container img {
        max-width: 56px;
        max-height: 56px;
      }
      .company-info, .employee-info {
        padding: 4px 6px;
        margin-bottom: 6px;
      }
      .company-info td, .employee-info td {
        padding: 2px 4px;
        font-size: 8px;
      }
      .company-info td.label, .employee-info td.label {
        width: 120px;
      }
      table {
        font-size: 7px;
        margin-bottom: 6px;
      }
      th, td {
        padding: 2px 3px;
      }
      .summary-section {
        gap: 8px;
        margin: 8px 0;
      }
      .summary-box {
        padding: 6px;
        border-width: 1px;
      }
      .summary-box h4 {
        font-size: 9px;
        margin: 0 0 4px 0;
        padding-bottom: 2px;
      }
      .summary-item {
        padding: 2px 0;
        font-size: 8px;
      }
      .footer {
        margin-top: 6px;
        padding-top: 4px;
        font-size: 7px;
      }
      h3 {
        font-size: 9px;
        margin-bottom: 4px;
      }
      .signature-section {
        margin-top: 8px;
        padding-top: 6px;
        gap: 4px;
      }
      .signature-section .signature-label {
        font-size: 8px;
      }
      .signature-section .signature-date {
        font-size: 7px;
      }
      .signature-section .signature-image {
        max-width: 180px;
        max-height: 48px;
        margin-top: 2px;
      }
      @page {
        size: A4;
        margin: 8mm;
      }
    }
  </style>
</head>
<body>
  ${signatureDataUrl ? `
  <div id="doc-loading-overlay" class="doc-loading-overlay" aria-hidden="false" aria-label="Carregando documento">
    <span>Carregando documento e assinatura…</span>
  </div>
  ` : ''}
  <div class="container">
    <div class="header">
      <div class="header-left">
        ${logoUrl ? `<div class="logo-container"><img src="${logoUrl}" alt="Logo da Empresa" /></div>` : ''}
        <div class="header-title">
          <h1>CARTÃO PONTO</h1>
        </div>
      </div>
      <div class="period-info">
        <div>Período: 01/${String(month).padStart(2, '0')}/${year} a ${String(new Date(year, month, 0).getDate()).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}</div>
        <div style="margin-top: 5px;">Pág.: 1</div>
      </div>
    </div>
    
    <!-- Informações da Empresa -->
    ${company ? `
    <div class="company-info">
      <table>
        <tr>
          <td class="label">Empregador</td>
          <td>${company.numero_empresa || '-'}</td>
          <td class="label">Nome da Empresa</td>
          <td>${empresaNome}</td>
        </tr>
        <tr>
          <td class="label">CNPJ</td>
          <td>${empresaCNPJ}</td>
          <td class="label">Inscrição Estadual</td>
          <td>${company.inscricao_estadual || '-'}</td>
        </tr>
        <tr>
          <td class="label">Endereço</td>
          <td colspan="3">${empresaEndereco}</td>
        </tr>
      </table>
    </div>
    ` : ''}
    
    <!-- Informações do Funcionário -->
    <div class="employee-info">
      <table>
        <tr>
          <td class="label">Empregado</td>
          <td>${employeeMatricula || '-'}</td>
          <td class="label">Nome do Funcionário</td>
          <td>${employeeName}</td>
        </tr>
        <tr>
          <td class="label">CPF</td>
          <td>${funcionarioCPF}</td>
          <td class="label">Estado</td>
          <td>${funcionarioEstado}</td>
        </tr>
        <tr>
          <td class="label">Cargo</td>
          <td>${funcionarioCargo}</td>
          <td class="label">Categoria</td>
          <td>Mensalista</td>
        </tr>
      </table>
    </div>
    
    <!-- Tabela de Registros -->
    <h3 style="margin-bottom: 6px; font-size: 11px;">REGISTROS DE PONTO</h3>
    <table>
      <thead>
        <tr>
          <th style="width: 8%;">Data</th>
          <th style="width: 10%;">Natureza do Dia</th>
          <th style="width: 7%;">Entrada</th>
          <th style="width: 7%;">Início Almoço</th>
          <th style="width: 7%;">Fim Almoço</th>
          <th style="width: 7%;">Saída</th>
          <th style="width: 7%;">Início Hora Extra</th>
          <th style="width: 7%;">Fim Hora Extra</th>
          <th style="width: 7%;">Horas Trabalhadas</th>
          <th style="width: 7%;">Extras 50%</th>
          <th style="width: 7%;">Extras 100%</th>
          <th style="width: 7%;">Adicional Noturno</th>
          <th style="width: 7%;">Horas Negativas</th>
          <th style="width: 8%;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${completeRecords
          .sort((a, b) => {
            const dateA = a.data_registro.split('T')[0];
            const dateB = b.data_registro.split('T')[0];
            return dateA.localeCompare(dateB);
          })
          .map(record => {
            const dateStr = record.data_registro.split('T')[0];
            const natureValue = data.dayNatureOverrides?.[dateStr] ?? (record as any).natureza_dia ?? getDayNatureFromRecord(record);
            const natureLabel = getDayNatureLabel(natureValue);
            const isVirtual = record.id.startsWith('virtual-');
            const isRestDay = record.is_dia_folga || (isVirtual && record.id.includes('-dsr'));
            const isVacation = isVirtual && record.id.includes('-ferias');
            const isMedicalCertificate = isVirtual && record.id.includes('-atestado');
            const isCompensation = isVirtual && record.id.includes('-compensacao');
            const isFalta = isVirtual && record.id.includes('-falta');
            
            // Determinar o label a exibir (para horários) a partir do tipo de registro virtual
            let displayLabel = '';
            if (isVacation) {
              displayLabel = 'Férias';
            } else if (isMedicalCertificate) {
              displayLabel = 'Atestado';
            } else if (isCompensation) {
              displayLabel = record.observacoes || 'Compensação';
            } else if (isFalta) {
              displayLabel = 'Falta';
            } else if (isRestDay && !record.entrada) {
              displayLabel = 'DSR';
            }
            // No PDF, colunas de horário e status devem refletir a Natureza do dia (incluindo alteração do usuário)
            const isDayWithoutTimes = !!displayLabel || isDayNatureNoNegativeHours(natureValue) || natureValue === 'dsr' || natureValue === 'ferias' || natureValue === 'atestado' || natureValue === 'falta' || natureValue === 'folga_debito';
            const timeColumnLabel = isDayWithoutTimes ? natureLabel : '';
            
            // Feriado e DSR não exibem horas negativas; Folga Débito gera débito; Folga/Compensação exibem; Atestado pode ter horas negativas.
            const hasAtestadoLiquidNegativas = isMedicalCertificate && (record.horas_negativas || 0) > 0;
            const debitHours = getDebitHoursForDay(record, natureValue, debitOptions);
            const showHorasNegativasFalta = isDayNatureNoNegativeHours(natureValue)
              ? '-'
              : isFalta
                ? formatDecimalHoursToHhMm(-(record.horas_negativas || 0))
                : isDayNatureDebitHours(natureValue)
                  ? formatDecimalHoursToHhMm(-debitHours)
                  : hasAtestadoLiquidNegativas
                    ? formatDecimalHoursToHhMm(-(record.horas_negativas || 0))
                    : (displayLabel ? '-' : formatHours(record.horas_negativas || 0));
            
            return `
          <tr>
            <td>${formatDate(record.data_registro)}</td>
            <td>${natureLabel}</td>
            <td class="time">${timeColumnLabel || formatTimeWithDate(record.entrada, record.entrada_date, record.base_date || record.data_registro)}</td>
            <td class="time">${timeColumnLabel ? '-' : formatTimeWithDate(record.entrada_almoco, record.entrada_almoco_date, record.base_date || record.data_registro)}</td>
            <td class="time">${timeColumnLabel ? '-' : formatTimeWithDate(record.saida_almoco, record.saida_almoco_date, record.base_date || record.data_registro)}</td>
            <td class="time">${timeColumnLabel ? '-' : formatTimeWithDate(record.saida, record.saida_date, record.base_date || record.data_registro)}</td>
            <td class="time">${timeColumnLabel ? '-' : formatTimeWithDate(record.entrada_extra1, record.entrada_extra1_date, record.base_date || record.data_registro)}</td>
            <td class="time">${timeColumnLabel ? '-' : formatTimeWithDate(record.saida_extra1, record.saida_extra1_date, record.base_date || record.data_registro)}</td>
            <td class="number">${timeColumnLabel ? natureLabel : formatHours(record.horas_trabalhadas || 0)}</td>
            <td class="number">${timeColumnLabel ? '-' : formatHours(record.horas_extras_50 || 0)}</td>
            <td class="number">${timeColumnLabel ? '-' : formatHours(record.horas_extras_100 || 0)}</td>
            <td class="number">${timeColumnLabel ? '-' : formatHours(record.horas_noturnas || 0)}</td>
            <td class="number">${showHorasNegativasFalta}</td>
            <td>${timeColumnLabel ? natureLabel : (record.status || 'pendente')}</td>
          </tr>
        `;
          }).join('')}
        <tr style="font-weight: bold; background-color: #f0f0f0;">
          <td colspan="8"><strong>TOTAIS</strong></td>
          <td class="number"><strong>${formatHours(totalHorasTrabalhadas)}</strong></td>
          <td class="number"><strong>${formatHours(totalExtras50)}</strong></td>
          <td class="number"><strong>${formatHours(totalExtras100)}</strong></td>
          <td class="number"><strong>${formatHours(totalNoturnas)}</strong></td>
          <td class="number"><strong>${formatHours(totalHorasNegativas)}</strong></td>
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
          <span>${formatHours(totalHorasTrabalhadas)}</span>
        </div>
        <div class="summary-item">
          <span>Horas Extras 50%</span>
          <span>${formatHours(totalExtras50)}</span>
        </div>
        <div class="summary-item">
          <span>Horas Extras 100%</span>
          <span>${formatHours(totalExtras100)}</span>
        </div>
        <div class="summary-item">
          <span>Adicional Noturno</span>
          <span>${formatHours(totalNoturnas)}</span>
        </div>
        <div class="summary-item">
          <span>Horas Negativas</span>
          <span>${formatHours(totalHorasNegativas)}</span>
        </div>
      </div>
      
      <div class="summary-box">
        <h4>BANCO DE HORAS</h4>
        <div class="summary-item">
          <span>Saldo até ${monthName}/${year}</span>
          <span>${formatHours(bankHoursBalance)}</span>
        </div>
      </div>
    </div>
    
    ${signatureTimestamp ? `
    <div class="signature-section">
      <span class="signature-label">Assinatura do Funcionário gerada eletronicamente no Portal do Colaborador</span>
      <span class="signature-date">Assinado em: ${new Date(signatureTimestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
      ${signatureDataUrl ? `<img id="signature-image" class="signature-image" src="${signatureDataUrl}" alt="Assinatura do funcionário" />` : ''}
    </div>
    ` : ''}
    
    <div class="footer">
      <p>Este documento é uma representação da folha de ponto gerada pelo sistema.</p>
      <p>Data de geração: ${new Date().toLocaleString('pt-BR')}</p>
    </div>
  </div>
  <div id="doc-ready-banner" class="doc-ready-banner" role="status" aria-live="polite"></div>
  <script>
    (function() {
      var overlay = document.getElementById('doc-loading-overlay');
      function hideOverlay() {
        if (overlay) { overlay.setAttribute('aria-hidden', 'true'); }
      }
      function setReady() {
        document.body.dataset.docReady = 'true';
        var banner = document.getElementById('doc-ready-banner');
        if (banner) banner.textContent = 'Documento pronto. Use Ctrl+P (ou Cmd+P no Mac) para imprimir ou salvar como PDF.';
      }
      function done() {
        hideOverlay();
        setReady();
      }
      function waitForSignatureThenReady() {
        var img = document.getElementById('signature-image');
        if (!img) { done(); return; }
        if (img.decode) {
          img.decode().then(done).catch(done);
        } else {
          if (img.complete) done(); else { img.onload = done; img.onerror = done; }
        }
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForSignatureThenReady);
      } else {
        waitForSignatureThenReady();
      }
    })();
  </script>
</body>
</html>
  `;
}

/**
 * Gera CSV com os dados do funcionário (apenas nome, data e registros de ponto)
 */
export async function generateTimeRecordReportCSV(data: TimeRecordReportData): Promise<string> {
  const { employeeName, records, employeeId, companyId, month, year } = data;
  
  // Buscar informações sobre todos os dias do mês (incluindo dias passados - retroativo)
  let daysInfo = new Map<string, DayInfo>();
  if (employeeId && companyId) {
    try {
      daysInfo = await getMonthDaysInfo(employeeId, companyId, month, year);
    } catch (err) {
      console.warn('[generateTimeRecordReportCSV] Erro ao buscar informações dos dias:', err);
    }
  }
  
  // Completar registros com dias de folga
  const completeRecords = await completeRecordsWithRestDays(records, month, year, daysInfo, employeeId!, companyId!);
  
  const employeeDailyHours = (employeeId && companyId) ? await getEmployeeDailyHours(employeeId, companyId) : DEFAULT_DEBIT_HOURS_FOLGA_DEBITO;
  const debitOptions: DebitHoursOptions = { employeeDailyHours };
  
  // Cabeçalho (incluindo Horas Negativas; Folga e Compensação devem exibir o valor)
  const lines: string[] = [];
  lines.push('Funcionário,Data,Natureza do Dia,Entrada,Início Almoço,Fim Almoço,Saída,Horas Negativas');
  
  // Função auxiliar para formatar data sem problemas de timezone
  const formatDateForCSV = (dateStr: string): string => {
    // Se a data já está no formato YYYY-MM-DD, extrair diretamente
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
      const [year, month, day] = dateStr.split('T')[0].split('-');
      return `${day}/${month}/${year}`;
    }
    // Fallback: usar Date mas com timezone local explícito
    const date = new Date(dateStr + 'T12:00:00'); // Usar meio-dia para evitar problemas de timezone
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Registros
  completeRecords
    .sort((a, b) => {
      // Ordenar por data sem problemas de timezone
      const dateA = a.data_registro.split('T')[0];
      const dateB = b.data_registro.split('T')[0];
      return dateA.localeCompare(dateB);
    })
    .forEach(record => {
      const dateStr = record.data_registro.split('T')[0];
      const natureValue = data.dayNatureOverrides?.[dateStr] ?? (record as any).natureza_dia ?? getDayNatureFromRecord(record);
      const natureLabel = getDayNatureLabel(natureValue);
      const isVirtual = record.id.startsWith('virtual-');
      const isRestDay = record.is_dia_folga || (isVirtual && record.id.includes('-dsr'));
      const isVacation = isVirtual && record.id.includes('-ferias');
      const isMedicalCertificate = isVirtual && record.id.includes('-atestado');
      const isCompensation = isVirtual && record.id.includes('-compensacao');
      const isFalta = isVirtual && record.id.includes('-falta');
      
      // Determinar o label a exibir
      let displayLabel = '';
      if (isVacation) {
        displayLabel = 'Férias';
      } else if (isMedicalCertificate) {
        displayLabel = 'Atestado Médico';
      } else if (isCompensation) {
        displayLabel = record.observacoes || 'Compensação';
      } else if (isFalta) {
        displayLabel = 'Falta';
      } else if (isRestDay && !record.entrada) {
        displayLabel = 'DSR';
      }
      
      const date = formatDateForCSV(record.data_registro);
      const entrada = displayLabel || (record.entrada ? record.entrada.substring(0, 5) : '');
      const entradaAlmoco = displayLabel ? '' : (record.entrada_almoco ? record.entrada_almoco.substring(0, 5) : '');
      const saidaAlmoco = displayLabel ? '' : (record.saida_almoco ? record.saida_almoco.substring(0, 5) : '');
      const saida = displayLabel ? '' : (record.saida ? record.saida.substring(0, 5) : '');
      // Horas negativas: Feriado/DSR não exibem; Folga Débito gera débito; demais exibem quando houver
      const debitHours = getDebitHoursForDay(record, natureValue, debitOptions);
      const horasNegativasCell = isDayNatureNoNegativeHours(natureValue)
        ? ''
        : isDayNatureDebitHours(natureValue) || (debitHours > 0)
          ? `-${formatDecimalHoursToHhMm(debitHours)}`
          : '0h00';
      
      const escapeCsv = (s: string) => (s && s.includes(',')) ? `"${s.replace(/"/g, '""')}"` : (s || '');
      lines.push(`${escapeCsv(employeeName)},${date},${escapeCsv(natureLabel)},${entrada},${entradaAlmoco},${saidaAlmoco},${saida},${escapeCsv(horasNegativasCell)}`);
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

