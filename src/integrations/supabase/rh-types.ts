// =====================================================
// MÓDULO DE RECURSOS HUMANOS - TIPOS TYPESCRIPT
// =====================================================

// =====================================================
// 1. TIPOS BASE
// =====================================================

// =====================================================
// NOVOS TIPOS - FASE 1: ESTRUTURA ORGANIZACIONAL
// =====================================================

// Interface para horários de um dia específico
export interface DaySchedule {
  hora_inicio: string; // TIME format
  hora_fim: string; // TIME format
  intervalo_inicio?: string; // TIME format
  intervalo_fim?: string; // TIME format
  horas_diarias: number;
}

// Tipo para horários por dia da semana (1=Segunda, 2=Terça, etc.)
export type HorariosPorDia = Record<string, DaySchedule>;

export interface WorkShift {
  id: string;
  company_id: string;
  nome: string;
  codigo?: string;
  descricao?: string;
  hora_inicio: string; // TIME format (horário padrão)
  hora_fim: string; // TIME format (horário padrão)
  intervalo_inicio?: string; // TIME format (intervalo padrão)
  intervalo_fim?: string; // TIME format (intervalo padrão)
  horas_diarias: number; // Horas diárias padrão
  dias_semana: number[]; // 1=Segunda, 2=Terça, etc.
  tipo_turno: 'normal' | 'noturno' | 'rotativo';
  tipo_escala: 'fixa' | 'flexivel_6x1' | 'flexivel_5x2' | 'flexivel_4x3' | 'escala_12x36' | 'escala_24x48' | 'personalizada';
  dias_trabalho: number; // Quantidade de dias de trabalho no ciclo
  dias_folga: number; // Quantidade de dias de folga no ciclo
  ciclo_dias: number; // Ciclo total em dias
  regras_clt: Record<string, any>; // Regras específicas da CLT
  template_escala: boolean; // Indica se é um template reutilizável
  tolerancia_entrada: number; // minutos
  tolerancia_saida: number; // minutos
  horarios_por_dia?: HorariosPorDia; // Horários específicos por dia da semana
  status: 'ativo' | 'inativo';
  created_at: string;
  updated_at: string;
}

export interface EmploymentContract {
  id: string;
  company_id: string;
  employee_id: string;
  numero_contrato: string;
  tipo_contrato: 'CLT' | 'Menor Aprendiz' | 'PJ' | 'Estagiário' | 'Terceirizado' | 'Temporário' | 'Freelancer';
  data_inicio: string;
  data_fim?: string;
  periodo_experiencia: number; // dias
  salario_base: number;
  carga_horaria_semanal: number;
  regime_trabalho: 'tempo_integral' | 'meio_periodo' | 'reducao_jornada' | 'banco_horas';
  tipo_jornada: 'normal' | 'noturna' | 'especial';
  beneficios: Record<string, any>; // JSON
  clausulas_especiais?: string;
  status: 'ativo' | 'suspenso' | 'encerrado' | 'rescisao';
  data_rescisao?: string;
  motivo_rescisao?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  employee?: Employee;
}

export interface EmploymentContractWithEmployee extends EmploymentContract {
  employee: Employee;
}

// =====================================================
// FUNÇÕES UTILITÁRIAS
// =====================================================

export function getShiftTypes(): { value: string; label: string }[] {
  return [
    { value: 'normal', label: 'Normal' },
    { value: 'noturno', label: 'Noturno' },
    { value: 'rotativo', label: 'Rotativo' },
  ];
}

export function getScaleTypes(): { value: string; label: string; description: string; config: { dias_trabalho: number; dias_folga: number; ciclo_dias: number } }[] {
  return [
    { 
      value: 'fixa', 
      label: 'Escala Fixa', 
      description: 'Dias fixos da semana (5x2)',
      config: { dias_trabalho: 5, dias_folga: 2, ciclo_dias: 7 }
    },
    { 
      value: 'flexivel_6x1', 
      label: 'Flexível 6x1', 
      description: '6 dias trabalho, 1 folga',
      config: { dias_trabalho: 6, dias_folga: 1, ciclo_dias: 7 }
    },
    { 
      value: 'flexivel_5x2', 
      label: 'Flexível 5x2', 
      description: '5 dias trabalho, 2 folgas',
      config: { dias_trabalho: 5, dias_folga: 2, ciclo_dias: 7 }
    },
    { 
      value: 'flexivel_4x3', 
      label: 'Flexível 4x3', 
      description: '4 dias trabalho, 3 folgas',
      config: { dias_trabalho: 4, dias_folga: 3, ciclo_dias: 7 }
    },
    { 
      value: 'escala_12x36', 
      label: 'Escala 12x36', 
      description: '12h trabalho, 36h folga',
      config: { dias_trabalho: 1, dias_folga: 2, ciclo_dias: 3 }
    },
    { 
      value: 'escala_24x48', 
      label: 'Escala 24x48', 
      description: '24h trabalho, 48h folga',
      config: { dias_trabalho: 1, dias_folga: 2, ciclo_dias: 3 }
    },
    { 
      value: 'personalizada', 
      label: 'Personalizada', 
      description: 'Configuração customizada',
      config: { dias_trabalho: 0, dias_folga: 0, ciclo_dias: 0 }
    },
  ];
}

export function getWeekDays(): { value: number; label: string }[] {
  return [
    { value: 1, label: 'Segunda-feira' },
    { value: 2, label: 'Terça-feira' },
    { value: 3, label: 'Quarta-feira' },
    { value: 4, label: 'Quinta-feira' },
    { value: 5, label: 'Sexta-feira' },
    { value: 6, label: 'Sábado' },
    { value: 7, label: 'Domingo' },
  ];
}

export function getContractTypes(): { value: string; label: string }[] {
  return [
    { value: 'CLT', label: 'CLT - Consolidação das Leis do Trabalho' },
    { value: 'PJ', label: 'PJ - Pessoa Jurídica' },
    { value: 'Estagiário', label: 'Estagiário' },
    { value: 'Terceirizado', label: 'Terceirizado' },
    { value: 'Temporário', label: 'Temporário' },
    { value: 'Freelancer', label: 'Freelancer' },
  ];
}

export function getWorkRegimes(): { value: string; label: string }[] {
  return [
    { value: 'tempo_integral', label: 'Tempo Integral' },
    { value: 'meio_periodo', label: 'Meio Período' },
    { value: 'reducao_jornada', label: 'Redução de Jornada' },
    { value: 'banco_horas', label: 'Banco de Horas' },
  ];
}

export function getWorkSchedules(): { value: string; label: string }[] {
  return [
    { value: 'normal', label: 'Normal' },
    { value: 'noturna', label: 'Noturna' },
    { value: 'especial', label: 'Especial' },
  ];
}

// =====================================================
// NOVOS TIPOS - FASE 2: PARÂMETROS E CONFIGURAÇÕES
// =====================================================

export interface Rubrica {
  id: string;
  company_id: string;
  codigo: string;
  nome: string;
  descricao?: string;
  tipo: 'provento' | 'desconto' | 'base_calculo' | 'informacao';
  categoria?: string;
  natureza: 'normal' | 'eventual' | 'fixo' | 'variavel';
  calculo_automatico: boolean;
  formula_calculo?: string;
  valor_fixo?: number;
  percentual?: number;
  base_calculo: string;
  incidencia_ir: boolean;
  incidencia_inss: boolean;
  incidencia_fgts: boolean;
  incidencia_contribuicao_sindical: boolean;
  ordem_exibicao: number;
  obrigatorio: boolean;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface AllowanceType {
  id: string;
  company_id: string;
  nome: string;
  codigo?: string;
  descricao?: string;
  tipo: 'adicional' | 'bonus' | 'comissao' | 'gratificacao' | 'horas_extras' | 'adicional_noturno' | 'adicional_periculosidade' | 'adicional_insalubridade';
  calculo_automatico: boolean;
  percentual_base?: number;
  valor_fixo?: number;
  incidencia_ferias: boolean;
  incidencia_13_salario: boolean;
  incidencia_aviso_previo: boolean;
  incidencia_fgts: boolean;
  incidencia_inss: boolean;
  incidencia_ir: boolean;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface DelayReason {
  id: string;
  company_id: string;
  codigo: string;
  nome: string;
  descricao?: string;
  tipo: 'atraso' | 'falta' | 'saida_antecipada' | 'justificado' | 'injustificado';
  desconta_salario: boolean;
  desconta_horas: boolean;
  requer_justificativa: boolean;
  requer_anexo: boolean;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CidCode {
  id: string;
  company_id: string;
  codigo: string;
  descricao: string;
  categoria?: string;
  subcategoria?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface AbsenceType {
  id: string;
  company_id: string;
  codigo: string;
  nome: string;
  descricao?: string;
  tipo: 'ferias' | 'licenca_medica' | 'licenca_maternidade' | 'licenca_paternidade' | 'licenca_casamento' | 'licenca_luto' | 'afastamento_medico' | 'suspensao' | 'afastamento_sem_vencimento';
  maximo_dias?: number;
  remunerado: boolean;
  desconta_salario: boolean;
  desconta_ferias: boolean;
  desconta_13_salario: boolean;
  requer_anexo: boolean;
  requer_aprovacao: boolean;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeficiencyType {
  id: string;
  company_id: string;
  codigo: string;
  nome: string;
  descricao?: string;
  tipo: 'fisica' | 'visual' | 'auditiva' | 'intelectual' | 'mental' | 'multipla' | 'outra';
  grau?: 'leve' | 'moderada' | 'severa' | 'profunda';
  beneficios_lei_8213: boolean;
  beneficios_lei_13146: boolean;
  isento_contribuicao_sindical: boolean;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompensationRequest {
  id: string;
  company_id: string;
  employee_id: string;
  tipo: 'horas_extras' | 'banco_horas' | 'adicional_noturno' | 'adicional_periculosidade' | 'adicional_insalubridade' | 'dsr' | 'feriado' | 'outros';
  descricao: string;
  data_inicio: string;
  data_fim: string;
  quantidade_horas: number;
  valor_hora?: number;
  valor_total?: number;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'cancelado';
  motivo_rejeicao?: string;
  aprovado_por?: string;
  data_aprovacao?: string;
  observacoes?: string;
  anexos?: string[];
  created_at: string;
  updated_at: string;
  // Relacionamentos
  employee?: Employee;
  aprovador?: any; // Profile
}


export interface Report {
  id: string;
  company_id: string;
  nome: string;
  tipo: 'funcionarios' | 'folha' | 'horas' | 'ferias' | 'licencas' | 'beneficios' | 'esocial' | 'outros';
  periodo?: string;
  status: 'gerado' | 'processando' | 'erro';
  arquivo_url?: string;
  parametros?: any;
  data_geracao?: string;
  created_at: string;
  updated_at: string;
}

// =====================================================
// FUNÇÕES UTILITÁRIAS - FASE 2
// =====================================================

export function getRubricaTypes(): { value: string; label: string }[] {
  return [
    { value: 'provento', label: 'Provento' },
    { value: 'desconto', label: 'Desconto' },
    { value: 'base_calculo', label: 'Base de Cálculo' },
    { value: 'informacao', label: 'Informação' },
  ];
}

export function getRubricaNatures(): { value: string; label: string }[] {
  return [
    { value: 'normal', label: 'Normal' },
    { value: 'eventual', label: 'Eventual' },
    { value: 'fixo', label: 'Fixo' },
    { value: 'variavel', label: 'Variável' },
  ];
}

export function getAllowanceTypes(): { value: string; label: string }[] {
  return [
    { value: 'adicional', label: 'Adicional' },
    { value: 'bonus', label: 'Bônus' },
    { value: 'comissao', label: 'Comissão' },
    { value: 'gratificacao', label: 'Gratificação' },
    { value: 'horas_extras', label: 'Horas Extras' },
    { value: 'adicional_noturno', label: 'Adicional Noturno' },
    { value: 'adicional_periculosidade', label: 'Adicional de Periculosidade' },
    { value: 'adicional_insalubridade', label: 'Adicional de Insalubridade' },
  ];
}

export function getDelayReasonTypes(): { value: string; label: string }[] {
  return [
    { value: 'atraso', label: 'Atraso' },
    { value: 'falta', label: 'Falta' },
    { value: 'saida_antecipada', label: 'Saída Antecipada' },
    { value: 'justificado', label: 'Justificado' },
    { value: 'injustificado', label: 'Injustificado' },
  ];
}

export function getAbsenceTypes(): { value: string; label: string }[] {
  return [
    { value: 'ferias', label: 'Férias' },
    { value: 'licenca_medica', label: 'Licença Médica' },
    { value: 'licenca_maternidade', label: 'Licença Maternidade' },
    { value: 'licenca_paternidade', label: 'Licença Paternidade' },
    { value: 'licenca_casamento', label: 'Licença Casamento' },
    { value: 'licenca_luto', label: 'Licença Luto' },
    { value: 'afastamento_medico', label: 'Afastamento Médico' },
    { value: 'suspensao', label: 'Suspensão' },
    { value: 'afastamento_sem_vencimento', label: 'Afastamento sem Vencimento' },
  ];
}

export function getDeficiencyTypes(): { value: string; label: string }[] {
  return [
    { value: 'fisica', label: 'Física' },
    { value: 'visual', label: 'Visual' },
    { value: 'auditiva', label: 'Auditiva' },
    { value: 'intelectual', label: 'Intelectual' },
    { value: 'mental', label: 'Mental' },
    { value: 'multipla', label: 'Múltipla' },
    { value: 'outra', label: 'Outra' },
  ];
}

export function getDeficiencyDegrees(): { value: string; label: string }[] {
  return [
    { value: 'leve', label: 'Leve' },
    { value: 'moderada', label: 'Moderada' },
    { value: 'severa', label: 'Severa' },
    { value: 'profunda', label: 'Profunda' },
  ];
}

// =====================================================
// NOVOS TIPOS - FASE 3: CONFIGURAÇÕES TRIBUTÁRIAS
// =====================================================

export interface InssBracket {
  id: string;
  company_id: string;
  codigo: string;
  descricao: string;
  ano_vigencia: number;
  mes_vigencia: number;
  valor_minimo: number;
  valor_maximo?: number;
  aliquota: number; // 0.075 = 7.5%
  valor_deducao: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface IrrfBracket {
  id: string;
  company_id: string;
  codigo: string;
  descricao: string;
  ano_vigencia: number;
  mes_vigencia: number;
  valor_minimo: number;
  valor_maximo?: number;
  aliquota: number; // 0.075 = 7.5%
  valor_deducao: number;
  numero_dependentes: number;
  valor_por_dependente: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface FgtsConfig {
  id: string;
  company_id: string;
  codigo: string;
  descricao: string;
  ano_vigencia: number;
  mes_vigencia: number;
  aliquota_fgts: number; // 0.08 = 8%
  aliquota_multa: number;
  aliquota_juros: number;
  teto_salario?: number;
  valor_minimo_contribuicao: number;
  multa_rescisao: number; // 0.4 = 40%
  tipo_contrato?: string | null; // NULL = configuração geral, valor específico = configuração por tipo
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

// =====================================================
// INTERFACES - FASE 4: MOTOR DE CÁLCULO
// =====================================================

export interface Payroll {
  id: string;
  employee_id: string;
  company_id: string;
  mes_referencia: number;
  ano_referencia: number;
  salario_base: number;
  horas_trabalhadas: number;
  horas_extras: number;
  valor_horas_extras: number;
  total_vencimentos: number;
  total_descontos: number;
  salario_liquido: number;
  status: 'pendente' | 'processado' | 'pago' | 'cancelado';
  data_pagamento?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface PayrollEvent {
  id: string;
  payroll_id: string;
  employee_id: string;
  company_id: string;
  rubrica_id: string;
  codigo_rubrica: string;
  descricao_rubrica: string;
  tipo_rubrica: 'provento' | 'desconto' | 'base_calculo' | 'informacao';
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  percentual: number;
  mes_referencia: number;
  ano_referencia: number;
  calculado_automaticamente: boolean;
  origem_evento: 'sistema' | 'manual' | 'importado';
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface CalculationLog {
  id: string;
  company_id: string;
  processo_id: string;
  tipo_processo: 'folha_mensal' | 'recalculo' | 'ajuste' | 'simulacao';
  descricao_processo?: string;
  mes_referencia: number;
  ano_referencia: number;
  status: 'iniciado' | 'processando' | 'concluido' | 'erro' | 'cancelado';
  progresso: number;
  total_funcionarios: number;
  funcionarios_processados: number;
  eventos_calculados: number;
  erros_encontrados: number;
  inicio_processamento?: string;
  fim_processamento?: string;
  tempo_execucao_segundos?: number;
  usuario_id?: string;
  usuario_nome?: string;
  logs_execucao?: any;
  erros_execucao?: any;
  resumo_calculos?: any;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface PayrollConfig {
  id: string;
  company_id: string;
  codigo: string;
  descricao: string;
  ativo: boolean;
  ano_vigencia: number;
  mes_vigencia: number;
  dias_uteis_mes: number;
  horas_dia_trabalho: number;
  percentual_hora_extra: number;
  percentual_hora_noturna: number;
  percentual_dsr: number;
  aplicar_inss: boolean;
  aplicar_irrf: boolean;
  aplicar_fgts: boolean;
  aplicar_vale_transporte: boolean;
  percentual_vale_transporte: number;
  aplicar_adicional_noturno: boolean;
  percentual_adicional_noturno: number;
  aplicar_periculosidade: boolean;
  percentual_periculosidade: number;
  aplicar_insalubridade: boolean;
  grau_insalubridade: 'minimo' | 'medio' | 'maximo';
  aplicar_ferias_proporcionais: boolean;
  aplicar_terco_ferias: boolean;
  aplicar_13_salario: boolean;
  desconto_faltas: boolean;
  desconto_atrasos: boolean;
  tolerancia_atraso_minutos: number;
  arredondar_centavos: boolean;
  tipo_arredondamento: 'matematico' | 'para_cima' | 'para_baixo';
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

// =====================================================
// FUNÇÕES UTILITÁRIAS - FASE 3
// =====================================================

export function getMonths(): { value: number; label: string }[] {
  return [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' },
  ];
}

export function getYears(): { value: number; label: string }[] {
  const currentYear = new Date().getFullYear();
  const years = [];
  
  for (let i = currentYear - 5; i <= currentYear + 5; i++) {
    years.push({ value: i, label: i.toString() });
  }
  
  return years;
}

export function formatTaxRate(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`;
}

export function calculateInssValue(salary: number, brackets: InssBracket[]): {
  valor: number;
  aliquota: number;
  faixa: InssBracket | null;
} {
  // Ordenar faixas por valor mínimo
  const sortedBrackets = brackets.sort((a, b) => a.valor_minimo - b.valor_minimo);
  
  for (const bracket of sortedBrackets) {
    if (salary >= bracket.valor_minimo && (bracket.valor_maximo === null || salary <= bracket.valor_maximo)) {
      return {
        valor: salary * bracket.aliquota - bracket.valor_deducao,
        aliquota: bracket.aliquota,
        faixa: bracket,
      };
    }
  }
  
  return {
    valor: 0,
    aliquota: 0,
    faixa: null,
  };
}

export function calculateIrrfValue(
  salary: number, 
  inssValue: number, 
  dependentCount: number,
  brackets: IrrfBracket[]
): {
  valor: number;
  aliquota: number;
  faixa: IrrfBracket | null;
  base_calculo: number;
} {
  const baseCalculo = salary - inssValue - (dependentCount * 189.59); // Dedução por dependente 2024
  
  // Ordenar faixas por valor mínimo
  const sortedBrackets = brackets.sort((a, b) => a.valor_minimo - b.valor_minimo);
  
  for (const bracket of sortedBrackets) {
    if (baseCalculo >= bracket.valor_minimo && (bracket.valor_maximo === null || baseCalculo <= bracket.valor_maximo)) {
      return {
        valor: baseCalculo * bracket.aliquota - bracket.valor_deducao,
        aliquota: bracket.aliquota,
        faixa: bracket,
        base_calculo: baseCalculo,
      };
    }
  }
  
  return {
    valor: 0,
    aliquota: 0,
    faixa: null,
    base_calculo: baseCalculo,
  };
}

export function calculateFgtsValue(
  salary: number, 
  config: FgtsConfig | null, 
  tipoContrato?: string | null
): {
  valor: number;
  aliquota: number;
  base_calculo: number;
} {
  let baseCalculo = salary;
  
  // Determinar alíquota: se for Menor Aprendiz e não houver config específica, usar 2%
  let aliquotaFgts = 0.08; // Padrão 8%
  
  if (config) {
    aliquotaFgts = config.aliquota_fgts;
    
    // Aplicar teto se existir
    if (config.teto_salario && salary > config.teto_salario) {
      baseCalculo = config.teto_salario;
    }
    
    // Aplicar valor mínimo de contribuição
    if (baseCalculo < config.valor_minimo_contribuicao) {
      baseCalculo = config.valor_minimo_contribuicao;
    }
  } else if (tipoContrato === 'Menor Aprendiz') {
    // Se não há configuração e é Menor Aprendiz, usar alíquota padrão de 2%
    aliquotaFgts = 0.02;
  }
  
  return {
    valor: baseCalculo * aliquotaFgts,
    aliquota: aliquotaFgts,
    base_calculo: baseCalculo,
  };
}

export function getInssBracketBySalary(salary: number, brackets: InssBracket[]): InssBracket | null {
  const sortedBrackets = brackets.sort((a, b) => a.valor_minimo - b.valor_minimo);
  
  for (const bracket of sortedBrackets) {
    if (salary >= bracket.valor_minimo && (bracket.valor_maximo === null || salary <= bracket.valor_maximo)) {
      return bracket;
    }
  }
  
  return null;
}

export function getIrrfBracketBySalary(salary: number, brackets: IrrfBracket[]): IrrfBracket | null {
  const sortedBrackets = brackets.sort((a, b) => a.valor_minimo - b.valor_minimo);
  
  for (const bracket of sortedBrackets) {
    if (salary >= bracket.valor_minimo && (bracket.valor_maximo === null || salary <= bracket.valor_maximo)) {
      return bracket;
    }
  }
  
  return null;
}

export interface Employee {
  id: string;
  company_id: string;
  nome: string;
  matricula?: string;
  cpf: string;
  rg?: string;
  rg_orgao_emissor?: string;
  rg_uf_emissao?: string;
  rg_data_emissao?: string;
  data_nascimento?: string;
  data_admissao: string;
  data_demissao?: string;
  cargo_id?: string;
  departamento_id?: string;
  salario_base?: number;
  status: 'ativo' | 'inativo' | 'afastado' | 'demitido' | 'aposentado' | 'licenca';
  telefone?: string;
  email?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  estado_civil?: string;
  nacionalidade?: string;
  naturalidade?: string;
  nome_mae?: string;
  nome_pai?: string;
  sexo?: 'masculino' | 'feminino' | 'outro' | 'nao_informar';
  orientacao_sexual?: 'heterossexual' | 'homossexual' | 'bissexual' | 'pansexual' | 'assexual' | 'outro' | 'nao_informar' | 'prefiro_nao_dizer';
  work_shift_id?: string;
  cost_center_id?: string;
  gestor_imediato_id?: string;
  user_id?: string;
  requer_registro_ponto?: boolean; // Artigo 62 da CLT - indica se precisa registrar ponto
  tipo_contrato_trabalho?: 'CLT' | 'PJ' | 'Estagiario' | 'Menor_Aprendiz' | 'Terceirizado' | 'Autonomo' | 'Cooperado' | 'Temporario' | 'Intermitente' | 'Outro';
  vinculo_periculosidade?: boolean;
  vinculo_insalubridade?: boolean;
  grau_insalubridade?: 'minimo' | 'medio' | 'maximo';
  // location_zones será carregado via relacionamento quando necessário
  
  // Documentos pessoais - Título de Eleitor
  titulo_eleitor?: string;
  titulo_eleitor_zona?: string;
  titulo_eleitor_secao?: string;
  
  // Documentos pessoais - CTPS
  ctps?: string;
  ctps_serie?: string;
  ctps_uf?: string;
  ctps_data_emissao?: string;
  
  // Documentos pessoais - CNH
  cnh_numero?: string;
  cnh_validade?: string;
  cnh_categoria?: 'A' | 'B' | 'C' | 'D' | 'E' | 'AB' | 'AC' | 'AD' | 'AE';
  
  // Documentos pessoais - Outros
  certidao_nascimento?: string;
  certidao_casamento?: string;
  certidao_casamento_numero?: string;
  certidao_casamento_data?: string;
  certidao_uniao_estavel_numero?: string;
  certidao_uniao_estavel_data?: string;
  pis_pasep?: string;
  certificado_reservista?: string;
  comprovante_endereco?: string;
  foto_funcionario?: string;
  escolaridade?: string;
  tipo_cnh?: 'A' | 'B' | 'C' | 'D' | 'E'; // Mantido para compatibilidade
  cartao_sus?: string;
  registros_profissionais?: Record<string, string>; // CREA, CRM, OAB, Coren, etc.
  outros_vinculos_empregaticios?: boolean;
  detalhes_outros_vinculos?: string;
  
  // Deficiência
  possui_deficiencia?: boolean;
  deficiencia_tipo_id?: string;
  deficiencia_grau?: 'leve' | 'moderada' | 'severa' | 'profunda';
  deficiencia_laudo_url?: string;
  
  // RNE (Registro Nacional de Estrangeiro)
  rne_numero?: string;
  rne_orgao?: string;
  rne_data_expedicao?: string;
  
  // Dados bancários
  banco_nome?: string;
  banco_agencia?: string;
  banco_conta?: string;
  banco_tipo_conta?: 'corrente' | 'poupanca' | 'salario';
  banco_pix?: string;
  
  created_at: string;
  updated_at: string;
  // Relacionamentos
  cargo?: Position;
  departamento?: Unit;
  work_shift?: WorkShift;
  cost_center?: CostCenter;
  gestor_imediato?: Employee;
  deficiencia_tipo?: any; // Referência a DeficiencyType
}

export interface Position {
  id: string;
  company_id: string;
  nome: string;
  descricao?: string;
  nivel_hierarquico: number;
  salario_minimo?: number;
  salario_maximo?: number;
  carga_horaria: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: string;
  company_id: string;
  nome: string;
  descricao?: string;
  codigo?: string;
  responsavel_id?: string;
  cost_center_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  responsavel?: Employee;
  cost_center?: CostCenter;
}

export interface WorkShift {
  id: string;
  company_id: string;
  nome: string;
  codigo?: string;
  descricao?: string;
  hora_inicio: string;
  hora_fim: string;
  intervalo_inicio?: string;
  intervalo_fim?: string;
  horas_diarias: number;
  dias_semana: number[];
  tipo_turno: 'normal' | 'noturno' | 'rotativo';
  tolerancia_entrada: number;
  tolerancia_saida: number;
  status: 'ativo' | 'inativo';
  created_at: string;
  updated_at: string;
}

// Tipos para operações CRUD de WorkShift
export type WorkShiftInsert = Omit<WorkShift, 'id' | 'created_at' | 'updated_at'>;

export type WorkShiftUpdate = Partial<Omit<WorkShift, 'id' | 'company_id' | 'created_at' | 'updated_at'>>;

export interface CostCenter {
  id: string;
  company_id: string;
  nome: string;
  codigo: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

// Tipos para operações CRUD
export type EmployeeInsert = Omit<Employee, 'id' | 'created_at' | 'updated_at' | 'cargo' | 'departamento' | 'work_shift' | 'cost_center' | 'manager'>;

export type EmployeeUpdate = Partial<Omit<Employee, 'id' | 'company_id' | 'created_at' | 'updated_at' | 'cargo' | 'departamento' | 'work_shift' | 'cost_center' | 'manager'>>;

export interface EmployeeFilters {
  search?: string;
  status?: string;
  cargo_id?: string;
  departamento_id?: string;
  work_shift_id?: string;
  cost_center_id?: string;
  manager_id?: string;
}

export interface TimeRecord {
  id: string;
  employee_id: string;
  company_id: string;
  data_registro: string;
  entrada?: string;
  saida?: string;
  entrada_almoco?: string;
  saida_almoco?: string;
  entrada_extra1?: string;
  saida_extra1?: string;
  horas_trabalhadas: number;
  horas_extras: number; // Mantido para compatibilidade
  horas_extras_50?: number; // Horas extras com adicional de 50% (vão para banco)
  horas_extras_100?: number; // Horas extras com adicional de 100% (pagamento direto)
  horas_para_banco?: number; // Horas que vão para o banco de horas
  horas_para_pagamento?: number; // Horas que devem ser pagas diretamente
  horas_negativas?: number; // Horas negativas quando trabalhou menos que o esperado
  horas_noturnas?: number; // Horas trabalhadas no período noturno (22h às 5h)
  horas_faltas: number;
  is_feriado?: boolean; // Indica se o dia é feriado
  is_domingo?: boolean; // Indica se o dia é domingo
  is_dia_folga?: boolean; // Indica se é dia de folga do funcionário
  /** Natureza do dia (classificação): normal, dsr, folga, feriado, ferias, atestado, compensacao, falta, outros. NULL = detecção automática. */
  natureza_dia?: string | null;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'corrigido';
  observacoes?: string;
  aprovado_por?: string;
  aprovado_em?: string;
  created_at: string;
  updated_at: string;
  // Novos campos opcionais (localização e foto)
  latitude?: number | string;
  longitude?: number | string;
  endereco?: string;
  foto_url?: string;
  localizacao_type?: 'gps' | 'manual' | 'wifi';
  outside_zone?: boolean;
  // Campos do JOIN com employees (retornados pela função RPC)
  employee_nome?: string;
  employee_matricula?: string;
  // Campos event-derived da nova RPC
  events_count?: number;
  first_event_photo_url?: string;
  entrada_latitude?: number;
  entrada_longitude?: number;
  entrada_endereco?: string;
  saida_latitude?: number;
  saida_longitude?: number;
  // Campos de data real de cada marcação (quando diferente de data_registro)
  entrada_date?: string;
  entrada_almoco_date?: string;
  saida_almoco_date?: string;
  saida_date?: string;
  entrada_extra1_date?: string;
  saida_extra1_date?: string;
  base_date?: string; // Data base do registro (geralmente igual a data_registro)
  window_hours?: number; // Janela de tempo configurada
  // Arrays agregados com todas as fotos e localizações do dia
  all_photos?: Array<{
    id?: string;
    photo_url: string;
    event_type?: string;
    event_at?: string;
    event_id?: string;
  }>;
  all_locations?: Array<{
    id?: string;
    event_type?: string;
    event_at?: string;
    latitude?: number | string | null;
    longitude?: number | string | null;
    endereco?: string | null;
    source?: string;
  }>;
  // Relacionamentos
  employee?: Employee;
  aprovador?: any; // Profile
}

export interface WorkSchedule {
  id: string;
  company_id: string;
  nome: string;
  descricao?: string;
  carga_horaria_semanal: number;
  dias_trabalho: number[];
  horario_inicio: string;
  horario_fim: string;
  intervalo_almoco: number;
  tolerancia_entrada: number;
  tolerancia_saida: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// =====================================================
// New: Event-based time record model (per punch)
// =====================================================
export type TimeRecordEventType =
  | 'entrada'
  | 'saida'
  | 'entrada_almoco'
  | 'saida_almoco'
  | 'extra_inicio'
  | 'extra_fim'
  | 'manual';

export interface TimeRecordEvent {
  id: string;
  time_record_id: string;
  employee_id: string;
  company_id: string;
  event_type: TimeRecordEventType;
  event_at: string; // ISO datetime
  latitude?: number | string | null;
  longitude?: number | string | null;
  endereco?: string | null;
  source?: 'gps' | 'wifi' | 'manual';
  accuracy_meters?: number | null;
  outside_zone?: boolean | null;
  created_at?: string;
  photos?: TimeRecordEventPhoto[];
}

export interface TimeRecordEventPhoto {
  id: string;
  event_id: string;
  photo_url: string;
  created_at?: string;
}

export interface EmployeeSchedule {
  id: string;
  employee_id: string;
  schedule_id: string;
  company_id: string;
  data_inicio: string;
  data_fim?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  employee?: Employee;
  schedule?: WorkSchedule;
}

export interface EmployeeShift {
  id: string;
  company_id: string;
  funcionario_id: string;
  turno_id: string;
  data_inicio: string;
  data_fim?: string;
  ativo: boolean;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  funcionario?: Employee;
  turno?: WorkShift;
  funcionario_nome?: string;
  turno_nome?: string;
}

/** Escala de sobreaviso: regime de espera remunerado com 1/3 da hora normal (Súmula 428 TST). Máx. 24h por escala. */
export interface SobreavisoEscala {
  id: string;
  company_id: string;
  employee_id: string;
  data_escala: string;
  hora_inicio: string;
  hora_fim: string;
  duracao_horas: number;
  valor_hora_normal: number;
  valor_pago: number;
  mes_referencia: number;
  ano_referencia: number;
  folha_processada: boolean;
  payroll_event_id?: string | null;
  incidencia_ferias: boolean;
  incidencia_13_salario: boolean;
  incidencia_fgts: boolean;
  incidencia_dsr: boolean;
  observacoes?: string | null;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  employee?: Employee;
  employee_nome?: string;
}

// =====================================================
// 2. SISTEMA DE BENEFÍCIOS
// =====================================================

export interface BenefitConfiguration {
  id: string;
  company_id: string;
  benefit_type: 'vr_va' | 'transporte' | 'equipment_rental' | 'premiacao' | 'outros';
  name: string;
  description?: string;
  calculation_type: 'fixed_value' | 'daily_value' | 'percentage' | 'work_days';
  base_value?: number;
  percentage_value?: number;
  min_value?: number;
  max_value?: number;
  daily_calculation_base: number;
  requires_approval: boolean;
  is_active: boolean;
  entra_no_calculo_folha?: boolean;
  classe_financeira_id?: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeeBenefitAssignment {
  id: string;
  employee_id: string;
  benefit_config_id: string;
  company_id: string;
  start_date: string;
  end_date?: string;
  custom_value?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  employee?: Employee;
  benefit_config?: BenefitConfiguration;
}

export interface MonthlyBenefitProcessing {
  id: string;
  employee_id: string;
  benefit_config_id: string;
  company_id: string;
  month_reference: number;
  year_reference: number;
  base_value?: number;
  work_days?: number;
  absence_days?: number;
  discount_value: number;
  final_value?: number;
  status: 'pending' | 'processed' | 'validated' | 'rejected';
  processed_at?: string;
  validated_at?: string;
  processed_by?: string;
  validated_by?: string;
  created_at: string;
  // Relacionamentos
  employee?: Employee;
  benefit_config?: BenefitConfiguration;
}

// =====================================================
// 3. FÉRIAS E LICENÇAS
// =====================================================

export interface Vacation {
  id: string;
  employee_id: string;
  company_id: string;
  tipo: 'ferias' | 'licenca_medica' | 'licenca_maternidade' | 'licenca_paternidade' | 'afastamento' | 'outros';
  data_inicio: string;
  data_fim: string;
  dias_solicitados: number;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'em_andamento' | 'concluido';
  observacoes?: string;
  anexos?: string[];
  solicitado_por?: string;
  aprovado_por?: string;
  aprovado_em?: string;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  employee?: Employee;
  solicitante?: any; // Profile
  aprovador?: any; // Profile
}

export interface MedicalCertificate {
  id: string;
  employee_id: string;
  company_id: string;
  numero_atestado?: string;
  data_emissao: string;
  data_inicio: string;
  data_fim: string;
  dias_afastamento: number;
  tipo_atestado: 'medico' | 'odontologico' | 'psicologico';
  medico_nome: string;
  crm_crmo: string;
  especialidade?: string;
  cid_codigo?: string;
  cid_descricao?: string;
  valor_beneficio: number;
  observacoes?: string;
  anexo_url?: string;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'em_andamento' | 'concluido';
  aprovado_por?: string;
  aprovado_em?: string;
  data_aprovacao?: string;
  /** Indica se o atestado é de comparecimento (ex.: consulta). Usado no banco de horas. */
  atestado_comparecimento?: boolean;
  /** Quantidade de horas em decimal para atestado de comparecimento. Usado no cálculo do banco de horas. */
  horas_comparecimento?: number;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  employee?: Employee;
  aprovador?: { nome: string; email?: string }; // User (não Profile)
  attachments?: MedicalCertificateAttachment[];
}

export interface MedicalCertificateAttachment {
  id: string;
  certificate_id: string;
  file_name: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
  uploaded_by?: string;
  created_at: string;
}

// =====================================================
// 4. FOLHA DE PAGAMENTO
// =====================================================

export interface Payroll {
  id: string;
  employee_id: string;
  company_id: string;
  mes_referencia: number;
  ano_referencia: number;
  salario_base: number;
  horas_trabalhadas: number;
  horas_extras: number;
  valor_horas_extras: number;
  total_beneficios_tradicionais?: number;
  total_beneficios_convenios_medicos?: number;
  total_descontos_convenios_medicos?: number;
  total_vencimentos: number;
  total_descontos: number;
  salario_liquido: number;
  status: 'pendente' | 'processado' | 'pago' | 'cancelado';
  data_pagamento?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  employee?: Employee;
}

// =====================================================
// 5. TIPOS PARA INSERÇÃO (SEM ID E TIMESTAMPS)
// =====================================================

export type EmployeeInsert = Omit<Employee, 'id' | 'created_at' | 'updated_at' | 'cargo' | 'departamento'>;
export type PositionInsert = Omit<Position, 'id' | 'created_at' | 'updated_at'>;
export type UnitInsert = Omit<Unit, 'id' | 'created_at' | 'updated_at' | 'responsavel'>;
export type TimeRecordInsert = Omit<TimeRecord, 'id' | 'created_at' | 'updated_at' | 'employee' | 'aprovador'>;
export type WorkScheduleInsert = Omit<WorkSchedule, 'id' | 'created_at' | 'updated_at'>;
export type EmployeeScheduleInsert = Omit<EmployeeSchedule, 'id' | 'created_at' | 'updated_at' | 'employee' | 'schedule'>;
export type BenefitConfigurationInsert = Omit<BenefitConfiguration, 'id' | 'created_at' | 'updated_at'>;
export type EmployeeBenefitAssignmentInsert = Omit<EmployeeBenefitAssignment, 'id' | 'created_at' | 'updated_at' | 'employee' | 'benefit_config'>;
export type MonthlyBenefitProcessingInsert = Omit<MonthlyBenefitProcessing, 'id' | 'created_at' | 'employee' | 'benefit_config'>;
export type VacationInsert = Omit<Vacation, 'id' | 'created_at' | 'updated_at' | 'employee' | 'solicitante' | 'aprovador'>;
export type MedicalCertificateInsert = Omit<MedicalCertificate, 'id' | 'created_at' | 'updated_at' | 'employee' | 'aprovador'>;
export type PayrollInsert = Omit<Payroll, 'id' | 'created_at' | 'updated_at' | 'employee'>;

// =====================================================
// 6. TIPOS PARA ATUALIZAÇÃO (CAMPOS OPCIONAIS)
// =====================================================

export type EmployeeUpdate = Partial<Omit<Employee, 'id' | 'company_id' | 'created_at' | 'updated_at' | 'cargo' | 'departamento'>>;
export type PositionUpdate = Partial<Omit<Position, 'id' | 'company_id' | 'created_at' | 'updated_at'>>;
export type UnitUpdate = Partial<Omit<Unit, 'id' | 'company_id' | 'created_at' | 'updated_at' | 'responsavel'>>;
export type TimeRecordUpdate = Partial<Omit<TimeRecord, 'id' | 'employee_id' | 'company_id' | 'created_at' | 'updated_at' | 'employee' | 'aprovador'>>;
export type WorkScheduleUpdate = Partial<Omit<WorkSchedule, 'id' | 'company_id' | 'created_at' | 'updated_at'>>;
export type EmployeeScheduleUpdate = Partial<Omit<EmployeeSchedule, 'id' | 'employee_id' | 'schedule_id' | 'company_id' | 'created_at' | 'updated_at' | 'employee' | 'schedule'>>;
export type BenefitConfigurationUpdate = Partial<Omit<BenefitConfiguration, 'id' | 'company_id' | 'created_at' | 'updated_at'>>;
export type EmployeeBenefitAssignmentUpdate = Partial<Omit<EmployeeBenefitAssignment, 'id' | 'employee_id' | 'benefit_config_id' | 'company_id' | 'created_at' | 'updated_at' | 'employee' | 'benefit_config'>>;
export type MonthlyBenefitProcessingUpdate = Partial<Omit<MonthlyBenefitProcessing, 'id' | 'employee_id' | 'benefit_config_id' | 'company_id' | 'created_at' | 'employee' | 'benefit_config'>>;
export type VacationUpdate = Partial<Omit<Vacation, 'id' | 'employee_id' | 'company_id' | 'created_at' | 'updated_at' | 'employee' | 'solicitante' | 'aprovador'>>;
export type MedicalCertificateUpdate = Partial<Omit<MedicalCertificate, 'id' | 'employee_id' | 'company_id' | 'created_at' | 'updated_at' | 'employee' | 'aprovador'>>;
export type PayrollUpdate = Partial<Omit<Payroll, 'id' | 'employee_id' | 'company_id' | 'created_at' | 'updated_at' | 'employee'>>;

// =====================================================
// 7. TIPOS PARA FILTROS E CONSULTAS
// =====================================================

export interface EmployeeFilters {
  search?: string;
  status?: string;
  cargo_id?: string;
  departamento_id?: string;
  data_admissao_inicio?: string;
  data_admissao_fim?: string;
}

export interface TimeRecordFilters {
  employee_id?: string;
  data_inicio?: string;
  data_fim?: string;
  status?: string;
}

export interface PayrollFilters {
  mes_referencia?: number;
  ano_referencia?: number;
  employee_id?: string;
  status?: string;
}

export interface BenefitProcessingFilters {
  month_reference?: number;
  year_reference?: number;
  employee_id?: string;
  benefit_config_id?: string;
  status?: string;
}

// =====================================================
// 8. TIPOS PARA DASHBOARD E RELATÓRIOS
// =====================================================

export interface RHDashboardStats {
  total_employees: number;
  active_employees: number;
  inactive_employees: number;
  pending_time_records: number;
  pending_vacations: number;
  pending_medical_certificates: number;
  monthly_payroll_status: {
    processed: number;
    pending: number;
    paid: number;
  };
  benefit_processing_status: {
    pending: number;
    processed: number;
    validated: number;
  };
}

export interface EmployeeStats {
  total: number;
  by_status: Record<string, number>;
  by_department: Record<string, number>;
  by_position: Record<string, number>;
  recent_hires: number;
  recent_departures: number;
}

export interface TimeRecordStats {
  total_records: number;
  pending_approval: number;
  approved: number;
  rejected: number;
  average_hours_per_day: number;
  overtime_hours: number;
}

export interface PayrollStats {
  total_employees: number;
  total_gross_salary: number;
  total_net_salary: number;
  total_discounts: number;
  total_overtime: number;
  by_status: Record<string, number>;
}

// =====================================================
// BANCO DE HORAS - SISTEMA ANTIGO (MANTIDO PARA COMPATIBILIDADE)
// =====================================================
// Nota: O sistema antigo de banco de horas foi substituído pelo sistema novo
// com tabelas bank_hours_*. Os tipos abaixo são mantidos apenas para 
// compatibilidade com migrações existentes.

// =====================================================
// FERIADOS
// =====================================================

export interface Holiday {
  id: string;
  company_id: string;
  nome: string;
  data: string;
  tipo: 'nacional' | 'estadual' | 'municipal' | 'pontos_facultativos' | 'outros';
  descricao?: string;
  ativo: boolean;
  uf?: string; // Sigla do estado (2 caracteres) - obrigatório para estaduais e municipais
  municipio?: string; // Nome do município - obrigatório para municipais
  created_at: string;
  updated_at: string;
}

export interface HolidayCreateData {
  company_id: string;
  nome: string;
  data: string;
  tipo: 'nacional' | 'estadual' | 'municipal' | 'pontos_facultativos' | 'outros';
  descricao?: string;
  ativo?: boolean;
  uf?: string; // Obrigatório para estaduais e municipais
  municipio?: string; // Obrigatório para municipais
}

export interface HolidayUpdateData extends Partial<HolidayCreateData> {
  id: string;
}

export interface HolidayFilters {
  tipo?: string;
  ativo?: boolean;
  ano?: number;
}

// =====================================================
// EXAMES PERIÓDICOS
// =====================================================

export interface PeriodicExam {
  id: string;
  company_id: string;
  employee_id: string;
  employee_name?: string;
  tipo_exame: 'admissional' | 'periodico' | 'demissional' | 'retorno_trabalho' | 'mudanca_funcao' | 'ambiental';
  data_agendamento: string;
  data_realizacao?: string;
  data_vencimento: string;
  status: 'agendado' | 'realizado' | 'vencido' | 'cancelado' | 'reagendado';
  medico_responsavel?: string;
  clinica_local?: string;
  observacoes?: string;
  resultado?: 'apto' | 'inapto' | 'apto_com_restricoes' | 'pendente';
  restricoes?: string;
  anexos?: string[];
  custo?: number;
  pago: boolean;
  data_pagamento?: string;
  created_at: string;
  updated_at: string;
}

export interface PeriodicExamCreateData {
  company_id: string;
  employee_id: string;
  tipo_exame: 'admissional' | 'periodico' | 'demissional' | 'retorno_trabalho' | 'mudanca_funcao' | 'ambiental';
  data_agendamento: string;
  data_realizacao?: string;
  data_vencimento: string;
  status?: 'agendado' | 'realizado' | 'vencido' | 'cancelado' | 'reagendado';
  medico_responsavel?: string;
  clinica_local?: string;
  observacoes?: string;
  resultado?: 'apto' | 'inapto' | 'apto_com_restricoes' | 'pendente';
  restricoes?: string;
  anexos?: string[];
  custo?: number;
  pago?: boolean;
  data_pagamento?: string;
}

export interface PeriodicExamUpdateData extends Partial<PeriodicExamCreateData> {
  id: string;
}

export interface PeriodicExamFilters {
  employee_id?: string;
  tipo_exame?: string;
  status?: string;
  resultado?: string;
  data_inicio?: string;
  data_fim?: string;
  medico_responsavel?: string;
}

// =====================================================
// AÇÕES DISCIPLINARES
// =====================================================

export interface DisciplinaryAction {
  id: string;
  company_id: string;
  employee_id: string;
  tipo_acao: 'advertencia_verbal' | 'advertencia_escrita' | 'suspensao' | 'demissao_justa_causa';
  data_ocorrencia: string;
  data_aplicacao: string;
  gravidade: 'leve' | 'moderada' | 'grave' | 'gravissima';
  motivo: string;
  descricao_ocorrencia: string;
  medidas_corretivas?: string;
  status: 'active' | 'suspended' | 'expired' | 'cancelled';
  aplicado_por?: string;
  aprovado_por?: string;
  data_aprovacao?: string;
  observacoes?: string;
  anexos?: string[];
  data_arquivamento?: string;
  motivo_arquivamento?: string;
  // Novos campos conforme documentação
  duration_days?: number;
  start_date?: string;
  end_date?: string;
  documents?: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DisciplinaryActionCreateData {
  company_id: string;
  employee_id: string;
  tipo_acao: 'advertencia_verbal' | 'advertencia_escrita' | 'suspensao' | 'demissao_justa_causa';
  data_ocorrencia: string;
  data_aplicacao: string;
  gravidade: 'leve' | 'moderada' | 'grave' | 'gravissima';
  motivo: string;
  descricao_ocorrencia: string;
  medidas_corretivas?: string;
  status?: 'active' | 'suspended' | 'expired' | 'cancelled';
  aplicado_por?: string;
  aprovado_por?: string;
  data_aprovacao?: string;
  observacoes?: string;
  anexos?: string[];
  data_arquivamento?: string;
  motivo_arquivamento?: string;
  // Novos campos conforme documentação
  duration_days?: number;
  start_date?: string;
  end_date?: string;
  documents?: Record<string, any>;
  is_active?: boolean;
}

export interface DisciplinaryActionUpdateData extends Partial<DisciplinaryActionCreateData> {
  id: string;
}

export interface DisciplinaryActionFilters {
  employee_id?: string;
  tipo_acao?: string;
  gravidade?: string;
  status?: string;
  data_inicio?: string;
  data_fim?: string;
  aplicado_por?: string;
}

// =====================================================
// eSOCIAL
// =====================================================

export interface ESocialEvent {
  id: string;
  company_id: string;
  employee_id?: string;
  tipo_evento: string;
  numero_recibo?: string;
  data_envio?: string;
  data_recebimento?: string;
  status: 'pendente' | 'enviado' | 'processado' | 'rejeitado' | 'erro';
  xml_content?: string;
  xml_response?: string;
  observacoes?: string;
  tentativas_envio: number;
  ultimo_erro?: string;
  data_proximo_envio?: string;
  created_at: string;
  updated_at: string;
}

export interface ESocialEventCreateData {
  company_id: string;
  employee_id?: string;
  tipo_evento: string;
  numero_recibo?: string;
  data_envio?: string;
  data_recebimento?: string;
  status?: 'pendente' | 'enviado' | 'processado' | 'rejeitado' | 'erro';
  xml_content?: string;
  xml_response?: string;
  observacoes?: string;
  tentativas_envio?: number;
  ultimo_erro?: string;
  data_proximo_envio?: string;
}

export interface ESocialEventUpdateData extends Partial<ESocialEventCreateData> {
  id: string;
}

export interface ESocialEventFilters {
  employee_id?: string;
  tipo_evento?: string;
  status?: string;
  data_inicio?: string;
  data_fim?: string;
}

export interface ESocialConfig {
  id: string;
  company_id: string;
  ambiente: 'homologacao' | 'producao';
  tp_amb: '1' | '2';
  cnpj_empregador: string;
  cpf_empregador?: string;
  razao_social: string;
  codigo_empregador?: string;
  codigo_esocial?: string;
  versao_lote: string;
  versao_evento: string;
  url_consulta?: string;
  url_envio?: string;
  certificado_digital?: string;
  senha_certificado?: string;
  proxy_host?: string;
  proxy_port?: number;
  proxy_user?: string;
  proxy_pass?: string;
  timeout: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ESocialConfigCreateData {
  company_id: string;
  ambiente?: 'homologacao' | 'producao';
  tp_amb?: '1' | '2';
  cnpj_empregador: string;
  cpf_empregador?: string;
  razao_social: string;
  codigo_empregador?: string;
  codigo_esocial?: string;
  versao_lote?: string;
  versao_evento?: string;
  url_consulta?: string;
  url_envio?: string;
  certificado_digital?: string;
  senha_certificado?: string;
  proxy_host?: string;
  proxy_port?: number;
  proxy_user?: string;
  proxy_pass?: string;
  timeout?: number;
  ativo?: boolean;
}

export interface ESocialConfigUpdateData extends Partial<ESocialConfigCreateData> {
  id: string;
}

export interface ESocialLog {
  id: string;
  company_id: string;
  event_id?: string;
  tipo_operacao: 'envio' | 'consulta' | 'download' | 'erro';
  status: 'sucesso' | 'erro' | 'aviso';
  mensagem?: string;
  detalhes?: Record<string, any>;
  tempo_execucao?: number;
  created_at: string;
}

export interface ESocialLogFilters {
  event_id?: string;
  tipo_operacao?: string;
  status?: string;
  data_inicio?: string;
  data_fim?: string;
}

// =====================================================
// INTEGRAÇÃO eSOCIAL
// =====================================================

export interface EsocialIntegration {
  id: string;
  company_id: string;
  tipo_evento: string;
  codigo_evento: string;
  descricao?: string;
  status: 'pendente' | 'enviado' | 'processado' | 'erro' | 'rejeitado';
  data_envio?: string;
  data_processamento?: string;
  protocolo?: string;
  funcionario_id?: string;
  observacoes?: string;
  arquivo_retorno?: string;
  created_at: string;
  updated_at: string;
}

export interface EsocialIntegrationCreateData {
  tipo_evento: string;
  codigo_evento: string;
  descricao?: string;
  status?: 'pendente' | 'enviado' | 'processado' | 'erro' | 'rejeitado';
  funcionario_id?: string;
  observacoes?: string;
  arquivo_retorno?: string;
}

export interface EsocialIntegrationUpdateData extends Partial<EsocialIntegrationCreateData> {
  id: string;
}

export interface EsocialIntegrationFilters {
  tipo_evento?: string;
  status?: string;
  funcionario_id?: string;
  data_inicio?: string;
  data_fim?: string;
}

// =====================================================
// BENEFÍCIOS
// =====================================================

export interface Benefit {
  id: string;
  company_id: string;
  nome: string;
  tipo: 'vale_alimentacao' | 'vale_refeicao' | 'vale_transporte' | 'plano_saude' | 'plano_odonto' | 'seguro_vida' | 'auxilio_creche' | 'auxilio_educacao' | 'gympass' | 'outros';
  descricao?: string;
  valor_mensal?: number;
  valor_percentual?: number;
  tipo_calculo: 'valor_fixo' | 'percentual_salario' | 'tabela_faixas';
  desconto_ir: boolean;
  desconto_inss: boolean;
  desconto_fgts: boolean;
  limite_mensal?: number;
  data_inicio_vigencia?: string;
  data_fim_vigencia?: string;
  ativo: boolean;
  obrigatorio: boolean;
  categoria: 'geral' | 'executivo' | 'operacional' | 'terceirizado';
  regras_aplicacao?: string;
  observacoes?: string;
  entra_no_calculo_folha: boolean;
  created_at: string;
  updated_at: string;
}

export interface BenefitCreateData {
  company_id: string;
  nome: string;
  tipo: 'vale_alimentacao' | 'vale_refeicao' | 'vale_transporte' | 'plano_saude' | 'plano_odonto' | 'seguro_vida' | 'auxilio_creche' | 'auxilio_educacao' | 'gympass' | 'outros';
  descricao?: string;
  valor_mensal?: number;
  valor_percentual?: number;
  tipo_calculo?: 'valor_fixo' | 'percentual_salario' | 'tabela_faixas';
  desconto_ir?: boolean;
  desconto_inss?: boolean;
  desconto_fgts?: boolean;
  limite_mensal?: number;
  data_inicio_vigencia?: string;
  data_fim_vigencia?: string;
  ativo?: boolean;
  obrigatorio?: boolean;
  categoria?: 'geral' | 'executivo' | 'operacional' | 'terceirizado';
  regras_aplicacao?: string;
  observacoes?: string;
  entra_no_calculo_folha?: boolean;
}

export interface BenefitUpdateData extends Partial<BenefitCreateData> {
  id: string;
}

export interface BenefitFilters {
  tipo?: string;
  ativo?: boolean;
  categoria?: string;
  obrigatorio?: boolean;
}

export interface EmployeeBenefit {
  id: string;
  company_id: string;
  employee_id: string;
  benefit_id: string;
  valor_beneficio?: number;
  valor_desconto: number;
  data_inicio: string;
  data_fim?: string;
  status: 'ativo' | 'suspenso' | 'cancelado' | 'finalizado';
  observacoes?: string;
  created_at: string;
  updated_at: string;
  // Campos relacionados (populados via JOIN)
  benefit?: Benefit;
  employee?: Employee;
}

export interface EmployeeBenefitCreateData {
  company_id: string;
  employee_id: string;
  benefit_id: string;
  valor_beneficio?: number;
  valor_desconto?: number;
  data_inicio: string;
  data_fim?: string;
  status?: 'ativo' | 'suspenso' | 'cancelado' | 'finalizado';
  observacoes?: string;
}

export interface EmployeeBenefitUpdateData extends Partial<EmployeeBenefitCreateData> {
  id: string;
}

export interface EmployeeBenefitFilters {
  employee_id?: string;
  benefit_id?: string;
  status?: string;
  data_inicio?: string;
  data_fim?: string;
}

export interface BenefitHistory {
  id: string;
  company_id: string;
  employee_benefit_id: string;
  mes_referencia: string;
  valor_beneficio: number;
  valor_desconto: number;
  valor_liquido: number;
  status_processamento: 'pendente' | 'processado' | 'erro';
  data_processamento?: string;
  observacoes?: string;
  created_at: string;
  // Campos relacionados (populados via JOIN)
  employee_benefit?: EmployeeBenefit;
}

export interface BenefitHistoryFilters {
  employee_benefit_id?: string;
  status_processamento?: string;
  mes_inicio?: string;
  mes_fim?: string;
}

// =====================================================
// PREMIAÇÕES E PRODUTIVIDADE
// =====================================================

export interface AwardProductivity {
  id: string;
  company_id: string;
  employee_id: string;
  tipo: 'premiacao' | 'produtividade' | 'bonus' | 'comissao' | 'meta' | 'outros';
  nome: string;
  descricao?: string;
  mes_referencia: string;
  valor: number;
  percentual?: number;
  tipo_calculo: 'valor_fixo' | 'percentual_meta' | 'tabela_faixas' | 'comissao_venda';
  meta_atingida?: number;
  meta_estabelecida?: number;
  percentual_atingimento?: number;
  criterios?: string;
  status: 'pendente' | 'aprovado' | 'pago' | 'cancelado';
  data_aprovacao?: string;
  aprovado_por?: string;
  data_pagamento?: string;
  observacoes?: string;
  anexos?: string[];
  // Campos de integração com Contas a Pagar
  accounts_payable_id?: string;
  enviado_contas_pagar_em?: string;
  // Campos de integração com Flash
  flash_payment_id?: string;
  flash_invoice_id?: string;
  flash_account_number?: string;
  enviado_flash_em?: string;
  created_at: string;
  updated_at: string;
  // Campos relacionados (populados via JOIN)
  employee?: Employee;
  aprovado_por_user?: User;
}

export interface AwardProductivityCreateData {
  company_id: string;
  employee_id: string;
  tipo: 'premiacao' | 'produtividade' | 'bonus' | 'comissao' | 'meta' | 'outros';
  nome: string;
  descricao?: string;
  mes_referencia: string;
  valor: number;
  percentual?: number;
  tipo_calculo?: 'valor_fixo' | 'percentual_meta' | 'tabela_faixas' | 'comissao_venda';
  meta_atingida?: number;
  meta_estabelecida?: number;
  percentual_atingimento?: number;
  criterios?: string;
  status?: 'pendente' | 'aprovado' | 'pago' | 'cancelado';
  data_aprovacao?: string;
  aprovado_por?: string;
  data_pagamento?: string;
  observacoes?: string;
  anexos?: string[];
}

export interface AwardProductivityUpdateData extends Partial<AwardProductivityCreateData> {
  id: string;
}

export interface AwardProductivityFilters {
  employee_id?: string;
  tipo?: string;
  status?: string;
  mes_inicio?: string;
  mes_fim?: string;
  aprovado_por?: string;
}

export interface AwardCategory {
  id: string;
  company_id: string;
  nome: string;
  descricao?: string;
  tipo: 'premiacao' | 'produtividade' | 'bonus' | 'comissao' | 'meta' | 'outros';
  ativo: boolean;
  criterios_padrao?: string;
  valor_base?: number;
  percentual_base?: number;
  created_at: string;
  updated_at: string;
}

export interface AwardCategoryCreateData {
  company_id: string;
  nome: string;
  descricao?: string;
  tipo: 'premiacao' | 'produtividade' | 'bonus' | 'comissao' | 'meta' | 'outros';
  ativo?: boolean;
  criterios_padrao?: string;
  valor_base?: number;
  percentual_base?: number;
}

export interface AwardCategoryUpdateData extends Partial<AwardCategoryCreateData> {
  id: string;
}

export interface AwardCategoryFilters {
  tipo?: string;
  ativo?: boolean;
}

export interface AwardImport {
  id: string;
  company_id: string;
  mes_referencia: string;
  nome_arquivo: string;
  tipo_importacao: 'csv' | 'excel' | 'manual';
  total_registros: number;
  registros_processados: number;
  registros_com_erro: number;
  status: 'processando' | 'concluido' | 'erro' | 'cancelado';
  erro_detalhes?: string;
  importado_por?: string;
  data_inicio: string;
  data_fim?: string;
  created_at: string;
  // Campos relacionados (populados via JOIN)
  importado_por_user?: User;
}

export interface AwardImportCreateData {
  company_id: string;
  mes_referencia: string;
  nome_arquivo: string;
  tipo_importacao: 'csv' | 'excel' | 'manual';
  total_registros: number;
  registros_processados?: number;
  registros_com_erro?: number;
  status?: 'processando' | 'concluido' | 'erro' | 'cancelado';
  erro_detalhes?: string;
  importado_por?: string;
  data_fim?: string;
}

export interface AwardImportUpdateData extends Partial<AwardImportCreateData> {
  id: string;
}

export interface AwardImportError {
  id: string;
  company_id: string;
  import_id: string;
  linha_arquivo: number;
  dados_linha?: string;
  erro_descricao: string;
  erro_campo?: string;
  created_at: string;
}

export interface AwardImportErrorFilters {
  import_id?: string;
  erro_campo?: string;
}

// Interface para dados de importação CSV/Excel
export interface AwardImportData {
  employee_id: string;
  employee_name?: string; // Para validação
  tipo: string;
  nome: string;
  descricao?: string;
  valor: number;
  percentual?: number;
  tipo_calculo: string;
  meta_atingida?: number;
  meta_estabelecida?: number;
  criterios?: string;
  observacoes?: string;
}

// =====================================================
// CONVÊNIOS MÉDICOS E ODONTOLÓGICOS
// =====================================================

export interface MedicalAgreement {
  id: string;
  company_id: string;
  nome: string;
  tipo: 'medico' | 'odontologico' | 'ambos';
  cnpj?: string;
  razao_social?: string;
  telefone?: string;
  email?: string;
  site?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  contato_responsavel?: string;
  telefone_contato?: string;
  email_contato?: string;
  observacoes?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  // Campos relacionados (populados via JOIN)
  plans?: MedicalPlan[];
}

export interface MedicalAgreementCreateData {
  company_id: string;
  nome: string;
  tipo: 'medico' | 'odontologico' | 'ambos';
  cnpj?: string;
  razao_social?: string;
  telefone?: string;
  email?: string;
  site?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  contato_responsavel?: string;
  telefone_contato?: string;
  email_contato?: string;
  observacoes?: string;
  ativo?: boolean;
}

export interface MedicalAgreementUpdateData extends Partial<MedicalAgreementCreateData> {
  id: string;
}

export interface MedicalAgreementFilters {
  tipo?: string;
  ativo?: boolean;
  nome?: string;
}

export interface MedicalPlan {
  id: string;
  company_id: string;
  agreement_id: string;
  nome: string;
  descricao?: string;
  categoria: 'basico' | 'intermediario' | 'premium' | 'executivo' | 'familia' | 'individual';
  cobertura?: string;
  carencia_dias: number;
  faixa_etaria_min: number;
  faixa_etaria_max: number;
  limite_dependentes: number;
  valor_titular: number;
  valor_dependente: number;
  valor_familia?: number;
  desconto_funcionario: number;
  desconto_dependente: number;
  ativo: boolean;
  data_inicio_vigencia?: string;
  data_fim_vigencia?: string;
  observacoes?: string;
  // Coparticipação
  tem_coparticipacao?: boolean;
  percentual_coparticipacao?: number;
  valor_minimo_coparticipacao?: number;
  valor_maximo_coparticipacao?: number;
  // Folha de pagamento
  entra_no_calculo_folha?: boolean;
  tipo_folha?: 'provento' | 'desconto';
  categoria_desconto?: 'convenio_medico' | 'convenio_odontologico' | 'seguro_vida' | 'outros';
  created_at: string;
  updated_at: string;
  // Campos relacionados (populados via JOIN)
  agreement?: MedicalAgreement;
}

export interface MedicalPlanCreateData {
  company_id: string;
  agreement_id: string;
  nome: string;
  descricao?: string;
  categoria: 'basico' | 'intermediario' | 'premium' | 'executivo' | 'familia' | 'individual';
  cobertura?: string;
  carencia_dias?: number;
  faixa_etaria_min?: number;
  faixa_etaria_max?: number;
  limite_dependentes?: number;
  valor_titular: number;
  valor_dependente: number;
  valor_familia?: number;
  desconto_funcionario?: number;
  desconto_dependente?: number;
  ativo?: boolean;
  data_inicio_vigencia?: string;
  data_fim_vigencia?: string;
  observacoes?: string;
  // Coparticipação
  tem_coparticipacao?: boolean;
  percentual_coparticipacao?: number;
  valor_minimo_coparticipacao?: number;
  valor_maximo_coparticipacao?: number;
  // Folha de pagamento
  entra_no_calculo_folha?: boolean;
  tipo_folha?: 'provento' | 'desconto';
  categoria_desconto?: 'convenio_medico' | 'convenio_odontologico' | 'seguro_vida' | 'outros';
}

export interface MedicalPlanUpdateData extends Partial<MedicalPlanCreateData> {
  id: string;
}

export interface MedicalPlanFilters {
  agreement_id?: string;
  categoria?: string;
  ativo?: boolean;
  nome?: string;
}

// =====================================================
// FAIXAS ETÁRIAS DE PLANOS MÉDICOS
// =====================================================

export interface MedicalPlanAgeRange {
  id: string;
  company_id: string;
  plan_id: string;
  idade_min: number;
  idade_max: number;
  valor_titular: number;
  valor_dependente: number;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface MedicalPlanAgeRangeCreateData {
  company_id: string;
  plan_id: string;
  idade_min: number;
  idade_max: number;
  valor_titular: number;
  valor_dependente: number;
  ordem?: number;
  ativo?: boolean;
}

export interface MedicalPlanAgeRangeUpdateData extends Partial<MedicalPlanAgeRangeCreateData> {
  id: string;
}

export interface MedicalPlanAgeRangeFilters {
  plan_id?: string;
  ativo?: boolean;
}

export interface EmployeeMedicalPlan {
  id: string;
  company_id: string;
  employee_id: string;
  plan_id: string;
  data_inicio: string;
  data_fim?: string;
  status: 'ativo' | 'suspenso' | 'cancelado' | 'transferido';
  valor_mensal: number;
  desconto_aplicado: number;
  motivo_suspensao?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  // Campos relacionados (populados via JOIN)
  employee?: Employee;
  plan?: MedicalPlan;
  dependents?: EmployeePlanDependent[];
}

export interface EmployeeMedicalPlanCreateData {
  company_id: string;
  employee_id: string;
  plan_id: string;
  data_inicio: string;
  data_fim?: string;
  status?: 'ativo' | 'suspenso' | 'cancelado' | 'transferido';
  valor_mensal: number;
  desconto_aplicado?: number;
  motivo_suspensao?: string;
  observacoes?: string;
}

export interface EmployeeMedicalPlanUpdateData extends Partial<EmployeeMedicalPlanCreateData> {
  id: string;
}

export interface EmployeeMedicalPlanFilters {
  employee_id?: string;
  plan_id?: string;
  status?: string;
  data_inicio?: string;
  data_fim?: string;
}

export interface EmployeePlanDependent {
  id: string;
  company_id: string;
  employee_plan_id: string;
  nome: string;
  cpf?: string;
  data_nascimento?: string;
  parentesco: 'conjuge' | 'filho' | 'filha' | 'pai' | 'mae' | 'outros';
  status: 'ativo' | 'suspenso' | 'cancelado';
  valor_mensal: number;
  data_inclusao: string;
  data_exclusao?: string;
  motivo_exclusao?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  // Campos relacionados (populados via JOIN)
  employee_plan?: EmployeeMedicalPlan;
}

export interface EmployeePlanDependentCreateData {
  company_id: string;
  employee_plan_id: string;
  nome: string;
  cpf?: string;
  data_nascimento?: string;
  parentesco: 'conjuge' | 'filho' | 'filha' | 'pai' | 'mae' | 'outros';
  status?: 'ativo' | 'suspenso' | 'cancelado';
  valor_mensal: number;
  data_inclusao: string;
  data_exclusao?: string;
  motivo_exclusao?: string;
  observacoes?: string;
}

export interface EmployeePlanDependentUpdateData extends Partial<EmployeePlanDependentCreateData> {
  id: string;
}

export interface EmployeePlanDependentFilters {
  employee_plan_id?: string;
  parentesco?: string;
  status?: string;
  data_inclusao?: string;
  data_exclusao?: string;
}

export interface MedicalPlanPricingHistory {
  id: string;
  company_id: string;
  plan_id: string;
  data_vigencia: string;
  valor_titular_anterior?: number;
  valor_titular_novo: number;
  valor_dependente_anterior?: number;
  valor_dependente_novo: number;
  valor_familia_anterior?: number;
  valor_familia_novo?: number;
  percentual_reajuste?: number;
  motivo_reajuste?: string;
  aprovado_por?: string;
  created_at: string;
  // Campos relacionados (populados via JOIN)
  plan?: MedicalPlan;
  aprovado_por_user?: User;
}

export interface MedicalPlanPricingHistoryCreateData {
  company_id: string;
  plan_id: string;
  data_vigencia: string;
  valor_titular_anterior?: number;
  valor_titular_novo: number;
  valor_dependente_anterior?: number;
  valor_dependente_novo: number;
  valor_familia_anterior?: number;
  valor_familia_novo?: number;
  percentual_reajuste?: number;
  motivo_reajuste?: string;
  aprovado_por?: string;
}

export interface MedicalPlanPricingHistoryFilters {
  plan_id?: string;
  data_inicio?: string;
  data_fim?: string;
  aprovado_por?: string;
}

// =====================================================
// DEPENDENTES
// =====================================================

export interface Dependent {
  id: string;
  company_id: string;
  employee_id: string;
  nome: string;
  cpf?: string;
  rg?: string;
  data_nascimento?: string;
  parentesco: 'conjuge' | 'companheiro' | 'filho' | 'filha' | 'pai' | 'mae' | 'sogro' | 'sogra' | 'neto' | 'neta' | 'irmao' | 'irma' | 'tio' | 'tia' | 'sobrinho' | 'sobrinha' | 'outros';
  sexo?: 'masculino' | 'feminino' | 'outro';
  estado_civil?: string;
  nacionalidade?: string;
  naturalidade?: string;
  nome_mae?: string;
  nome_pai?: string;
  cpf_mae?: string;
  cpf_pai?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  // Campos específicos para diferentes tipos de parentesco
  data_casamento?: string;
  data_uniao_estavel?: string;
  data_separacao?: string;
  data_obito?: string;
  // Campos para filhos
  data_nascimento_mae?: string;
  escolaridade?: string;
  instituicao_ensino?: string;
  // Campos para benefícios
  possui_deficiencia: boolean;
  tipo_deficiencia?: string;
  grau_deficiencia?: string;
  necessita_cuidados_especiais: boolean;
  // Campos para documentação
  certidao_nascimento?: string;
  certidao_casamento?: string;
  certidao_uniao_estavel?: string;
  comprovante_residencia?: string;
  // Status e controle
  status: 'ativo' | 'inativo' | 'suspenso' | 'excluido';
  data_inclusao: string;
  data_exclusao?: string;
  motivo_exclusao?: string;
  observacoes?: string;
  // Campos de auditoria
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  // Relacionamentos
  employee?: Employee;
}

export interface DependentWithEmployee extends Dependent {
  funcionario_nome: string;
  funcionario_matricula?: string;
  funcionario_cpf: string;
}

export interface DependentCreateData {
  company_id: string;
  employee_id: string;
  nome: string;
  cpf?: string;
  rg?: string;
  data_nascimento?: string;
  parentesco: 'conjuge' | 'companheiro' | 'filho' | 'filha' | 'pai' | 'mae' | 'sogro' | 'sogra' | 'neto' | 'neta' | 'irmao' | 'irma' | 'tio' | 'tia' | 'sobrinho' | 'sobrinha' | 'outros';
  sexo?: 'masculino' | 'feminino' | 'outro';
  estado_civil?: string;
  nacionalidade?: string;
  naturalidade?: string;
  nome_mae?: string;
  nome_pai?: string;
  cpf_mae?: string;
  cpf_pai?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  data_casamento?: string;
  data_uniao_estavel?: string;
  data_separacao?: string;
  data_obito?: string;
  data_nascimento_mae?: string;
  escolaridade?: string;
  instituicao_ensino?: string;
  possui_deficiencia?: boolean;
  tipo_deficiencia?: string;
  grau_deficiencia?: string;
  necessita_cuidados_especiais?: boolean;
  certidao_nascimento?: string;
  certidao_casamento?: string;
  certidao_uniao_estavel?: string;
  comprovante_residencia?: string;
  status?: 'ativo' | 'inativo' | 'suspenso' | 'excluido';
  data_inclusao?: string;
  data_exclusao?: string;
  motivo_exclusao?: string;
  observacoes?: string;
}

export interface DependentUpdateData extends Partial<Omit<DependentCreateData, 'company_id' | 'employee_id'>> {
  id: string;
}

export interface DependentFilters {
  employee_id?: string;
  parentesco?: string;
  status?: string;
  sexo?: string;
  possui_deficiencia?: boolean;
  data_nascimento_inicio?: string;
  data_nascimento_fim?: string;
  search?: string;
}

// Funções utilitárias para dependentes
export function getParentescoTypes(): { value: string; label: string }[] {
  return [
    { value: 'conjuge', label: 'Cônjuge' },
    { value: 'companheiro', label: 'Companheiro(a)' },
    { value: 'filho', label: 'Filho' },
    { value: 'filha', label: 'Filha' },
    { value: 'pai', label: 'Pai' },
    { value: 'mae', label: 'Mãe' },
    { value: 'sogro', label: 'Sogro' },
    { value: 'sogra', label: 'Sogra' },
    { value: 'neto', label: 'Neto' },
    { value: 'neta', label: 'Neta' },
    { value: 'irmao', label: 'Irmão' },
    { value: 'irma', label: 'Irmã' },
    { value: 'tio', label: 'Tio' },
    { value: 'tia', label: 'Tia' },
    { value: 'sobrinho', label: 'Sobrinho' },
    { value: 'sobrinha', label: 'Sobrinha' },
    { value: 'outros', label: 'Outros' },
  ];
}

export function getSexoTypes(): { value: string; label: string }[] {
  return [
    { value: 'masculino', label: 'Masculino' },
    { value: 'feminino', label: 'Feminino' },
    { value: 'outro', label: 'Outro' },
  ];
}

export function getDeficienciaTypes(): { value: string; label: string }[] {
  return [
    { value: 'fisica', label: 'Física' },
    { value: 'visual', label: 'Visual' },
    { value: 'auditiva', label: 'Auditiva' },
    { value: 'intelectual', label: 'Intelectual' },
    { value: 'mental', label: 'Mental' },
    { value: 'multipla', label: 'Múltipla' },
    { value: 'outra', label: 'Outra' },
  ];
}

export function getDeficienciaGraus(): { value: string; label: string }[] {
  return [
    { value: 'leve', label: 'Leve' },
    { value: 'moderada', label: 'Moderada' },
    { value: 'severa', label: 'Severa' },
    { value: 'profunda', label: 'Profunda' },
  ];
}

export function getEscolaridadeTypes(): { value: string; label: string }[] {
  return [
    { value: 'fundamental_incompleto', label: 'Fundamental Incompleto' },
    { value: 'fundamental_completo', label: 'Fundamental Completo' },
    { value: 'medio_incompleto', label: 'Médio Incompleto' },
    { value: 'medio_completo', label: 'Médio Completo' },
    { value: 'superior_incompleto', label: 'Superior Incompleto' },
    { value: 'superior_completo', label: 'Superior Completo' },
    { value: 'pos_graduacao', label: 'Pós-Graduação' },
    { value: 'mestrado', label: 'Mestrado' },
    { value: 'doutorado', label: 'Doutorado' },
    { value: 'nao_informado', label: 'Não Informado' },
  ];
}

export function getEstadoCivilTypes(): { value: string; label: string }[] {
  return [
    { value: 'solteiro', label: 'Solteiro(a)' },
    { value: 'casado', label: 'Casado(a)' },
    { value: 'divorciado', label: 'Divorciado(a)' },
    { value: 'viuvo', label: 'Viúvo(a)' },
    { value: 'uniao_estavel', label: 'União Estável' },
    { value: 'separado', label: 'Separado(a)' },
  ];
}

// Função para calcular idade baseada na data de nascimento
export function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

// Função para validar se é dependente válido para IRRF
export function isValidDependentForIrrf(dependent: Dependent): boolean {
  const age = dependent.data_nascimento ? calculateAge(dependent.data_nascimento) : 0;
  
  // Regras para dependentes do IRRF
  switch (dependent.parentesco) {
    case 'conjuge':
    case 'companheiro':
      return true; // Sem limite de idade
    case 'filho':
    case 'filha':
      return age <= 21 || (age <= 24 && dependent.escolaridade); // Até 21 anos ou até 24 se estudante
    case 'pai':
    case 'mae':
      return true; // Sem limite de idade
    case 'sogro':
    case 'sogra':
      return true; // Sem limite de idade
    case 'neto':
    case 'neta':
      return age <= 21 || (age <= 24 && dependent.escolaridade); // Até 21 anos ou até 24 se estudante
    case 'irmao':
    case 'irma':
      return age <= 21 || (age <= 24 && dependent.escolaridade); // Até 21 anos ou até 24 se estudante
    case 'tio':
    case 'tia':
      return age <= 21 || (age <= 24 && dependent.escolaridade); // Até 21 anos ou até 24 se estudante
    case 'sobrinho':
    case 'sobrinha':
      return age <= 21 || (age <= 24 && dependent.escolaridade); // Até 21 anos ou até 24 se estudante
    default:
      return false;
  }
}

// Função para validar se é dependente válido para benefícios
export function isValidDependentForBenefits(dependent: Dependent): boolean {
  const age = dependent.data_nascimento ? calculateAge(dependent.data_nascimento) : 0;
  
  // Regras para dependentes de benefícios (mais restritivas)
  switch (dependent.parentesco) {
    case 'conjuge':
    case 'companheiro':
      return true; // Sem limite de idade
    case 'filho':
    case 'filha':
      return age <= 21 || (age <= 24 && dependent.escolaridade); // Até 21 anos ou até 24 se estudante
    case 'pai':
    case 'mae':
      return true; // Sem limite de idade
    case 'sogro':
    case 'sogra':
      return true; // Sem limite de idade
    case 'neto':
    case 'neta':
      return age <= 21 || (age <= 24 && dependent.escolaridade); // Até 21 anos ou até 24 se estudante
    case 'irmao':
    case 'irma':
      return age <= 21 || (age <= 24 && dependent.escolaridade); // Até 21 anos ou até 24 se estudante
    case 'tio':
    case 'tia':
      return age <= 21 || (age <= 24 && dependent.escolaridade); // Até 21 anos ou até 24 se estudante
    case 'sobrinho':
    case 'sobrinha':
      return age <= 21 || (age <= 24 && dependent.escolaridade); // Até 21 anos ou até 24 se estudante
    default:
      return false;
  }
}

// =====================================================
// SINDICATOS E GESTÃO SINDICAL
// =====================================================

export interface Union {
  id: string;
  company_id: string;
  nome: string;
  sigla?: string;
  tipo: 'patronal' | 'trabalhadores' | 'categoria' | 'profissional' | 'misto';
  categoria?: string;
  cnpj?: string;
  inscricao_municipal?: string;
  inscricao_estadual?: string;
  razao_social?: string;
  telefone?: string;
  email?: string;
  site?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  presidente?: string;
  telefone_presidente?: string;
  email_presidente?: string;
  data_fundacao?: string;
  numero_registro?: string;
  observacoes?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  // Campos relacionados (populados via JOIN)
  memberships?: EmployeeUnionMembership[];
  contributions?: UnionContribution[];
  agreements?: CollectiveAgreement[];
  negotiations?: UnionNegotiation[];
  representatives?: UnionRepresentative[];
}

export interface UnionCreateData {
  company_id: string;
  nome: string;
  sigla?: string;
  tipo: 'patronal' | 'trabalhadores' | 'categoria' | 'profissional' | 'misto';
  categoria?: string;
  cnpj?: string;
  inscricao_municipal?: string;
  inscricao_estadual?: string;
  razao_social?: string;
  telefone?: string;
  email?: string;
  site?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  presidente?: string;
  telefone_presidente?: string;
  email_presidente?: string;
  data_fundacao?: string;
  numero_registro?: string;
  observacoes?: string;
  ativo?: boolean;
}

export interface UnionUpdateData extends Partial<UnionCreateData> {
  id: string;
}

export interface UnionFilters {
  tipo?: string;
  categoria?: string;
  ativo?: boolean;
  nome?: string;
}

export interface EmployeeUnionMembership {
  id: string;
  company_id: string;
  employee_id: string;
  union_id: string;
  data_filiacao: string;
  data_desfiliacao?: string;
  status: 'ativo' | 'suspenso' | 'desfiliado' | 'transferido';
  numero_carteira?: string;
  categoria_filiacao?: string;
  valor_mensalidade?: number;
  desconto_folha: boolean;
  motivo_desfiliacao?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  // Campos relacionados (populados via JOIN)
  employee?: Employee;
  union?: Union;
}

export interface EmployeeUnionMembershipCreateData {
  company_id: string;
  employee_id: string;
  union_id: string;
  data_filiacao: string;
  data_desfiliacao?: string;
  status?: 'ativo' | 'suspenso' | 'desfiliado' | 'transferido';
  numero_carteira?: string;
  categoria_filiacao?: string;
  valor_mensalidade?: number;
  desconto_folha?: boolean;
  motivo_desfiliacao?: string;
  observacoes?: string;
}

export interface EmployeeUnionMembershipUpdateData extends Partial<EmployeeUnionMembershipCreateData> {
  id: string;
}

export interface EmployeeUnionMembershipFilters {
  employee_id?: string;
  union_id?: string;
  status?: string;
  data_filiacao?: string;
  data_desfiliacao?: string;
}

export interface UnionContribution {
  id: string;
  company_id: string;
  employee_id: string;
  union_id: string;
  tipo_contribuicao: 'mensalidade' | 'contribuicao_assistencial' | 'contribuicao_confederativa' | 'taxa_negociacao' | 'outras';
  mes_referencia: string;
  valor: number;
  desconto_folha: boolean;
  data_vencimento?: string;
  data_pagamento?: string;
  status: 'pendente' | 'pago' | 'atrasado' | 'isento' | 'cancelado';
  observacoes?: string;
  created_at: string;
  updated_at: string;
  // Campos relacionados (populados via JOIN)
  employee?: Employee;
  union?: Union;
}

export interface UnionContributionCreateData {
  company_id: string;
  employee_id: string;
  union_id: string;
  tipo_contribuicao: 'mensalidade' | 'contribuicao_assistencial' | 'contribuicao_confederativa' | 'taxa_negociacao' | 'outras';
  mes_referencia: string;
  valor: number;
  desconto_folha?: boolean;
  data_vencimento?: string;
  data_pagamento?: string;
  status?: 'pendente' | 'pago' | 'atrasado' | 'isento' | 'cancelado';
  observacoes?: string;
}

export interface UnionContributionUpdateData extends Partial<UnionContributionCreateData> {
  id: string;
}

export interface UnionContributionFilters {
  employee_id?: string;
  union_id?: string;
  tipo_contribuicao?: string;
  mes_referencia?: string;
  status?: string;
  data_vencimento?: string;
  data_pagamento?: string;
}

export interface CollectiveAgreement {
  id: string;
  company_id: string;
  union_id: string;
  tipo_documento: 'convencao_coletiva' | 'acordo_coletivo' | 'acordo_individual' | 'dissidio' | 'norma_regulamentar';
  numero_documento?: string;
  titulo: string;
  descricao?: string;
  data_assinatura: string;
  data_vigencia_inicio: string;
  data_vigencia_fim?: string;
  status: 'vigente' | 'vencido' | 'suspenso' | 'cancelado';
  valor_beneficios?: number;
  percentual_reajuste?: number;
  clausulas?: string;
  arquivo_url?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  // Campos relacionados (populados via JOIN)
  union?: Union;
}

export interface CollectiveAgreementCreateData {
  company_id: string;
  union_id: string;
  tipo_documento: 'convencao_coletiva' | 'acordo_coletivo' | 'acordo_individual' | 'dissidio' | 'norma_regulamentar';
  numero_documento?: string;
  titulo: string;
  descricao?: string;
  data_assinatura: string;
  data_vigencia_inicio: string;
  data_vigencia_fim?: string;
  status?: 'vigente' | 'vencido' | 'suspenso' | 'cancelado';
  valor_beneficios?: number;
  percentual_reajuste?: number;
  clausulas?: string;
  arquivo_url?: string;
  observacoes?: string;
}

export interface CollectiveAgreementUpdateData extends Partial<CollectiveAgreementCreateData> {
  id: string;
}

export interface CollectiveAgreementFilters {
  union_id?: string;
  tipo_documento?: string;
  status?: string;
  data_vigencia_inicio?: string;
  data_vigencia_fim?: string;
}

export interface UnionNegotiation {
  id: string;
  company_id: string;
  union_id: string;
  tipo_negociacao: 'salarial' | 'beneficios' | 'condicoes_trabalho' | 'seguranca' | 'outras';
  titulo: string;
  descricao?: string;
  data_inicio: string;
  data_fim?: string;
  status: 'agendada' | 'em_andamento' | 'concluida' | 'suspensa' | 'cancelada';
  responsavel_empresa?: string;
  responsavel_sindicato?: string;
  resultado?: string;
  valor_proposto?: number;
  valor_aceito?: number;
  percentual_proposto?: number;
  percentual_aceito?: number;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  // Campos relacionados (populados via JOIN)
  union?: Union;
}

export interface UnionNegotiationCreateData {
  company_id: string;
  union_id: string;
  tipo_negociacao: 'salarial' | 'beneficios' | 'condicoes_trabalho' | 'seguranca' | 'outras';
  titulo: string;
  descricao?: string;
  data_inicio: string;
  data_fim?: string;
  status?: 'agendada' | 'em_andamento' | 'concluida' | 'suspensa' | 'cancelada';
  responsavel_empresa?: string;
  responsavel_sindicato?: string;
  resultado?: string;
  valor_proposto?: number;
  valor_aceito?: number;
  percentual_proposto?: number;
  percentual_aceito?: number;
  observacoes?: string;
}

export interface UnionNegotiationUpdateData extends Partial<UnionNegotiationCreateData> {
  id: string;
}

export interface UnionNegotiationFilters {
  union_id?: string;
  tipo_negociacao?: string;
  status?: string;
  data_inicio?: string;
  data_fim?: string;
}

export interface UnionRepresentative {
  id: string;
  company_id: string;
  employee_id: string;
  union_id: string;
  cargo: string;
  data_inicio: string;
  data_fim?: string;
  status: 'ativo' | 'inativo' | 'suspenso';
  observacoes?: string;
  created_at: string;
  updated_at: string;
  // Campos relacionados (populados via JOIN)
  employee?: Employee;
  union?: Union;
}

export interface UnionRepresentativeCreateData {
  company_id: string;
  employee_id: string;
  union_id: string;
  cargo: string;
  data_inicio: string;
  data_fim?: string;
  status?: 'ativo' | 'inativo' | 'suspenso';
  observacoes?: string;
}

export interface UnionRepresentativeUpdateData extends Partial<UnionRepresentativeCreateData> {
  id: string;
}

export interface UnionRepresentativeFilters {
  employee_id?: string;
  union_id?: string;
  cargo?: string;
  status?: string;
  data_inicio?: string;
  data_fim?: string;
}
