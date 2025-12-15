import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertCircle,
  User,
  Calendar
} from 'lucide-react';
import { ApprovalService } from '@/services/approvals/approvalService';
import { useCompany } from '@/lib/company-context';
import { Skeleton } from '@/components/ui/skeleton';

interface FluxoAprovacaoProps {
  requisicaoId: string;
}

interface ApprovalFlowItem {
  level: number;
  approverId: string;
  approverName: string;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'cancelado';
  approvedAt: string | null;
  observacoes?: string;
}

interface ApprovalFlowData {
  rule: string | null;
  totalLevels: number;
  approvalFlow: ApprovalFlowItem[];
  completed: boolean;
}

/**
 * Formata data/hora no formato DD/MM/YYYY HH:mm:ss
 */
function formatDateTime(dateString: string | null): string {
  if (!dateString) return '--';
  
  try {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    return '--';
  }
}

export function FluxoAprovacao({ requisicaoId }: FluxoAprovacaoProps) {
  const { selectedCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [flowData, setFlowData] = useState<ApprovalFlowData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadApprovalFlow();
  }, [requisicaoId, selectedCompany?.id]);

  const loadApprovalFlow = async () => {
    if (!selectedCompany?.id || !requisicaoId) return;

    try {
      setLoading(true);
      setError(null);
      
      const data = await ApprovalService.getApprovalFlow(
        'requisicao_compra',
        requisicaoId,
        selectedCompany.id
      );
      
      setFlowData(data);
    } catch (err) {
      console.error('Erro ao carregar fluxo de aprovação:', err);
      setError('Erro ao carregar fluxo de aprovação');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aprovado':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'rejeitado':
      case 'cancelado':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'pendente':
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'aprovado':
        return <Badge variant="default" className="bg-green-600">Aprovado</Badge>;
      case 'rejeitado':
        return <Badge variant="destructive">Rejeitado</Badge>;
      case 'cancelado':
        return <Badge variant="destructive">Cancelado</Badge>;
      case 'pendente':
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  const getItemBgColor = (status: string) => {
    switch (status) {
      case 'aprovado':
        return 'bg-green-50 border-green-200';
      case 'rejeitado':
      case 'cancelado':
        return 'bg-red-50 border-red-200';
      case 'pendente':
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fluxo de Aprovação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fluxo de Aprovação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!flowData || flowData.approvalFlow.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fluxo de Aprovação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            Nenhuma aprovação configurada para esta requisição
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Fluxo de Aprovação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Informações gerais */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Regra de Aprovação:</span>
            <span className="text-sm font-semibold">{flowData.rule || 'Regra de Aprovação'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total de Níveis:</span>
            <span className="text-sm font-semibold">{flowData.totalLevels}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Status Geral:</span>
            {flowData.completed ? (
              <Badge variant="default" className="bg-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Alçada Concluída
              </Badge>
            ) : (
              <Badge variant="secondary">
                <Clock className="h-3 w-3 mr-1" />
                Em Andamento
              </Badge>
            )}
          </div>
        </div>

        {/* Timeline de aprovadores */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Sequência de Aprovadores</h3>
          
          {flowData.approvalFlow.map((item, index) => {
            const isLast = index === flowData.approvalFlow.length - 1;
            
            return (
              <div key={`${item.level}-${item.approverId}`} className="relative">
                {/* Linha conectora */}
                {!isLast && (
                  <div className="absolute left-5 top-10 h-full w-0.5 bg-gray-200" />
                )}
                
                {/* Card do aprovador */}
                <div className={`relative p-4 rounded-lg border-2 ${getItemBgColor(item.status)}`}>
                  <div className="flex items-start gap-4">
                    {/* Ícone de status */}
                    <div className="flex-shrink-0 mt-0.5">
                      {getStatusIcon(item.status)}
                    </div>
                    
                    {/* Conteúdo */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">{item.approverName}</span>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Nível {item.level} / {flowData.totalLevels}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(item.status)}
                        </div>
                      </div>
                      
                      {/* Data de aprovação */}
                      {item.status === 'aprovado' && item.approvedAt && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Aprovado em: <span className="font-medium">{formatDateTime(item.approvedAt)}</span>
                          </span>
                        </div>
                      )}
                      
                      {/* Observações */}
                      {item.observacoes && (
                        <div className="text-sm text-muted-foreground bg-white/50 p-2 rounded border">
                          <span className="font-medium">Observações: </span>
                          {item.observacoes}
                        </div>
                      )}
                      
                      {/* Se pendente, mostrar que está aguardando */}
                      {item.status === 'pendente' && (
                        <div className="text-sm text-muted-foreground italic">
                          Aguardando aprovação...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}







