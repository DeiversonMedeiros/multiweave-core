// =====================================================
// UTILITÁRIOS: CÁLCULO DE VENCIMENTO
// =====================================================
// Data: 2025-01-20
// Descrição: Funções auxiliares para calcular status de vencimento de contas
// Autor: Sistema MultiWeave Core

export type TipoAlerta = 'vencida' | 'vencendo_hoje' | 'vencendo_em_3_dias' | 'vencendo_em_7_dias' | 'sem_alerta';

export interface DueDateStatus {
  dias_ate_vencimento: number;
  tipo_alerta: TipoAlerta;
  esta_vencida: boolean;
  esta_proxima_vencer: boolean;
}

/**
 * Calcula o status de vencimento de uma conta
 * @param dataVencimento Data de vencimento da conta
 * @param status Status atual da conta
 * @param dataPagamento Data de pagamento (se houver)
 * @param diasAlerta Número de dias para considerar "próximo a vencer" (padrão: 7)
 * @returns Status de vencimento calculado
 */
export function calculateDueDateStatus(
  dataVencimento: string | Date,
  status: string,
  dataPagamento?: string | Date | null,
  diasAlerta: number = 7
): DueDateStatus {
  // Se já foi pago/recebido ou cancelado, não há alerta
  if (dataPagamento || status === 'pago' || status === 'recebido' || status === 'cancelado') {
    return {
      dias_ate_vencimento: 0,
      tipo_alerta: 'sem_alerta',
      esta_vencida: false,
      esta_proxima_vencer: false,
    };
  }

  // Função auxiliar para normalizar data (apenas ano, mês, dia - sem hora/timezone)
  const normalizeDate = (date: Date): Date => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  };

  // Criar datas normalizadas
  const hoje = normalizeDate(new Date());
  
  // Se a data vier como string no formato YYYY-MM-DD, parsear como data local
  let vencimento: Date;
  if (typeof dataVencimento === 'string' && dataVencimento.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dataVencimento.split('-').map(Number);
    vencimento = new Date(year, month - 1, day);
  } else {
    vencimento = new Date(dataVencimento);
  }
  vencimento = normalizeDate(vencimento);
  
  // Calcular diferença em milissegundos
  const diffTime = vencimento.getTime() - hoje.getTime();
  
  // Calcular dias até vencimento usando Math.floor para obter diferença de dias inteiros
  // Math.floor garante que diferenças negativas pequenas não sejam arredondadas para 0
  const diasAteVencimento = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Determinar se está vencida (apenas se a diferença for estritamente negativa)
  const estaVencida = diasAteVencimento < 0;
  
  // Determinar se está próxima a vencer (dentro dos dias de alerta)
  const estaProximaVencer = diasAteVencimento >= 0 && diasAteVencimento <= diasAlerta;
  
  // Determinar tipo de alerta
  let tipoAlerta: TipoAlerta = 'sem_alerta';
  
  if (estaVencida) {
    tipoAlerta = 'vencida';
  } else if (estaProximaVencer) {
    if (diasAteVencimento === 0) {
      tipoAlerta = 'vencendo_hoje';
    } else if (diasAteVencimento <= 3) {
      tipoAlerta = 'vencendo_em_3_dias';
    } else {
      tipoAlerta = 'vencendo_em_7_dias';
    }
  }
  
  return {
    dias_ate_vencimento: diasAteVencimento,
    tipo_alerta: tipoAlerta,
    esta_vencida: estaVencida,
    esta_proxima_vencer: estaProximaVencer,
  };
}

/**
 * Obtém a cor do badge baseado no tipo de alerta
 */
export function getAlertBadgeColor(tipoAlerta: TipoAlerta): string {
  switch (tipoAlerta) {
    case 'vencida':
      return 'destructive';
    case 'vencendo_hoje':
      return 'destructive';
    case 'vencendo_em_3_dias':
      return 'default';
    case 'vencendo_em_7_dias':
      return 'secondary';
    default:
      return 'outline';
  }
}

/**
 * Obtém o texto do badge baseado no tipo de alerta
 */
export function getAlertBadgeText(tipoAlerta: TipoAlerta, diasAteVencimento?: number): string {
  switch (tipoAlerta) {
    case 'vencida':
      return diasAteVencimento ? `Vencida há ${Math.abs(diasAteVencimento)} dia(s)` : 'Vencida';
    case 'vencendo_hoje':
      return 'Vence hoje';
    case 'vencendo_em_3_dias':
      return diasAteVencimento ? `Vence em ${diasAteVencimento} dia(s)` : 'Vence em breve';
    case 'vencendo_em_7_dias':
      return diasAteVencimento ? `Vence em ${diasAteVencimento} dia(s)` : 'Vence em breve';
    default:
      return '';
  }
}

