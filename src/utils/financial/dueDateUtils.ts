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

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const vencimento = new Date(dataVencimento);
  vencimento.setHours(0, 0, 0, 0);
  
  // Calcular dias até vencimento
  const diffTime = vencimento.getTime() - hoje.getTime();
  const diasAteVencimento = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Determinar se está vencida
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

