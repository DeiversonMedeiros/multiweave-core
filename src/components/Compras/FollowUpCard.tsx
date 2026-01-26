import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Calendar, DollarSign, User, Package, FileText, ShoppingCart, CreditCard, Warehouse } from 'lucide-react';
import { FollowUpComprasItem } from '@/hooks/compras/useComprasData';
import { FollowUpTimeline } from './FollowUpTimeline';
import { cn } from '@/lib/utils';

interface FollowUpCardProps {
  item: FollowUpComprasItem;
  onViewDetails?: (item: FollowUpComprasItem) => void;
}

export function FollowUpCard({ item, onViewDetails }: FollowUpCardProps) {
  const formatCurrency = (value?: number) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date?: string) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status?: string, workflowState?: string) => {
    const state = workflowState || status;
    if (!state) return null;

    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      // Requisição
      criada: { label: 'Criada', variant: 'outline' },
      pendente_aprovacao: { label: 'Pendente Aprovação', variant: 'outline' },
      aprovada: { label: 'Aprovada', variant: 'default' },
      em_cotacao: { label: 'Em Cotação', variant: 'default' },
      finalizada: { label: 'Finalizada', variant: 'default' },
      cancelada: { label: 'Cancelada', variant: 'destructive' },
      
      // Cotação
      aberta: { label: 'Aberta', variant: 'outline' },
      completa: { label: 'Completa', variant: 'outline' },
      em_aprovacao: { label: 'Em Aprovação', variant: 'outline' },
      aprovada: { label: 'Aprovada', variant: 'default' },
      em_pedido: { label: 'Em Pedido', variant: 'default' },
      reprovada: { label: 'Reprovada', variant: 'destructive' },
      
      // Pedido
      aberto: { label: 'Aberto', variant: 'outline' },
      aprovado: { label: 'Aprovado', variant: 'default' },
      entregue: { label: 'Entregue', variant: 'default' },
      finalizado: { label: 'Finalizado', variant: 'default' },
      reprovado: { label: 'Reprovado', variant: 'destructive' },
      
      // Conta
      pendente: { label: 'Pendente', variant: 'outline' },
      paga: { label: 'Paga', variant: 'default' },
    };

    const config = statusConfig[state.toLowerCase()] || { label: state, variant: 'outline' };
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-gray-500" />
              <span className="font-semibold text-lg">{item.numero_requisicao}</span>
              {getStatusBadge(item.requisicao_status, item.requisicao_workflow_state)}
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{item.solicitante_nome || '—'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(item.data_solicitacao)}</span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                <span>{formatCurrency(item.valor_total_estimado)}</span>
              </div>
            </div>
          </div>
          {onViewDetails && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(item)}
            >
              <Eye className="h-4 w-4 mr-1" />
              Detalhes
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Timeline */}
        <div className="mb-4 pb-4 border-b">
          <FollowUpTimeline item={item} />
        </div>

        {/* Resumo das etapas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {/* Cotação */}
          <div className={cn(
            "p-2 rounded border",
            item.cotacao_id ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"
          )}>
            <div className="flex items-center gap-1 mb-1">
              <ShoppingCart className="h-3 w-3 text-gray-600" />
              <span className="font-medium text-xs">Cotação</span>
            </div>
            {item.numero_cotacao ? (
              <>
                <div className="text-xs font-semibold">{item.numero_cotacao}</div>
                {getStatusBadge(item.cotacao_status, item.cotacao_workflow_state)}
              </>
            ) : (
              <div className="text-xs text-gray-400">Não iniciada</div>
            )}
          </div>

          {/* Pedido */}
          <div className={cn(
            "p-2 rounded border",
            item.pedido_id ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
          )}>
            <div className="flex items-center gap-1 mb-1">
              <Package className="h-3 w-3 text-gray-600" />
              <span className="font-medium text-xs">Pedido</span>
            </div>
            {item.numero_pedido ? (
              <>
                <div className="text-xs font-semibold">{item.numero_pedido}</div>
                {item.fornecedor_nome && (
                  <div className="text-xs text-gray-600 truncate">{item.fornecedor_nome}</div>
                )}
              </>
            ) : (
              <div className="text-xs text-gray-400">Não criado</div>
            )}
          </div>

          {/* Conta a Pagar */}
          <div className={cn(
            "p-2 rounded border",
            item.conta_id ? "bg-purple-50 border-purple-200" : "bg-gray-50 border-gray-200"
          )}>
            <div className="flex items-center gap-1 mb-1">
              <CreditCard className="h-3 w-3 text-gray-600" />
              <span className="font-medium text-xs">Conta</span>
            </div>
            {item.conta_id ? (
              <>
                <div className="text-xs font-semibold">{formatCurrency(item.conta_valor_atual)}</div>
                {item.data_vencimento && (
                  <div className="text-xs text-gray-600">{formatDate(item.data_vencimento)}</div>
                )}
              </>
            ) : (
              <div className="text-xs text-gray-400">Não criada</div>
            )}
          </div>

          {/* Estoque */}
          <div className={cn(
            "p-2 rounded border",
            item.entrada_id ? "bg-orange-50 border-orange-200" : "bg-gray-50 border-gray-200"
          )}>
            <div className="flex items-center gap-1 mb-1">
              <Warehouse className="h-3 w-3 text-gray-600" />
              <span className="font-medium text-xs">Estoque</span>
            </div>
            {item.entrada_id ? (
              <>
                <div className="text-xs font-semibold">{item.entrada_numero_documento}</div>
                {item.data_entrada && (
                  <div className="text-xs text-gray-600">{formatDate(item.data_entrada)}</div>
                )}
              </>
            ) : (
              <div className="text-xs text-gray-400">Não registrada</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
