import React from 'react';
import { CheckCircle2, Circle, Clock, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FollowUpComprasItem } from '@/hooks/compras/useComprasData';

interface TimelineStep {
  id: string;
  label: string;
  icon: React.ReactNode;
  status: 'completed' | 'pending' | 'in-progress' | 'error' | 'not-started';
  date?: string;
  details?: string;
}

interface FollowUpTimelineProps {
  item: FollowUpComprasItem;
}

export function FollowUpTimeline({ item }: FollowUpTimelineProps) {
  const steps: TimelineStep[] = [
    {
      id: 'requisicao',
      label: 'Requisição',
      icon: <Circle className="h-4 w-4" />,
      status: item.requisicao_id ? 'completed' : 'not-started',
      date: item.data_solicitacao,
      details: item.numero_requisicao,
    },
    {
      id: 'cotacao',
      label: 'Cotação',
      icon: <Circle className="h-4 w-4" />,
      status: item.cotacao_id
        ? item.cotacao_workflow_state === 'aprovada'
          ? 'completed'
          : item.cotacao_workflow_state === 'em_aprovacao'
            ? 'in-progress'
            : 'pending'
        : 'not-started',
      date: item.data_cotacao,
      details: item.numero_cotacao,
    },
    {
      id: 'pedido',
      label: 'Pedido',
      icon: <Circle className="h-4 w-4" />,
      status: item.pedido_id
        ? item.pedido_workflow_state === 'entregue' || item.pedido_workflow_state === 'finalizado'
          ? 'completed'
          : item.pedido_workflow_state === 'aprovado'
            ? 'in-progress'
            : 'pending'
        : 'not-started',
      date: item.data_pedido,
      details: item.numero_pedido,
    },
    {
      id: 'conta',
      label: 'Conta a Pagar',
      icon: <Circle className="h-4 w-4" />,
      status: item.conta_id
        ? item.conta_status === 'paga'
          ? 'completed'
          : item.conta_status === 'aprovada'
            ? 'in-progress'
            : 'pending'
        : 'not-started',
      date: item.data_vencimento,
      details: item.numero_nota_fiscal || 'Sem NF',
    },
    {
      id: 'estoque',
      label: 'Entrada Estoque',
      icon: <Circle className="h-4 w-4" />,
      status: item.entrada_id ? 'completed' : 'not-started',
      date: item.data_entrada,
      details: item.entrada_numero_documento,
    },
  ];

  const getStatusIcon = (status: TimelineStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'in-progress':
        return <Clock className="h-5 w-5 text-blue-600 animate-pulse" />;
      case 'pending':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: TimelineStep['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in-progress':
        return 'bg-blue-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-300';
    }
  };

  return (
    <div className="relative">
      <div className="flex items-start space-x-4">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center flex-1">
              <div className="flex items-center w-full">
                {/* Linha conectora */}
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'h-0.5 flex-1',
                      step.status === 'completed' ? 'bg-green-500' : 'bg-gray-300',
                    )}
                  />
                )}
                
                {/* Ícone do status */}
                <div className="relative z-10">
                  <div
                    className={cn(
                      'rounded-full p-1.5 border-2 border-white shadow-md',
                      step.status === 'completed' && 'bg-green-100',
                      step.status === 'in-progress' && 'bg-blue-100',
                      step.status === 'pending' && 'bg-yellow-100',
                      step.status === 'error' && 'bg-red-100',
                      step.status === 'not-started' && 'bg-gray-100',
                    )}
                  >
                    {getStatusIcon(step.status)}
                  </div>
                </div>

                {/* Linha conectora após */}
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'h-0.5 flex-1',
                      steps[index + 1].status === 'completed' && step.status === 'completed'
                        ? 'bg-green-500'
                        : 'bg-gray-300',
                    )}
                  />
                )}
              </div>

              {/* Label e detalhes */}
              <div className="mt-2 text-center min-w-[120px]">
                <div className="text-xs font-medium text-gray-700">{step.label}</div>
                {step.details && (
                  <div className="text-xs text-gray-500 mt-1 truncate max-w-[120px]">
                    {step.details}
                  </div>
                )}
                {step.date && (
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(step.date).toLocaleDateString('pt-BR')}
                  </div>
                )}
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
