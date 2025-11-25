// =====================================================
// SISTEMA DE VALIDAÇÕES PARA FÉRIAS
// =====================================================

export interface VacationPeriod {
  dataInicio: string;
  dataFim: string;
  diasFerias: number;
  diasAbono: number;
  observacoes?: string;
}

export interface FractionedVacationData {
  ano: number;
  periodos: VacationPeriod[];
  observacoes?: string;
  approvedVacations?: Array<{
    diasFerias: number;
  }>; // Férias já aprovadas para o período aquisitivo
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Regras de negócio da legislação brasileira
export const vacationRules = {
  maxPeriods: 3,                    // Máximo de períodos
  minPeriodDays: 5,                 // Mínimo de dias por período
  minOnePeriodDays: 14,            // Pelo menos um período com 14+ dias
  maxTotalDays: 30,                // Total máximo de dias
  maxAbonoDays: 10,                // Máximo de dias de abono
  minAbonoDays: 0                  // Mínimo de dias de abono
};

/**
 * Valida férias fracionadas conforme legislação brasileira
 */
export function validateFractionedVacation(data: FractionedVacationData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validar número de períodos
  if (data.periodos.length === 0) {
    errors.push('Pelo menos um período deve ser informado');
    return { isValid: false, errors, warnings };
  }

  if (data.periodos.length > vacationRules.maxPeriods) {
    errors.push(`Máximo de ${vacationRules.maxPeriods} períodos permitidos`);
  }

  // Validar cada período
  let totalDias = 0;
  let hasLongPeriod = false;

  // Calcular dias já aprovados (se houver)
  const diasAprovados = data.approvedVacations?.reduce((sum, v) => sum + (v.diasFerias || 0), 0) || 0;
  const isFirstRequest = diasAprovados === 0;

  data.periodos.forEach((periodo, index) => {
    const periodoNum = index + 1;

    // Validar datas
    if (!periodo.dataInicio || !periodo.dataFim) {
      errors.push(`Período ${periodoNum}: Datas de início e fim são obrigatórias`);
      return;
    }

    const dataInicio = new Date(periodo.dataInicio);
    const dataFim = new Date(periodo.dataFim);

    if (isNaN(dataInicio.getTime()) || isNaN(dataFim.getTime())) {
      errors.push(`Período ${periodoNum}: Datas inválidas`);
      return;
    }

    if (dataFim < dataInicio) {
      errors.push(`Período ${periodoNum}: Data de fim deve ser posterior à data de início`);
    }

    // Validar dias de férias
    if (periodo.diasFerias <= 0) {
      errors.push(`Período ${periodoNum}: Dias de férias deve ser maior que zero`);
    }

    // Validar mínimo de dias por período (exceto o primeiro)
    if (periodoNum > 1 && periodo.diasFerias < vacationRules.minPeriodDays) {
      errors.push(`Período ${periodoNum}: Mínimo de ${vacationRules.minPeriodDays} dias por período`);
    }

    // Verificar se pelo menos um período tem 14+ dias (na solicitação atual)
    if (periodo.diasFerias >= vacationRules.minOnePeriodDays) {
      hasLongPeriod = true;
    }

    // Validar dias de abono
    if (periodo.diasAbono < vacationRules.minAbonoDays || periodo.diasAbono > vacationRules.maxAbonoDays) {
      errors.push(`Período ${periodoNum}: Dias de abono deve estar entre ${vacationRules.minAbonoDays} e ${vacationRules.maxAbonoDays}`);
    }

    totalDias += periodo.diasFerias;
  });

  // Validar total de dias
  if (totalDias > vacationRules.maxTotalDays) {
    errors.push(`Total de dias (${totalDias}) excede o limite de ${vacationRules.maxTotalDays} dias`);
  }

  // Validação de 14 dias: ajustada para considerar férias já aprovadas
  if (isFirstRequest) {
    // Primeira solicitação: permitir qualquer combinação, mas:
    // 1. Se tiver apenas 1 período: pode ser qualquer valor (não precisa ter 14 dias)
    //    O funcionário pode fazer mais solicitações depois
    // 2. Se tiver 2+ períodos:
    //    - A soma dos dois primeiros não pode ultrapassar 16 dias
    //    - Pelo menos um período deve ter 14+ dias
    if (data.periodos.length === 1) {
      // Primeira solicitação com apenas 1 período: não precisa ter 14 dias
      // O funcionário pode fazer mais solicitações depois
      // Não adicionar erro aqui
    } else if (data.periodos.length >= 2) {
      // Primeira solicitação com 2+ períodos: validar regras
      const somaPrimeirosDois = data.periodos[0].diasFerias + data.periodos[1].diasFerias;
      if (somaPrimeirosDois > 16) {
        errors.push(`A soma dos dois primeiros períodos (${somaPrimeirosDois} dias) não pode ultrapassar 16 dias, para garantir que sobre pelo menos 14 dias para um terceiro período`);
      }
      
      // Se tiver 2 ou 3 períodos, pelo menos um deve ter 14+ dias
      if (!hasLongPeriod) {
        errors.push(`Pelo menos um período deve ter ${vacationRules.minOnePeriodDays} ou mais dias`);
      }
    }
  } else {
    // Já existem férias aprovadas: verificar se no total (incluindo as já aprovadas) há pelo menos um período com 14+ dias
    // Buscar o maior período entre os aprovados e os atuais
    const maiorPeriodoAprovado = data.approvedVacations?.reduce((max, v) => 
      Math.max(max, v.diasFerias || 0), 0) || 0;
    const maiorPeriodoAtual = Math.max(...data.periodos.map(p => p.diasFerias), 0);
    const maiorPeriodoTotal = Math.max(maiorPeriodoAprovado, maiorPeriodoAtual);
    
    if (maiorPeriodoTotal < vacationRules.minOnePeriodDays) {
      errors.push(`Pelo menos um período (incluindo férias já aprovadas) deve ter ${vacationRules.minOnePeriodDays} ou mais dias`);
    }
  }

  // Validar sobreposição de períodos
  const sortedPeriods = [...data.periodos].sort((a, b) => 
    new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime()
  );

  for (let i = 0; i < sortedPeriods.length - 1; i++) {
    const currentEnd = new Date(sortedPeriods[i].dataFim);
    const nextStart = new Date(sortedPeriods[i + 1].dataInicio);

    if (currentEnd >= nextStart) {
      errors.push('Períodos não podem se sobrepor');
      break;
    }
  }

  // Warnings
  if (totalDias < vacationRules.maxTotalDays) {
    warnings.push(`Você ainda tem ${vacationRules.maxTotalDays - totalDias} dias de férias disponíveis`);
  }

  if (data.periodos.length === 1 && totalDias < vacationRules.maxTotalDays) {
    warnings.push('Considere usar férias integrais para aproveitar todos os dias disponíveis');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Valida férias integrais
 */
export function validateIntegralVacation(dataInicio: string, dataFim: string, diasDisponiveis: number): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!dataInicio || !dataFim) {
    errors.push('Datas de início e fim são obrigatórias');
    return { isValid: false, errors, warnings };
  }

  const inicio = new Date(dataInicio);
  const fim = new Date(dataFim);

  if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) {
    errors.push('Datas inválidas');
    return { isValid: false, errors, warnings };
  }

  if (fim < inicio) {
    errors.push('Data de fim deve ser posterior à data de início');
  }

  const diasCalculados = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  if (diasCalculados > diasDisponiveis) {
    errors.push(`Dias solicitados (${diasCalculados}) excedem os dias disponíveis (${diasDisponiveis})`);
  }

  if (diasCalculados > vacationRules.maxTotalDays) {
    errors.push(`Máximo de ${vacationRules.maxTotalDays} dias permitidos`);
  }

  if (diasCalculados < diasDisponiveis) {
    warnings.push(`Você ainda tem ${diasDisponiveis - diasCalculados} dias de férias disponíveis`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Calcula dias entre duas datas
 */
export function calculateDaysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 0;
  }
  
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Valida se uma data é válida
 */
export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Formata data para exibição
 */
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return '';
  }
  
  return dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Valida período aquisitivo
 */
export function validateVacationPeriod(admissionDate: Date, vacationYear: number): boolean {
  const yearsWorked = vacationYear - admissionDate.getFullYear();
  return yearsWorked >= 1; // Pelo menos 1 ano de trabalho
}

/**
 * Calcula férias proporcionais
 */
export function calculateProportionalVacation(monthsWorked: number): number {
  return Math.floor(monthsWorked * 2.5); // 30 dias / 12 meses
}

/**
 * Calcula 1/3 constitucional
 */
export function calculateConstitutionalThird(vacationValue: number): number {
  return vacationValue / 3;
}

/**
 * Calcula abono pecuniário
 */
export function calculateCashAllowance(vacationDays: number, dailySalary: number): number {
  return vacationDays * dailySalary;
}
